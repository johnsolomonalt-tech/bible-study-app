"use client";

import React, { useState } from 'react';
import { 
  BaseEdge, 
  EdgeLabelRenderer, 
  getBezierPath, 
  EdgeProps,
  useReactFlow
} from '@xyflow/react';
import { X } from 'lucide-react';

export function CustomCanvasEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  selected,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected || isHovered ? 2.5 : 1.75,
          stroke: selected ? 'var(--accent, #c96442)' : isHovered ? '#a1a1aa' : '#71717a',
          transition: 'stroke 0.15s, stroke-width 0.15s',
        }}
      />
      {/* Invisible thicker path for easier hovering/clicking */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="cursor-pointer pointer-events-stroke"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center gap-1"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {label && (
            <div className="bg-[#18181b]/90 border border-zinc-700/80 text-zinc-200 text-[11px] font-medium px-2 py-0.5 rounded-full shadow-md backdrop-blur-sm pointer-events-none">
              {label}
            </div>
          )}

          {(isHovered || selected) && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              title="Delete connector"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
