import { useMemo, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Calendar, Diamond, Clock, ZoomIn, ZoomOut, Move } from "lucide-react";
import type { Task, Milestone, Communication } from "@shared/schema";

interface GanttChartProps {
  tasks: Task[];
  milestones?: Milestone[];
  meetings?: Communication[];
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

interface GanttMeeting {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  type: string;
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

function getMeetingColor(type: string) {
  switch (type) {
    case 'status': return 'bg-purple-500';
    case 'planning': return 'bg-indigo-500'; 
    case 'review': return 'bg-cyan-500';
    case 'decision': return 'bg-orange-500';
    case 'brainstorming': return 'bg-pink-500';
    default: return 'bg-violet-500';
  }
}

export default function GanttChart({ tasks, milestones = [], meetings = [] }: GanttChartProps) {
  const basePxPerDay = 12; // Base pixels per day for 100% zoom
  const [pxPerDay, setPxPerDay] = useState(basePxPerDay);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // Calculate zoom percentage for display
  const zoomLevel = Math.round((pxPerDay / basePxPerDay) * 100);
  
  const ganttData = useMemo(() => {
    // Filter tasks that have dates
    const validTasks = tasks.filter(task => task.startDate && task.dueDate);
    
    // Filter milestones that have dates
    const validMilestones = milestones.filter(milestone => milestone.targetDate);
    
    // Filter meetings that have scheduled dates and are meeting type
    const validMeetings = meetings.filter(meeting => 
      meeting.meetingWhen && 
      (meeting.type === 'meeting' || meeting.type === 'meeting_prompt') &&
      meeting.meetingDuration
    );
    
    if (validTasks.length === 0 && validMilestones.length === 0 && validMeetings.length === 0) {
      return { ganttTasks: [], ganttMilestones: [], ganttMeetings: [], timelineStart: new Date(), timelineEnd: new Date(), totalDays: 0 };
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

    const ganttMeetings: GanttMeeting[] = validMeetings.map(meeting => {
      const startDate = new Date(meeting.meetingWhen!);
      const endDate = new Date(startDate.getTime() + (meeting.meetingDuration! * 60 * 1000)); // Duration in minutes to milliseconds
      return {
        id: meeting.id,
        title: meeting.title,
        startDate,
        endDate,
        type: meeting.meetingType || 'meeting',
        status: meeting.status,
      };
    });

    // Calculate timeline bounds from tasks, milestones, and meetings
    const taskDates = ganttTasks.flatMap(task => [task.startDate, task.endDate]);
    const milestoneDates = ganttMilestones.map(milestone => milestone.targetDate);
    const meetingDates = ganttMeetings.flatMap(meeting => [meeting.startDate, meeting.endDate]);
    const allDates = [...taskDates, ...milestoneDates, ...meetingDates];
    
    if (allDates.length === 0) {
      return { ganttTasks: [], ganttMilestones: [], ganttMeetings: [], timelineStart: new Date(), timelineEnd: new Date(), totalDays: 0 };
    }
    
    const timelineStart = new Date(Math.min(...allDates.map(d => d.getTime())));
    const timelineEnd = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Add some padding to the timeline
    timelineStart.setDate(timelineStart.getDate() - 1);
    timelineEnd.setDate(timelineEnd.getDate() + 1);
    
    const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));

    return { ganttTasks, ganttMilestones, ganttMeetings, timelineStart, timelineEnd, totalDays };
  }, [tasks, milestones, meetings]);

  const { ganttTasks, ganttMilestones, ganttMeetings, timelineStart, timelineEnd, totalDays } = ganttData;

  const handleZoomIn = () => {
    setPxPerDay(prev => Math.min(prev + 3, 36)); // 25% increments roughly
  };

  const handleZoomOut = () => {
    setPxPerDay(prev => Math.max(prev - 3, 4)); // 25% decrements roughly  
  };

  const handleZoomSlider = (value: number[]) => {
    const newZoomPercent = value[0];
    const newPxPerDay = (newZoomPercent / 100) * basePxPerDay;
    setPxPerDay(Math.max(4, Math.min(36, newPxPerDay)));
  };

  const scrollToStart = () => {
    if (timelineRef.current) {
      timelineRef.current.scrollLeft = 0;
    }
  };

  const scrollToEnd = () => {
    if (timelineRef.current) {
      timelineRef.current.scrollLeft = timelineRef.current.scrollWidth - timelineRef.current.clientWidth;
    }
  };

  const getTaskPosition = (task: GanttTask) => {
    const taskStart = Math.max(0, Math.floor((task.startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)));
    const taskDuration = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const leftPx = taskStart * pxPerDay;
    const widthPx = Math.max(taskDuration * pxPerDay, 2); // Minimum 2px width
    
    return {
      left: `${leftPx}px`,
      width: `${widthPx}px`,
    };
  };

  const getMilestonePosition = (milestone: GanttMilestone) => {
    const milestoneDay = Math.max(0, Math.floor((milestone.targetDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)));
    const leftPx = milestoneDay * pxPerDay;
    
    return {
      left: `${leftPx}px`,
    };
  };

  const getMeetingPosition = (meeting: GanttMeeting) => {
    const meetingStart = Math.max(0, Math.floor((meeting.startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)));
    const meetingDuration = Math.ceil((meeting.endDate.getTime() - meeting.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const leftPx = meetingStart * pxPerDay;
    const widthPx = Math.max(meetingDuration * pxPerDay, 4); // Minimum 4px width for visibility
    
    return {
      left: `${leftPx}px`,
      width: `${widthPx}px`,
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

  if (ganttTasks.length === 0 && ganttMilestones.length === 0 && ganttMeetings.length === 0) {
    return (
      <div className="text-center py-12" data-testid="gantt-empty">
        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Timeline Data</h3>
        <p className="text-sm text-muted-foreground">
          Tasks need start and due dates, milestones need target dates, and meetings need scheduled times to appear in the Gantt chart.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="gantt-chart">
      {/* Timeline Header */}
      <div 
        ref={timelineRef}
        className="relative bg-muted/30 p-4 rounded-lg overflow-x-auto"
        style={{ 
          scrollbarWidth: 'thin',
          scrollbarColor: 'hsl(var(--border)) hsl(var(--background))'
        }}
      >
        <div 
          style={{
            width: `${Math.max(totalDays * pxPerDay, 100)}px`,
            minWidth: '100%'
          }}
        >
          <div className="flex items-center justify-between text-sm font-medium text-muted-foreground mb-2">
            <span>Project Timeline</span>
            <span>{totalDays} days</span>
          </div>
          
          {/* Time markers */}
          <div className="relative h-6 mb-4">
          {generateTimelineHeaders().map((date, index) => {
            const dayIndex = Math.floor((date.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
            const leftPx = dayIndex * pxPerDay;
            return (
              <div
                key={index}
                className="absolute top-0 text-xs text-muted-foreground"
                style={{ left: `${leftPx}px`, transform: 'translateX(-50%)' }}
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

        {/* Meetings */}
        {ganttMeetings.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-foreground mb-3">Meetings</h4>
            <div className="space-y-2">
              {ganttMeetings.map((meeting) => {
                const position = getMeetingPosition(meeting);
                
                return (
                  <div key={meeting.id} className="relative" data-testid={`gantt-meeting-${meeting.id}`}>
                    {/* Meeting name */}
                    <div className="flex items-center space-x-2 mb-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground truncate flex-1">
                        {meeting.title}
                      </span>
                      <Badge className="text-xs" variant="secondary">
                        {meeting.type}
                      </Badge>
                    </div>
                    
                    {/* Meeting bar track */}
                    <div className="relative h-4 bg-muted/40 rounded-lg">
                      {/* Meeting bar */}
                      <div
                        className={`absolute top-0 h-4 rounded-lg ${getMeetingColor(meeting.type)} opacity-70 border border-current`}
                        style={position}
                        data-testid={`gantt-meeting-bar-${meeting.id}`}
                      ></div>
                      
                      {/* Meeting info tooltip area */}
                      <div
                        className="absolute inset-0 cursor-pointer"
                        title={`${meeting.title} - ${meeting.startDate.toLocaleString()} (${Math.round((meeting.endDate.getTime() - meeting.startDate.getTime()) / (1000 * 60))} min)`}
                        style={position}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
        </div> {/* End of zoom wrapper */}
      </div>

      {/* Timeline Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            {/* Zoom Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Zoom:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50}
                data-testid="button-zoom-out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <div className="w-24">
                <Slider
                  value={[zoomLevel]}
                  onValueChange={handleZoomSlider}
                  min={50}
                  max={300}
                  step={25}
                  className="cursor-pointer"
                  data-testid="slider-zoom"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 300}
                data-testid="button-zoom-in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[3rem]">
                {zoomLevel}%
              </span>
            </div>

            {/* Scroll Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Navigate:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={scrollToStart}
                data-testid="button-scroll-start"
              >
                <Move className="h-4 w-4 mr-1" />
                Start
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={scrollToEnd}
                data-testid="button-scroll-end"
              >
                End
                <Move className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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

          {ganttMeetings.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <h5 className="text-sm font-medium text-foreground mb-2">Meeting Types</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span className="text-sm">Status</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-indigo-500 rounded"></div>
                  <span className="text-sm">Planning</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-cyan-500 rounded"></div>
                  <span className="text-sm">Review</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  <span className="text-sm">Decision</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-pink-500 rounded"></div>
                  <span className="text-sm">Brainstorming</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-violet-500 rounded"></div>
                  <span className="text-sm">Other</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
