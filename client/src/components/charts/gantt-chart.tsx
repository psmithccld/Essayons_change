import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Diamond } from "lucide-react";
import type { Task, Milestone } from "@shared/schema";

interface GanttChartProps {
  tasks: Task[];
  milestones?: Milestone[];
}

interface GanttTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: string;
  dependencies: string[];
}

interface GanttMilestone {
  id: string;
  name: string;
  targetDate: Date;
  status: string;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-500';
    case 'in_progress': return 'bg-blue-500';
    case 'blocked': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'border-red-500';
    case 'high': return 'border-orange-500';
    case 'medium': return 'border-yellow-500';
    default: return 'border-green-500';
  }
}

function getMilestoneColor(status: string) {
  switch (status) {
    case 'achieved': return 'text-green-500 bg-green-100';
    case 'missed': return 'text-red-500 bg-red-100';
    default: return 'text-blue-500 bg-blue-100';
  }
}

export default function GanttChart({ tasks, milestones = [] }: GanttChartProps) {
  const ganttData = useMemo(() => {
    // Filter tasks that have dates
    const validTasks = tasks.filter(task => task.startDate && task.dueDate);
    
    // Filter milestones that have dates
    const validMilestones = milestones.filter(milestone => milestone.targetDate);
    
    if (validTasks.length === 0 && validMilestones.length === 0) {
      return { ganttTasks: [], ganttMilestones: [], timelineStart: new Date(), timelineEnd: new Date(), totalDays: 0 };
    }

    // Convert to Gantt format
    const ganttTasks: GanttTask[] = validTasks.map(task => ({
      id: task.id,
      name: task.name,
      startDate: new Date(task.startDate!),
      endDate: new Date(task.dueDate!),
      progress: task.progress || 0,
      status: task.status,
      dependencies: task.dependencies || [],
    }));

    const ganttMilestones: GanttMilestone[] = validMilestones.map(milestone => ({
      id: milestone.id,
      name: milestone.name,
      targetDate: new Date(milestone.targetDate!),
      status: milestone.status,
    }));

    // Calculate timeline bounds from both tasks and milestones
    const taskDates = ganttTasks.flatMap(task => [task.startDate, task.endDate]);
    const milestoneDates = ganttMilestones.map(milestone => milestone.targetDate);
    const allDates = [...taskDates, ...milestoneDates];
    
    if (allDates.length === 0) {
      return { ganttTasks: [], ganttMilestones: [], timelineStart: new Date(), timelineEnd: new Date(), totalDays: 0 };
    }
    
    const timelineStart = new Date(Math.min(...allDates.map(d => d.getTime())));
    const timelineEnd = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Add some padding to the timeline
    timelineStart.setDate(timelineStart.getDate() - 1);
    timelineEnd.setDate(timelineEnd.getDate() + 1);
    
    const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));

    return { ganttTasks, ganttMilestones, timelineStart, timelineEnd, totalDays };
  }, [tasks, milestones]);

  const { ganttTasks, ganttMilestones, timelineStart, timelineEnd, totalDays } = ganttData;

  const getTaskPosition = (task: GanttTask) => {
    const taskStart = Math.max(0, Math.floor((task.startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)));
    const taskDuration = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const leftPercentage = (taskStart / totalDays) * 100;
    const widthPercentage = (taskDuration / totalDays) * 100;
    
    return {
      left: `${leftPercentage}%`,
      width: `${widthPercentage}%`,
    };
  };

  const getMilestonePosition = (milestone: GanttMilestone) => {
    const milestoneDay = Math.max(0, Math.floor((milestone.targetDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)));
    const leftPercentage = (milestoneDay / totalDays) * 100;
    
    return {
      left: `${leftPercentage}%`,
    };
  };

  const generateTimelineHeaders = () => {
    const headers = [];
    const current = new Date(timelineStart);
    
    while (current <= timelineEnd) {
      headers.push(new Date(current));
      current.setDate(current.getDate() + Math.max(1, Math.floor(totalDays / 12))); // Show ~12 time markers
    }
    
    return headers;
  };

  if (ganttTasks.length === 0 && ganttMilestones.length === 0) {
    return (
      <div className="text-center py-12" data-testid="gantt-empty">
        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Timeline Data</h3>
        <p className="text-sm text-muted-foreground">
          Tasks need start and due dates, and milestones need target dates to appear in the Gantt chart.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="gantt-chart">
      {/* Timeline Header */}
      <div className="relative bg-muted/30 p-4 rounded-lg overflow-x-auto">
        <div className="flex items-center justify-between text-sm font-medium text-muted-foreground mb-2">
          <span>Project Timeline</span>
          <span>{totalDays} days</span>
        </div>
        
        {/* Time markers */}
        <div className="relative h-6 mb-4">
          {generateTimelineHeaders().map((date, index) => {
            const position = ((date.getTime() - timelineStart.getTime()) / (timelineEnd.getTime() - timelineStart.getTime())) * 100;
            return (
              <div
                key={index}
                className="absolute top-0 text-xs text-muted-foreground"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-px h-2 bg-border mb-1"></div>
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
            );
          })}
        </div>

        {/* Task bars */}
        <div className="space-y-3">
          {ganttTasks.map((task) => {
            const position = getTaskPosition(task);
            const taskObj = tasks.find(t => t.id === task.id);
            
            return (
              <div key={task.id} className="relative" data-testid={`gantt-task-${task.id}`}>
                {/* Task name */}
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-medium text-foreground truncate flex-1">
                    {task.name}
                  </span>
                  <Badge className="text-xs" variant="outline">
                    {task.progress}%
                  </Badge>
                </div>
                
                {/* Task bar track */}
                <div className="relative h-6 bg-muted rounded-full">
                  {/* Task bar */}
                  <div
                    className={`absolute top-0 h-6 rounded-full ${getStatusColor(task.status)} ${getPriorityColor(taskObj?.priority || 'medium')} border-l-4 opacity-80`}
                    style={position}
                    data-testid={`gantt-bar-${task.id}`}
                  >
                    {/* Progress indicator */}
                    {task.progress > 0 && (
                      <div
                        className="h-full bg-white/30 rounded-full"
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    )}
                  </div>
                  
                  {/* Task info tooltip area */}
                  <div
                    className="absolute inset-0 cursor-pointer"
                    title={`${task.name} - ${task.startDate.toLocaleDateString()} to ${task.endDate.toLocaleDateString()}`}
                    style={position}
                  ></div>
                </div>
                
                {/* Dependencies indicator */}
                {task.dependencies.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Dependencies: {task.dependencies.length}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Milestones */}
        {ganttMilestones.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-foreground mb-3">Milestones</h4>
            <div className="relative h-8 bg-muted/20 rounded-lg">
              {ganttMilestones.map((milestone) => {
                const position = getMilestonePosition(milestone);
                
                return (
                  <div
                    key={milestone.id}
                    className="absolute flex flex-col items-center"
                    style={{ left: position.left, transform: 'translateX(-50%)' }}
                    data-testid={`gantt-milestone-${milestone.id}`}
                  >
                    {/* Diamond milestone marker */}
                    <div
                      className={`w-3 h-3 transform rotate-45 border-2 border-current ${getMilestoneColor(milestone.status)} rounded-sm`}
                      title={`${milestone.name} - ${milestone.targetDate.toLocaleDateString()}`}
                    ></div>
                    
                    {/* Milestone label */}
                    <div className="absolute top-4 whitespace-nowrap text-xs text-muted-foreground bg-background px-1 rounded border">
                      {milestone.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-medium text-foreground mb-3">Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-sm">Completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm">In Progress</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm">Blocked</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-500 rounded"></div>
              <span className="text-sm">Pending</span>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-border">
            <h5 className="text-sm font-medium text-foreground mb-2">Priority Indicators (Left Border)</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-muted border-l-4 border-red-500 rounded"></div>
                <span className="text-sm">Critical</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-muted border-l-4 border-orange-500 rounded"></div>
                <span className="text-sm">High</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-muted border-l-4 border-yellow-500 rounded"></div>
                <span className="text-sm">Medium</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-muted border-l-4 border-green-500 rounded"></div>
                <span className="text-sm">Low</span>
              </div>
            </div>
          </div>

          {ganttMilestones.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <h5 className="text-sm font-medium text-foreground mb-2">Milestones</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Diamond className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Achieved</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Diamond className="w-4 h-4 text-red-500" />
                  <span className="text-sm">Missed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Diamond className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">Pending</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
