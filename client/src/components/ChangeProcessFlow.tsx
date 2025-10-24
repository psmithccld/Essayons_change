import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb,
  Users,
  Building,
  Rocket,
  Star
} from "lucide-react";

// Define the phases with their metadata (no fixed positions here)
export const CHANGE_PHASES = [
  {
    id: "identify_need",
    name: "Identify Need to Change",
    shortName: "Identify Need",
    icon: Lightbulb,
    color: "bg-blue-500"
  },
  {
    id: "identify_stakeholders",
    name: "Identify Stakeholders", 
    shortName: "Stakeholders",
    icon: Users,
    color: "bg-green-500"
  },
  {
    id: "develop_change",
    name: "Develop the Change",
    shortName: "Develop",
    icon: Building,
    color: "bg-orange-500"
  },
  {
    id: "implement_change",
    name: "Implement the Change",
    shortName: "Implement",
    icon: Rocket,
    color: "bg-purple-500"
  },
  {
    id: "reinforce_change",
    name: "Reinforce the Change",
    shortName: "Reinforce",
    icon: Star,
    color: "bg-pink-500"
  }
] as const;

interface ChangeProcessFlowProps {
  initiativesByPhase?: Record<string, number>;
}

export default function ChangeProcessFlow({ initiativesByPhase }: ChangeProcessFlowProps) {
  // containerRef measures the visual container width so we can compute even X positions
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [positions, setPositions] = useState<number[]>([]); // absolute x positions in px
  const rafRef = useRef<number | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const leftMargin = 40; // matches the existing left/right offsets in the background bars
  const rightMargin = 40;
  const verticalCenter = 300; // same y-level as before

  // compute even positions whenever container width changes
  useEffect(() => {
    function updatePositions() {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const availableWidth = Math.max(0, rect.width - leftMargin - rightMargin);
      const count = CHANGE_PHASES.length;
      const spacing = count > 1 ? availableWidth / (count - 1) : 0;
      const newPositions = CHANGE_PHASES.map((_, i) => leftMargin + i * spacing);
      setPositions(newPositions);
    }

    // wrapper to throttle with requestAnimationFrame
    const scheduleUpdate = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        updatePositions();
        rafRef.current = null;
      });
    };

    // initial compute
    scheduleUpdate();

    const el = containerRef.current;
    if (el && typeof window !== "undefined" && "ResizeObserver" in window) {
      // Use ResizeObserver when available
      roRef.current = new ResizeObserver(() => {
        scheduleUpdate();
      });
      roRef.current.observe(el);
    } else {
      // Fallback to window resize
      const onResize = () => scheduleUpdate();
      window.addEventListener("resize", onResize);
      // cleanup for fallback
      return () => {
        window.removeEventListener("resize", onResize);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }

    return () => {
      // cleanup ResizeObserver and any pending RAF
      if (roRef.current) {
        roRef.current.disconnect();
        roRef.current = null;
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // fallback: if positions haven't been computed yet, use a temporary set of evenly-spaced defaults
  const fallbackPositions = (() => {
    const count = CHANGE_PHASES.length;
    const spacing = 160; // fallback spacing similar to current hardcoded spacing
    return CHANGE_PHASES.map((_, i) => 120 + i * spacing);
  })();

  return (
    <div ref={containerRef} className="relative w-full min-h-[600px] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg overflow-hidden">
      {/* Background Design */}
      <div className="absolute inset-0">
        {/* Organizational Actions Bar */}
        <div className="absolute top-[60px] left-[40px] right-[40px] h-[50px] bg-gradient-to-r from-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-lg">
          <h3 className="text-white font-semibold text-lg">Organizational Actions</h3>
        </div>
        
        {/* Individual Actions Bar */}
        <div className="absolute bottom-[60px] left-[40px] right-[40px] h-[50px] bg-gradient-to-r from-red-600 to-red-700 rounded-lg flex items-center justify-center shadow-lg">
          <h3 className="text-white font-semibold text-lg">Individual Actions</h3>
        </div>
        
        {/* Connecting Lines from Organizational to Categories */}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
          {/* Vertical connection lines from organizational bar to phases */}
          {(positions.length ? positions : fallbackPositions).map((pos, index) => (
            <g key={`org-connection-${CHANGE_PHASES[index].id}`}>  
              <line
                x1={pos}
                y1={130}
                x2={pos}
                y2={220}
                stroke="#dc2626"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.6"
              />
            </g>
          ))}
          
          {/* Horizontal arrow flow between phases */}
          {(positions.length ? positions : fallbackPositions).slice(0, -1).map((pos, index) => {
            const x1 = pos + 60;
            const x2 = (positions.length ? positions : fallbackPositions)[index + 1] - 60;
            return (
              <g key={`arrow-${CHANGE_PHASES[index].id}`}> 
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
                  x1={x1}
                  y1={verticalCenter}
                  x2={x2}
                  y2={verticalCenter}
                  stroke="#dc2626"
                  strokeWidth="3"
                  markerEnd={`url(#arrowhead-${index})`}
                />
              </g>
            );
          })}
          
          {/* Vertical connection lines from phases to individual bar */}
          {(positions.length ? positions : fallbackPositions).map((pos, index) => (
            <g key={`ind-connection-${CHANGE_PHASES[index].id}`}>  
              <line
                x1={pos}
                y1={380}
                x2={pos}
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
        {(CHANGE_PHASES).map((phase, index) => {
          const count = initiativesByPhase?.[phase.id] || 0;
          const IconComponent = phase.icon;
          const posX = positions[index] ?? fallbackPositions[index];
          
          return (
            <div
              key={phase.id}
              className="absolute"
              style={{
                left: posX - 60,
                top: verticalCenter - 60,
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