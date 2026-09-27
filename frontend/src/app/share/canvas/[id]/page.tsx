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
  Share2,
  BookmarkPlus,
  Check,
  Copy,
  ArrowRight
} from 'lucide-react';

const nodeTypes = {
  customCard: CustomCanvasNode,
};

const edgeTypes = {
  customEdge: CustomCanvasEdge,
};

function InnerSharedCanvasViewer({ boardId }: { boardId: string }) {
  const router = useRouter();
  const { fitView } = useReactFlow();
  const [boardTitle, setBoardTitle] = useState('Shared Canvas Board');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSavingToMyCanvas, setIsSavingToMyCanvas] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CanvasNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const isDark = theme === 'dark';

  const handleSaveToMyCanvas = async () => {
    if (isSavingToMyCanvas || saveSuccess) return;
    setIsSavingToMyCanvas(true);

    try {
      // 1. Call import API
      const res = await fetch('/api/canvas/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: boardId }),
      });

      let targetId = `board-${Date.now()}`;
      let targetTitle = boardTitle;
      let targetNodes = nodes.map((n) => ({
        id: n.id,
        type: 'customCard',
        position: n.position,
        data: n.data,
        style: n.style,
      }));
      let targetEdges = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: e.label,
        animated: e.animated,
      }));

      if (res.ok) {
        const data = await res.json();
        if (data.board) {
          targetId = data.board.id;
          targetTitle = data.board.title;
          if (Array.isArray(data.board.nodes) && data.board.nodes.length > 0) {
            targetNodes = data.board.nodes;
          }
          if (Array.isArray(data.board.edges)) {
            targetEdges = data.board.edges;
          }
        }
      }

      // 2. Also save directly to client localStorage for immediate access
      try {
        const STORAGE_KEY_ACTIVE_BOARD = 'theologica_active_canvas_board_id';
        const STORAGE_KEY_BOARDS_LIST = 'theologica_canvas_boards_list_v1';
        const STORAGE_KEY_BOARD_PREFIX = 'theologica_canvas_state_';

        localStorage.setItem(`${STORAGE_KEY_BOARD_PREFIX}${targetId}`, JSON.stringify({
          id: targetId,
          title: targetTitle,
          nodes: targetNodes,
          edges: targetEdges,
          updatedAt: new Date().toISOString(),
        }));

        const existingList = JSON.parse(localStorage.getItem(STORAGE_KEY_BOARDS_LIST) || '[]');
        const metaItem = {
          id: targetId,
          title: targetTitle,
          updatedAt: new Date().toISOString(),
          nodeCount: targetNodes.length,
        };
        const updatedList = [metaItem, ...existingList.filter((b: any) => b.id !== targetId)];
        localStorage.setItem(STORAGE_KEY_BOARDS_LIST, JSON.stringify(updatedList));
        localStorage.setItem(STORAGE_KEY_ACTIVE_BOARD, targetId);
      } catch (storageErr) {
        console.warn('Local storage write failed during canvas save:', storageErr);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        router.push(`/?tab=canvas&imported=1`);
      }, 700);
    } catch (err) {
      console.error('Failed to save to my canvas:', err);
      router.push(`/?tab=canvas&importCanvas=${encodeURIComponent(boardId)}`);
    } finally {
      setIsSavingToMyCanvas(false);
    }
  };

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
      <header className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-40 flex items-center justify-between pointer-events-none gap-2">
        {/* Left: Branding & Board Title */}
        <div 
          className={`pointer-events-auto flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl shadow-xl border backdrop-blur-md min-w-0 max-w-[60vw] sm:max-w-none ${
            isDark 
              ? 'bg-[#1e1e22]/90 border-zinc-700/70 text-zinc-100' 
              : 'bg-white/95 border-zinc-200/90 text-zinc-800'
          }`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="font-serif font-black tracking-tight text-accent text-base sm:text-lg shrink-0">
              Theologica
            </span>
            <span className="text-zinc-500 shrink-0">/</span>
            <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm min-w-0">
              <Layers size={14} className="text-accent shrink-0" />
              <span className="truncate max-w-[90px] xs:max-w-[150px] sm:max-w-[240px]">{boardTitle}</span>
            </div>
          </div>
          <span className="hidden md:inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shrink-0">
            Public Board
          </span>
        </div>

        {/* Right: Controls & CTA */}
        <div 
          className={`pointer-events-auto flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-2xl shadow-xl border backdrop-blur-md shrink-0 ${
            isDark 
              ? 'bg-[#1e1e22]/90 border-zinc-700/70 text-zinc-200' 
              : 'bg-white/95 border-zinc-200/90 text-zinc-700'
          }`}
        >
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-zinc-700/20 transition-colors cursor-pointer"
            title={isDark ? 'Light Theme' : 'Dark Theme'}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            type="button"
            onClick={() => fitView({ padding: 0.25, duration: 500 })}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-zinc-700/20 transition-colors cursor-pointer hidden xs:flex"
            title="Fit Canvas View"
          >
            <Maximize2 size={15} />
          </button>

          {/* Primary Action: Save to My Canvases */}
          <button
            type="button"
            onClick={handleSaveToMyCanvas}
            disabled={isSavingToMyCanvas || saveSuccess}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-accent text-white hover:bg-accent/90'
            }`}
            title="Save a complete editable copy of this canvas into your own Theologica account"
          >
            {saveSuccess ? (
              <>
                <Check size={14} className="text-white" />
                <span className="font-bold">Saved! Opening...</span>
              </>
            ) : isSavingToMyCanvas ? (
              <>
                <Loader2 size={14} className="animate-spin text-white" />
                <span>Saving Canvas...</span>
              </>
            ) : (
              <>
                <BookmarkPlus size={14} />
                <span>Save to My Canvases</span>
              </>
            )}
          </button>

          <a
            href="/"
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <span>Theologica</span>
            <ExternalLink size={12} />
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
