"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { CustomCanvasNode } from '@/components/canvas/CustomCanvasNode';
import { CustomCanvasEdge } from '@/components/canvas/CustomCanvasEdge';
import { CanvasNodeData, SerializableNode, SerializableEdge } from '@/types/canvas';
import { 
  BookOpen, 
  ExternalLink, 
  Layers, 
  Sun, 
  Moon, 
  Maximize2, 
  Loader2, 
  Sparkles,
  Share2
} from 'lucide-react';

const nodeTypes = {
  customCard: CustomCanvasNode,
};

const edgeTypes = {
  customEdge: CustomCanvasEdge,
};

function InnerSharedCanvasViewer({ boardId }: { boardId: string }) {
  const { fitView } = useReactFlow();
  const [boardTitle, setBoardTitle] = useState('Shared Canvas Board');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CanvasNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const isDark = theme === 'dark';

  useEffect(() => {
    async function loadBoard() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/canvas?id=${encodeURIComponent(boardId)}`);
        if (!res.ok) {
          throw new Error('Canvas board not found or private');
        }
        const data = await res.json();
        setBoardTitle(data.title || 'Untitled Board');

        const loadedNodes: Node<CanvasNodeData>[] = (data.nodes || []).map((raw: SerializableNode) => ({
          id: raw.id,
          type: 'customCard',
          position: raw.position,
          data: {
            ...raw.data,
            theme,
          },
          style: {
            width: raw.style?.width || 380,
            ...raw.style,
          },
        }));

        const loadedEdges: Edge[] = (data.edges || []).map((raw: SerializableEdge) => ({
          id: raw.id,
          source: raw.source,
          target: raw.target,
          sourceHandle: raw.sourceHandle,
          targetHandle: raw.targetHandle,
          type: 'customEdge',
          label: raw.label || 'Relates to',
          animated: raw.animated ?? true,
          data: { theme },
        }));

        setNodes(loadedNodes);
        setEdges(loadedEdges);

        setTimeout(() => {
          fitView({ padding: 0.25, duration: 600 });
        }, 150);
      } catch (err: any) {
        setError(err?.message || 'Failed to load board');
      } finally {
        setIsLoading(false);
      }
    }

    if (boardId) {
      loadBoard();
    }
  }, [boardId, fitView, setEdges, setNodes, theme]);

  if (isLoading) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center gap-3 bg-[#161618] text-white">
        <Loader2 size={36} className="animate-spin text-accent" />
        <p className="text-sm font-medium text-zinc-400 animate-pulse">
          Loading visual Bible study board...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center gap-4 bg-[#161618] text-white p-6 text-center">
        <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <Layers size={32} />
        </div>
        <h1 className="text-xl font-bold">Canvas Board Unavailable</h1>
        <p className="text-sm text-zinc-400 max-w-md">
          {error}. The board may have been removed or the link is incorrect.
        </p>
        <a
          href="/"
          className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all"
        >
          Return to Theologica
        </a>
      </div>
    );
  }

  return (
    <div 
      className="relative w-screen h-screen overflow-hidden select-none"
      style={{ backgroundColor: isDark ? '#161618' : '#F6F6F6' }}
    >
      {/* Top Floating App Bar */}
      <header className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
        {/* Left: Branding & Board Title */}
        <div 
          className={`pointer-events-auto flex items-center gap-3 px-3.5 py-2 rounded-2xl shadow-xl border backdrop-blur-md ${
            isDark 
              ? 'bg-[#1e1e22]/90 border-zinc-700/70 text-zinc-100' 
              : 'bg-white/95 border-zinc-200/90 text-zinc-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-serif font-black tracking-tight text-accent text-lg">
              Theologica
            </span>
            <span className="text-zinc-500">/</span>
            <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm">
              <Layers size={14} className="text-accent" />
              <span>{boardTitle}</span>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
            Public Board
          </span>
        </div>

        {/* Right: Controls & CTA */}
        <div 
          className={`pointer-events-auto flex items-center gap-2 p-1.5 rounded-2xl shadow-xl border backdrop-blur-md ${
            isDark 
              ? 'bg-[#1e1e22]/90 border-zinc-700/70 text-zinc-200' 
              : 'bg-white/95 border-zinc-200/90 text-zinc-700'
          }`}
        >
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-xl hover:bg-zinc-700/20 transition-colors cursor-pointer"
            title={isDark ? 'Light Theme' : 'Dark Theme'}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            type="button"
            onClick={() => fitView({ padding: 0.25, duration: 500 })}
            className="p-2 rounded-xl hover:bg-zinc-700/20 transition-colors cursor-pointer"
            title="Fit Canvas View"
          >
            <Maximize2 size={15} />
          </button>

          <a
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all shadow-sm"
          >
            <span>Open in Theologica</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </header>

      {/* Main React Flow Board */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        fitView
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={isDark ? '#333338' : '#D0D0D4'}
        />
        <Controls
          showInteractive={false}
          className={`!bottom-6 !left-6 !rounded-xl !border !shadow-xl ${
            isDark ? '!bg-[#1e1e22] !border-zinc-700 !text-white' : '!bg-white !border-zinc-200 !text-zinc-800'
          }`}
        />
      </ReactFlow>
    </div>
  );
}

export default function SharedCanvasPage() {
  const params = useParams();
  const boardId = (params?.id as string) || '';

  return (
    <ReactFlowProvider>
      <InnerSharedCanvasViewer boardId={boardId} />
    </ReactFlowProvider>
  );
}
