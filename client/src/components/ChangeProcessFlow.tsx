import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb,
  Users,
  Building,
  Rocket,
  Star
} from "lucide-react";

// Define the phases with their metadata
export const CHANGE_PHASES = [
  {
    id: "identify_need",
    name: "Identify Need to Change",
    shortName: "Identify Need",
    icon: Lightbulb,
    color: "bg-blue-500",
    position: { x: 150, y: 300 }
  },
  {
    id: "identify_stakeholders",
    name: "Identify Stakeholders", 
    shortName: "Stakeholders",
    icon: Users,
    color: "bg-green-500",
    position: { x: 300, y: 300 }
  },
  {
    id: "develop_change",
    name: "Develop the Change",
    shortName: "Develop",
    icon: Building,
    color: "bg-orange-500",
    position: { x: 450, y: 300 }
  },
  {
    id: "implement_change",
    name: "Implement the Change",
    shortName: "Implement",
    icon: Rocket,
    color: "bg-purple-500",
    position: { x: 600, y: 300 }
  },
  {
    id: "reinforce_change",
    name: "Reinforce the Change",
    shortName: "Reinforce",
    icon: Star,
    color: "bg-pink-500",
    position: { x: 750, y: 300 }
  }
] as const;

interface ChangeProcessFlowProps {
  initiativesByPhase?: Record<string, number>;
}

export default function ChangeProcessFlow({ initiativesByPhase }: ChangeProcessFlowProps) {
  return (
    <div className="relative w-full min-h-[600px] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg overflow-hidden">
      {/* Background Design */}
      <div className="absolute inset-0">
        {/* Organizational Actions Bar */}
        <div className="absolute top-[60px] left-[80px] right-[80px] h-[50px] bg-gradient-to-r from-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-lg">
          <h3 className="text-white font-semibold text-lg">Organizational Actions</h3>
        </div>
        
        {/* Individual Actions Bar */}
        <div className="absolute bottom-[60px] left-[80px] right-[80px] h-[50px] bg-gradient-to-r from-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-lg">
          <h3 className="text-white font-semibold text-lg">Individual Actions</h3>
        </div>
        
        {/* Connecting Lines from Organizational to Categories */}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
          {/* Vertical connection lines from organizational bar to phases */}
          {CHANGE_PHASES.map((phase, index) => (
            <g key={`org-connection-${phase.id}`}>
              <line
                x1={phase.position.x}
                y1={130}
                x2={phase.position.x}
                y2={220}
                stroke="#dc2626"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.6"
              />
            </g>
          ))}
          
          {/* Horizontal arrow flow between phases */}
          {CHANGE_PHASES.slice(0, -1).map((phase, index) => {
            const nextPhase = CHANGE_PHASES[index + 1];
            return (
              <g key={`arrow-${phase.id}`}>
                <defs>
                  <marker
                    id={`arrowhead-${index}`}
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill="#dc2626"
                    />
                  </marker>
                </defs>
                <line
                  x1={phase.position.x + 60}
                  y1={phase.position.y}
                  x2={nextPhase.position.x - 60}
                  y2={nextPhase.position.y}
                  stroke="#dc2626"
                  strokeWidth="3"
                  markerEnd={`url(#arrowhead-${index})`}
                />
              </g>
            );
          })}
          
          {/* Vertical connection lines from phases to individual bar */}
          {CHANGE_PHASES.map((phase, index) => (
            <g key={`ind-connection-${phase.id}`}>
              <line
                x1={phase.position.x}
                y1={380}
                x2={phase.position.x}
                y2={470}
                stroke="#dc2626"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.6"
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Phase Categories - Centered between action bars */}
      <div className="relative" style={{ zIndex: 2 }}>
        {CHANGE_PHASES.map((phase) => {
          const count = initiativesByPhase?.[phase.id] || 0;
          const IconComponent = phase.icon;
          
          return (
            <div
              key={phase.id}
              className="absolute"
              style={{
                left: phase.position.x - 60,
                top: phase.position.y - 60,
                width: '120px',
                height: '120px'
              }}
              data-testid={`phase-bubble-${phase.id}`}
            >
              <Card className="relative bg-white dark:bg-slate-800 shadow-lg border-2 border-gray-200 dark:border-slate-600 hover:shadow-xl transition-shadow h-full">
                <CardContent className="p-3 text-center h-full flex flex-col justify-center">
                  <div className={`w-10 h-10 ${phase.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1 leading-tight">
                    {phase.shortName}
                  </h4>
                  <div className="text-[10px] text-gray-600 dark:text-gray-400">
                    Phase
                  </div>
                </CardContent>
                
                {/* Count Bubble */}
                {count > 0 && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xs">{count}</span>
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white dark:bg-slate-800 rounded-lg p-3 shadow-lg">
        <h4 className="text-sm font-semibold mb-2">My Initiatives by Phase</h4>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-red-600 rounded-full"></div>
          <span className="text-xs text-gray-600 dark:text-gray-400">Count of assigned initiatives</span>
        </div>
      </div>
    </div>
  );
}