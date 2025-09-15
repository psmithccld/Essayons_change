import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ChevronRight, AlertCircle } from "lucide-react";
import GanttChart from "@/components/charts/gantt-chart";
import type { Project, Task } from "@shared/schema";

export default function Gantt() {
  const [selectedProject, setSelectedProject] = useState<string>("");

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['/api/projects', selectedProject, 'tasks'],
    enabled: !!selectedProject,
  });

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  return (
    <div className="space-y-6" data-testid="gantt-page">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Gantt Charts</h1>
        <p className="text-sm text-muted-foreground">Visualize project timelines and task dependencies</p>
      </div>

      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Project</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-full max-w-md" data-testid="select-gantt-project">
              <SelectValue placeholder="Choose a project to view timeline" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Project Overview */}
      {selectedProjectData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{selectedProjectData.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedProjectData.description}
                </p>
              </div>
              <Badge className={
                selectedProjectData.status === 'active' ? 'bg-green-100 text-green-800' :
                selectedProjectData.status === 'planning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }>
                {selectedProjectData.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Start Date</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedProjectData.startDate 
                      ? new Date(selectedProjectData.startDate).toLocaleDateString()
                      : 'Not set'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">End Date</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedProjectData.endDate
                      ? new Date(selectedProjectData.endDate).toLocaleDateString()
                      : 'Not set'
                    }
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Progress</p>
                <p className="text-sm text-muted-foreground">{selectedProjectData.progress || 0}% Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gantt Chart */}
      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle>Project Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64" data-testid="gantt-loading">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12" data-testid="no-tasks-gantt">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Tasks to Display</h3>
                <p className="text-sm text-muted-foreground">
                  Add tasks to this project to see the Gantt chart visualization.
                </p>
              </div>
            ) : (
              <GanttChart tasks={tasks} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Task Dependencies */}
      {selectedProject && tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Task Dependencies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tasks
                .filter(task => task.dependencies && task.dependencies.length > 0)
                .map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center space-x-3 p-3 border border-border rounded-lg"
                    data-testid={`dependency-${task.id}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{task.name}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-muted-foreground">Depends on:</span>
                        {task.dependencies?.map((depId, index) => {
                          const dependentTask = tasks.find(t => t.id === depId);
                          return (
                            <div key={depId} className="flex items-center">
                              {index > 0 && <span className="text-muted-foreground mx-1">,</span>}
                              <Badge variant="outline" className="text-xs">
                                {dependentTask?.name || `Task ${depId.slice(0, 8)}...`}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                ))}
              {tasks.filter(task => task.dependencies && task.dependencies.length > 0).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No task dependencies defined</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
