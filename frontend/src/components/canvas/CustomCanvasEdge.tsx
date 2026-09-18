"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  BaseEdge, 
  EdgeLabelRenderer, 
  getBezierPath, 
  EdgeProps,
  useReactFlow
} from '@xyflow/react';
import { X, Edit2 } from 'lucide-react';

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
  data,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [labelText, setLabelText] = useState(typeof label === 'string' ? label : '');
  const inputRef = useRef<HTMLInputElement>(null);

  const isDark = (data as any)?.theme !== 'light';

  useEffect(() => {
    setLabelText(typeof label === 'string' ? label : '');
  }, [label]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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

  const handleSaveLabel = (text: string) => {
    setIsEditing(false);
    const trimmed = text.trim();
    setEdges((edges) =>
      edges.map((edge) =>
        edge.id === id ? { ...edge, label: trimmed || undefined } : edge
      )
    );
  };

  const hasLabel = label !== undefined && label !== null && String(label).trim() !== '';

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
        strokeWidth={24}
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
            zIndex: selected || isHovered ? 1010 : 1000,
          }}
          className="nodrag nopan flex items-center gap-1 transition-transform"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={labelText}
              onChange={(e) => setLabelText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  handleSaveLabel(labelText);
                } else if (e.key === 'Escape') {
                  e.stopPropagation();
                  setLabelText(typeof label === 'string' ? label : '');
                  setIsEditing(false);
                }
              }}
              onBlur={() => handleSaveLabel(labelText)}
              placeholder="Link name..."
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border shadow-xl outline-none w-32 text-center transition-all ${
                isDark 
                  ? 'bg-zinc-900 border-accent text-zinc-100 placeholder-zinc-500 ring-2 ring-accent/30' 
                  : 'bg-white border-accent text-zinc-900 placeholder-zinc-400 ring-2 ring-accent/30'
              }`}
            />
          ) : hasLabel ? (
            <div
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              title={typeof label === 'string' ? label : 'Connector link'}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border shadow-lg cursor-pointer transition-all select-none ${
                selected || isHovered
                  ? isDark
                    ? 'bg-zinc-900 border-accent text-accent ring-2 ring-accent/30 scale-105 shadow-xl'
                    : 'bg-white border-accent text-accent ring-2 ring-accent/30 scale-105 shadow-xl'
                  : isDark
                    ? 'bg-[#1c1c20] border-zinc-600 text-zinc-100 hover:border-accent/70 hover:text-white shadow-md'
                    : 'bg-white border-zinc-300 text-zinc-800 hover:border-accent/70 hover:text-black shadow-md'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
              <span className="max-w-[260px] truncate">{label}</span>

              {(isHovered || selected) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className={`ml-0.5 p-0.5 rounded transition-colors ${
                    isDark ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200' : 'hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800'
                  }`}
                  title="Rename link"
                >
                  <Edit2 size={10} />
                </button>
              )}
            </div>
          ) : (isHovered || selected) ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-dashed shadow-sm transition-all cursor-pointer ${
                isDark
                  ? 'border-zinc-500 bg-zinc-900/90 text-zinc-300 hover:border-accent hover:text-accent'
                  : 'border-zinc-400 bg-white/90 text-zinc-700 hover:border-accent hover:text-accent'
              }`}
              title="Add link name"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
              <span>+ Label</span>
            </button>
          ) : null}

          {(isHovered || selected) && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer ml-0.5"
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
