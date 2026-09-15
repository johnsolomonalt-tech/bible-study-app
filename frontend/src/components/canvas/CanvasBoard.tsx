"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  Connection,
  Edge,
  Node,
  MarkerType,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { CustomCanvasNode } from './CustomCanvasNode';
import { CustomCanvasEdge } from './CustomCanvasEdge';
import { CanvasToolbar } from './CanvasToolbar';
import { GeminiCanvasModal } from './GeminiCanvasModal';
import {
  NodeCategory,
  CanvasNodeData,
  SerializableNode,
  SerializableEdge,
  CanvasStatePayload,
} from '@/types/canvas';

interface CanvasBoardProps {
  theme?: 'dark' | 'light';
  incomingNode?: {
    title: string;
    content: string;
    category?: NodeCategory;
  } | null;
  onIncomingNodeHandled?: () => void;
}

// Initial sample nodes if user canvas is totally empty
const INITIAL_DEMO_NODES: SerializableNode[] = [
  {
    id: 'demo-scripture-1',
    type: 'customCard',
    position: { x: 100, y: 150 },
    data: {
      title: 'Romans 8:28',
      content: '> "And we know that in all things God works for the good of those who love him, who have been called according to his purpose."\n\n*Paul\'s foundational assurance of sovereign grace.*',
      category: 'scripture',
    },
  },
  {
    id: 'demo-theology-1',
    type: 'customCard',
    position: { x: 520, y: 80 },
    data: {
      title: 'Sovereign Providence',
      content: 'God orchestrates all earthly affairs, both pleasant and sorrowful, toward the eternal spiritual good of His elect. **All things** are subordinate to His sovereign will.',
      category: 'theological_point',
    },
  },
  {
    id: 'demo-app-1',
    type: 'customCard',
    position: { x: 520, y: 340 },
    data: {
      title: 'Trust Amidst Trials',
      content: '- Surrender anxiety over uncertain circumstances.\n- Cultivate praise in trials, knowing God is working good.\n- Realign personal desires with His redemptive purpose.',
      category: 'application',
    },
  },
];

const INITIAL_DEMO_EDGES: SerializableEdge[] = [
  {
    id: 'demo-edge-1',
    source: 'demo-scripture-1',
    target: 'demo-theology-1',
    label: 'Doctrinal Basis',
    animated: true,
  },
  {
    id: 'demo-edge-2',
    source: 'demo-theology-1',
    target: 'demo-app-1',
    label: 'Living Faith',
    animated: true,
  },
];

const STORAGE_KEY = 'theologica_canvas_state_v1';

function InnerCanvasBoard({
  theme = 'dark',
  incomingNode,
  onIncomingNodeHandled,
}: CanvasBoardProps) {
  const { fitView, zoomIn, zoomOut, getViewport, setViewport } = useReactFlow();
  const isDark = theme === 'dark';

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CanvasNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [boardTitle, setBoardTitle] = useState('My Theological Canvas');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Modal state
  const [isGeminiOpen, setIsGeminiOpen] = useState(false);

  // Undo / Redo stacks
  const historyRef = useRef<Array<{ nodes: Node<CanvasNodeData>[]; edges: Edge[] }>>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoAction = useRef(false);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateHistoryButtons = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const pushHistorySnapshot = useCallback((newNodes: Node<CanvasNodeData>[], newEdges: Edge[]) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    // Clean forward history
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
    trimmed.push({
      nodes: JSON.parse(JSON.stringify(newNodes)),
      edges: JSON.parse(JSON.stringify(newEdges)),
    });

    // Limit stack size to 30
    if (trimmed.length > 30) {
      trimmed.shift();
    }

    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
    updateHistoryButtons();
  }, [updateHistoryButtons]);

  // Node actions
  const handleUpdateNode = useCallback((id: string, updates: Partial<CanvasNodeData>) => {
    setNodes((nds) => {
      const updated = nds.map((n) => {
        if (n.id === id) {
          return {
            ...n,
            data: {
              ...n.data,
              ...updates,
            },
          };
        }
        return n;
      });
      pushHistorySnapshot(updated, edges);
      return updated;
    });
  }, [edges, pushHistorySnapshot, setNodes]);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => {
      const updatedNodes = nds.filter((n) => n.id !== id);
      setEdges((eds) => {
        const updatedEdges = eds.filter((e) => e.source !== id && e.target !== id);
        pushHistorySnapshot(updatedNodes, updatedEdges);
        return updatedEdges;
      });
      return updatedNodes;
    });
  }, [pushHistorySnapshot, setEdges, setNodes]);

  const handleDuplicateNode: (id: string) => void = useCallback((id: string) => {
    setNodes((nds) => {
      const target = nds.find((n) => n.id === id);
      if (!target) return nds;

      const newId = `card-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const duplicated: Node<CanvasNodeData> = {
        ...target,
        id: newId,
        position: {
          x: target.position.x + 40,
          y: target.position.y + 40,
        },
        selected: true,
        data: {
          ...target.data,
          title: `${target.data.title} (Copy)`,
          onUpdate: handleUpdateNode,
          onDuplicate: handleDuplicateNode,
          onDelete: handleDeleteNode,
          theme,
        },
      };

      const updated: Node<CanvasNodeData>[] = [
        ...nds.map((n) => ({ ...n, selected: false })),
        duplicated,
      ];
      pushHistorySnapshot(updated, edges);
      return updated;
    });
  }, [edges, handleDeleteNode, handleUpdateNode, pushHistorySnapshot, setNodes, theme]);

  // Node & Edge types
  const nodeTypes = useMemo(() => ({
    customCard: CustomCanvasNode,
  }), []);

  const edgeTypes = useMemo(() => ({
    customEdge: CustomCanvasEdge,
  }), []);

  // Format node helper with callbacks and theme
  const prepareNode = useCallback((raw: SerializableNode): Node<CanvasNodeData> => {
    return {
      id: raw.id,
      type: 'customCard',
      position: raw.position,
      data: {
        ...raw.data,
        theme,
        onUpdate: handleUpdateNode,
        onDuplicate: handleDuplicateNode,
        onDelete: handleDeleteNode,
      },
      style: raw.style,
    };
  }, [handleDeleteNode, handleDuplicateNode, handleUpdateNode, theme]);

  // Format edge helper
  const prepareEdge = useCallback((raw: SerializableEdge): Edge => {
    return {
      id: raw.id,
      source: raw.source,
      target: raw.target,
      type: 'customEdge',
      label: raw.label,
      animated: raw.animated ?? true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isDark ? '#a1a1aa' : '#71717a',
        width: 16,
        height: 16,
      },
    };
  }, [isDark]);

  // Load canvas on mount
  useEffect(() => {
    let initialNodes: SerializableNode[] = INITIAL_DEMO_NODES;
    let initialEdges: SerializableEdge[] = INITIAL_DEMO_EDGES;
    let initialTitle = 'My Theological Canvas';

    // 1. Try local storage first
    try {
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed.nodes && parsed.nodes.length > 0) {
          initialNodes = parsed.nodes;
          initialEdges = parsed.edges || [];
          if (parsed.title) initialTitle = parsed.title;
        }
      }
    } catch (e) {
      console.warn('Could not read canvas from local storage:', e);
    }

    const preparedNodes = initialNodes.map(prepareNode);
    const preparedEdges = initialEdges.map(prepareEdge);

    setNodes(preparedNodes);
    setEdges(preparedEdges);
    setBoardTitle(initialTitle);

    // Initialize history stack
    historyRef.current = [{
      nodes: JSON.parse(JSON.stringify(preparedNodes)),
      edges: JSON.parse(JSON.stringify(preparedEdges)),
    }];
    historyIndexRef.current = 0;
    updateHistoryButtons();

    // 2. Background sync with /api/canvas
    fetch('/api/canvas?id=default')
      .then((res) => res.json())
      .then((remote) => {
        if (remote.nodes && remote.nodes.length > 0 && !localStorage.getItem(STORAGE_KEY)) {
          const rNodes = remote.nodes.map(prepareNode);
          const rEdges = (remote.edges || []).map(prepareEdge);
          setNodes(rNodes);
          setEdges(rEdges);
          if (remote.title) setBoardTitle(remote.title);
          historyRef.current = [{ nodes: rNodes, edges: rEdges }];
          historyIndexRef.current = 0;
          updateHistoryButtons();
        }
      })
      .catch((err) => console.warn('Canvas remote fetch offline/unavailable:', err));

    setTimeout(() => {
      fitView({ padding: 0.25, duration: 600 });
    }, 150);
  }, []); // Run once on mount

  // Sync theme changes to existing nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          theme,
          onUpdate: handleUpdateNode,
          onDuplicate: handleDuplicateNode,
          onDelete: handleDeleteNode,
        },
      }))
    );
  }, [theme, handleUpdateNode, handleDuplicateNode, handleDeleteNode, setNodes]);

  // Auto-save debounce (localStorage + /api/canvas)
  useEffect(() => {
    if (nodes.length === 0) return;

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        const payload: CanvasStatePayload & { title: string } = {
          title: boardTitle,
          nodes: nodes.map((n) => ({
            id: n.id,
            type: 'customCard',
            position: n.position,
            data: {
              title: n.data.title,
              content: n.data.content,
              category: n.data.category,
              color: n.data.color,
              tags: n.data.tags,
            },
            style: n.style as React.CSSProperties | undefined,
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label as string,
            animated: e.animated,
          })),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

        // Sync with API
        fetch('/api/canvas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'default',
            title: boardTitle,
            nodes: payload.nodes,
            edges: payload.edges,
          }),
        }).catch((e) => console.warn('Canvas remote save offline fallback:', e));

        setSaveStatus('saved');
      } catch (err) {
        console.error('Error auto-saving canvas:', err);
        setSaveStatus('unsaved');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [nodes, edges, boardTitle]);

  // Handle incoming node from Scripture Reader or Bible Chat
  useEffect(() => {
    if (!incomingNode) return;

    const timestamp = Date.now();
    const newId = `card-incoming-${timestamp}`;

    // Find position near center or offset from existing nodes
    let posX = 150;
    let posY = 150;
    if (nodes.length > 0) {
      let maxX = -Infinity;
      for (const n of nodes) {
        if (n.position.x > maxX) maxX = n.position.x;
      }
      posX = maxX + 380;
      posY = 150;
    }

    const newNode: Node<CanvasNodeData> = {
      id: newId,
      type: 'customCard',
      position: { x: posX, y: posY },
      selected: true,
      data: {
        title: incomingNode.title || 'Scripture Reference',
        content: incomingNode.content || '',
        category: incomingNode.category || 'scripture',
        theme,
        onUpdate: handleUpdateNode,
        onDuplicate: handleDuplicateNode,
        onDelete: handleDeleteNode,
      },
    };

    setNodes((nds) => {
      const updated: Node<CanvasNodeData>[] = [
        ...nds.map((n) => ({ ...n, selected: false })),
        newNode,
      ];
      pushHistorySnapshot(updated, edges);
      return updated;
    });

    if (onIncomingNodeHandled) {
      onIncomingNodeHandled();
    }

    setTimeout(() => {
      fitView({ padding: 0.25, duration: 600 });
    }, 100);
  }, [incomingNode, nodes, edges, theme, handleUpdateNode, handleDuplicateNode, handleDeleteNode, onIncomingNodeHandled, pushHistorySnapshot, fitView, setNodes]);

  // Add new node via toolbar
  const handleAddNode = useCallback((category: NodeCategory) => {
    const timestamp = Date.now();
    const newId = `card-${timestamp}`;

    // Center in view or stagger
    let posX = 200;
    let posY = 200;

    if (nodes.length > 0) {
      const last = nodes[nodes.length - 1];
      posX = last.position.x + 60;
      posY = last.position.y + 60;
    }

    const titles: Record<NodeCategory, string> = {
      scripture: 'Scripture Verse',
      theological_point: 'Theological Definition',
      historical_context: 'Historical Setting',
      illustration: 'Typology / Analogy',
      application: 'Personal Application',
      general: 'New Note',
    };

    const newNode: Node<CanvasNodeData> = {
      id: newId,
      type: 'customCard',
      position: { x: posX, y: posY },
      selected: true,
      data: {
        title: titles[category],
        content: '',
        category,
        theme,
        onUpdate: handleUpdateNode,
        onDuplicate: handleDuplicateNode,
        onDelete: handleDeleteNode,
      },
    };

    setNodes((nds) => {
      const updated: Node<CanvasNodeData>[] = [
        ...nds.map((n) => ({ ...n, selected: false })),
        newNode,
      ];
      pushHistorySnapshot(updated, edges);
      return updated;
    });
  }, [nodes, edges, theme, handleUpdateNode, handleDuplicateNode, handleDeleteNode, pushHistorySnapshot, setNodes]);

  // Connect edges with validation (no self-connections, no duplicate edges)
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return; // Prevent self-connections

    setEdges((eds) => {
      // Check duplicates
      const exists = eds.some(
        (e) => e.source === connection.source && e.target === connection.target
      );
      if (exists) return eds;

      const newEdge: Edge = {
        ...connection,
        id: `edge-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'customEdge',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isDark ? '#a1a1aa' : '#71717a',
          width: 16,
          height: 16,
        },
      } as Edge;

      const updated = addEdge(newEdge, eds);
      pushHistorySnapshot(nodes, updated);
      return updated;
    });
  }, [isDark, nodes, pushHistorySnapshot, setEdges]);

  // Undo / Redo implementations
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isUndoRedoAction.current = true;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];

    const restoredNodes = snapshot.nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        theme,
        onUpdate: handleUpdateNode,
        onDuplicate: handleDuplicateNode,
        onDelete: handleDeleteNode,
      },
    }));

    setNodes(restoredNodes);
    setEdges(snapshot.edges);
    updateHistoryButtons();
  }, [handleDeleteNode, handleDuplicateNode, handleUpdateNode, setEdges, setNodes, theme, updateHistoryButtons]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isUndoRedoAction.current = true;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];

    const restoredNodes = snapshot.nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        theme,
        onUpdate: handleUpdateNode,
        onDuplicate: handleDuplicateNode,
        onDelete: handleDeleteNode,
      },
    }));

    setNodes(restoredNodes);
    setEdges(snapshot.edges);
    updateHistoryButtons();
  }, [handleDeleteNode, handleDuplicateNode, handleUpdateNode, setEdges, setNodes, theme, updateHistoryButtons]);

  // Keyboard shortcuts (Cmd+Z, Cmd+Shift+Z, Delete/Backspace)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore hotkeys if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.metaKey || e.ctrlKey) &&
        (e.shiftKey || e.key.toLowerCase() === 'y') &&
        (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Delete selected nodes or edges
        setNodes((nds) => {
          const selectedNodes = nds.filter((n) => n.selected);
          if (selectedNodes.length === 0) return nds;

          const remainingNodes = nds.filter((n) => !n.selected);
          const selectedIds = new Set(selectedNodes.map((n) => n.id));

          setEdges((eds) => {
            const remainingEdges = eds.filter(
              (ed) => !ed.selected && !selectedIds.has(ed.source) && !selectedIds.has(ed.target)
            );
            pushHistorySnapshot(remainingNodes, remainingEdges);
            return remainingEdges;
          });

          return remainingNodes;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, pushHistorySnapshot, setEdges, setNodes]);

  // Clear Canvas
  const handleClear = useCallback(() => {
    if (nodes.length === 0) return;
    if (window.confirm('Are you sure you want to clear this entire canvas?')) {
      setNodes([]);
      setEdges([]);
      pushHistorySnapshot([], []);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [nodes.length, pushHistorySnapshot, setEdges, setNodes]);

  // Export JSON
  const handleExport = useCallback(() => {
    const payload = {
      title: boardTitle,
      exportedAt: new Date().toISOString(),
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
          title: n.data.title,
          content: n.data.content,
          category: n.data.category,
        },
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${boardTitle.toLowerCase().replace(/\s+/g, '_')}_canvas.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [boardTitle, edges, nodes]);

  // Import JSON
  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.nodes && Array.isArray(parsed.nodes)) {
          const importedNodes = parsed.nodes.map(prepareNode);
          const importedEdges = (parsed.edges || []).map(prepareEdge);

          setNodes(importedNodes);
          setEdges(importedEdges);
          if (parsed.title) setBoardTitle(parsed.title);
          pushHistorySnapshot(importedNodes, importedEdges);

          setTimeout(() => {
            fitView({ padding: 0.25, duration: 600 });
          }, 100);
        }
      } catch (err) {
        alert('Invalid canvas JSON file.');
      }
    };
    reader.readAsText(file);
  }, [fitView, prepareEdge, prepareNode, pushHistorySnapshot, setEdges, setNodes]);

  // Apply updates from Gemini 3 Flash
  const handleApplyGeminiGraph = useCallback((
    newNodes: SerializableNode[],
    newEdges: SerializableEdge[],
    explanation: string
  ) => {
    const preparedNewNodes = newNodes.map(prepareNode);
    const preparedNewEdges = newEdges.map(prepareEdge);

    setNodes((nds) => {
      // Unselect existing
      const unselected = nds.map((n) => ({ ...n, selected: false }));
      // Highlight new nodes
      const withNew = unselected.concat(
        preparedNewNodes.map((n) => ({ ...n, selected: true }))
      );

      setEdges((eds) => {
        const combinedEdges = eds.concat(preparedNewEdges);
        pushHistorySnapshot(withNew, combinedEdges);
        return combinedEdges;
      });

      return withNew;
    });

    setTimeout(() => {
      fitView({ padding: 0.25, duration: 800 });
    }, 150);
  }, [fitView, prepareEdge, prepareNode, pushHistorySnapshot, setEdges, setNodes]);

  // Find currently selected node (if exactly 1 selected) for Gemini modal context
  const selectedNode = useMemo(() => {
    const selected = nodes.filter((n) => n.selected);
    if (selected.length === 1) {
      const s = selected[0];
      return {
        id: s.id,
        type: 'customCard' as const,
        position: s.position,
        data: s.data,
      };
    }
    return null;
  }, [nodes]);

  const currentGraphPayload = useMemo((): CanvasStatePayload => {
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: 'customCard',
        position: n.position,
        data: {
          title: n.data.title,
          content: n.data.content,
          category: n.data.category,
        },
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label as string,
      })),
    };
  }, [nodes, edges]);

  return (
    <div 
      className="relative w-full h-full overflow-hidden select-none transition-colors duration-200"
      style={{
        backgroundColor: isDark ? '#161618' : '#F6F6F6',
      }}
    >
      {/* Top Action Toolbar */}
      <CanvasToolbar
        boardTitle={boardTitle}
        onTitleChange={setBoardTitle}
        onAddNode={handleAddNode}
        onOpenGemini={() => setIsGeminiOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onFitView={() => fitView({ padding: 0.2, duration: 600 })}
        onClear={handleClear}
        onExport={handleExport}
        onImport={handleImport}
        saveStatus={saveStatus}
        theme={theme}
        nodeCount={nodes.length}
      />

      {/* React Flow Infinite Canvas Engine */}
      <ReactFlow<Node<CanvasNodeData>, Edge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.1}
        maxZoom={2.0}
        selectionMode={SelectionMode.Partial}
        panOnScroll={false}
        selectionOnDrag={true}
        panOnDrag={[1, 2]} // Middle click or right click drag, or space drag
        zoomOnPinch={true}
        zoomOnScroll={true}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'customEdge',
          animated: true,
        }}
        className="w-full h-full"
      >
        {/* High-Precision Dot Grid */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color={isDark ? '#323236' : '#D4D4D8'}
        />

        {/* MiniMap (Bottom Right) */}
        <MiniMap
          position="bottom-right"
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            const cat = (node.data as any)?.category as NodeCategory;
            switch (cat) {
              case 'scripture': return '#F59E0B';
              case 'theological_point': return '#06B6D4';
              case 'historical_context': return '#8B5CF6';
              case 'illustration': return '#10B981';
              case 'application': return '#F43F5E';
              default: return isDark ? '#52525b' : '#a1a1aa';
            }
          }}
          maskColor={isDark ? 'rgba(22, 22, 24, 0.75)' : 'rgba(246, 246, 246, 0.75)'}
          className={`!rounded-xl !border shadow-xl !overflow-hidden ${
            isDark ? '!bg-[#1e1e22] !border-zinc-700/70' : '!bg-white !border-zinc-200'
          }`}
          style={{ width: 160, height: 110 }}
        />

        {/* Zoom Controls (Bottom Left) */}
        <Controls
          position="bottom-left"
          showInteractive={false}
          className={`!rounded-xl !border shadow-xl !overflow-hidden ${
            isDark 
              ? '!bg-[#1e1e22] !border-zinc-700/70 !text-zinc-200 [&>button]:!border-zinc-700 [&>button]:!bg-[#1e1e22] [&>button]:!fill-zinc-300 hover:[&>button]:!bg-zinc-800' 
              : '!bg-white !border-zinc-200 !text-zinc-700 [&>button]:!border-zinc-200 [&>button]:!bg-white [&>button]:!fill-zinc-600 hover:[&>button]:!bg-zinc-50'
          }`}
        />
      </ReactFlow>

      {/* Gemini 3 Flash Bidirectional Visual Assistant Modal */}
      <GeminiCanvasModal
        isOpen={isGeminiOpen}
        onClose={() => setIsGeminiOpen(false)}
        currentGraph={currentGraphPayload}
        selectedNode={selectedNode}
        onApplyGraphUpdate={handleApplyGeminiGraph}
        theme={theme}
      />
    </div>
  );
}

export function CanvasBoard(props: CanvasBoardProps) {
  return (
    <ReactFlowProvider>
      <InnerCanvasBoard {...props} />
    </ReactFlowProvider>
  );
}
