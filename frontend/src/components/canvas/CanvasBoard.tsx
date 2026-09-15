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
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { CustomCanvasNode } from './CustomCanvasNode';
import { CustomCanvasEdge } from './CustomCanvasEdge';
import { CanvasToolbar } from './CanvasToolbar';
import { CanvasSidebar } from './CanvasSidebar';
import { TheologicaAiCanvasModal } from './TheologicaAiCanvasModal';
import {
  NodeCategory,
  CanvasNodeData,
  SerializableNode,
  SerializableEdge,
  CanvasStatePayload,
  CanvasBoardMetadata,
  CATEGORY_METADATA,
} from '@/types/canvas';
import { 
  Sparkles, 
  Undo2, 
  Redo2, 
  Plus, 
  LayoutGrid, 
  Maximize2, 
  Trash2, 
  BookOpen, 
  Compass, 
  HelpCircle, 
  Lightbulb, 
  FileText,
  ChevronRight
} from 'lucide-react';
import { useModifierKey } from '@/lib/os';

interface CanvasBoardProps {
  theme?: 'dark' | 'light';
  incomingNode?: {
    title: string;
    content: string;
    category?: NodeCategory;
  } | null;
  onIncomingNodeHandled?: () => void;
}

const INITIAL_DEMO_NODES: SerializableNode[] = [
  {
    id: 'demo-scripture-1',
    type: 'customCard',
    position: { x: 140, y: 140 },
    data: {
      title: 'Romans 8:28',
      content: '> "And we know that in all things God works for the good of those who love him, who have been called according to his purpose."\n\n*Paul\'s foundational assurance of sovereign grace.*',
      category: 'scripture',
    },
  },
  {
    id: 'demo-theology-1',
    type: 'customCard',
    position: { x: 560, y: 80 },
    data: {
      title: 'Sovereign Providence',
      content: 'God orchestrates all earthly affairs, both pleasant and sorrowful, toward the eternal spiritual good of His elect. **All things** are subordinate to His sovereign redemptive decree.',
      category: 'theological_point',
    },
  },
  {
    id: 'demo-app-1',
    type: 'customCard',
    position: { x: 560, y: 340 },
    data: {
      title: 'Trust in Trials',
      content: '- Surrender anxiety over earthly uncertainties.\n- Cultivate persevering praise in hardship.\n- Anchor identity in God\'s eternal calling.',
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

interface HistorySnapshot {
  nodes: SerializableNode[];
  edges: SerializableEdge[];
}

function InnerCanvasBoard({
  theme = 'dark',
  incomingNode,
  onIncomingNodeHandled,
}: CanvasBoardProps) {
  const { fitView, screenToFlowPosition } = useReactFlow();
  const isDark = theme === 'dark';
  const mod = useModifierKey();

  // Pane Context Menu state
  const [paneContextMenu, setPaneContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [paneAddSubmenuOpen, setPaneAddSubmenuOpen] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as HTMLElement)) {
        setPaneContextMenu(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPaneContextMenu(null);
      }
    };
    if (paneContextMenu) {
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [paneContextMenu]);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CanvasNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [activeBoardId, setActiveBoardId] = useState('default');
  const [boardTitle, setBoardTitle] = useState('Romans 8 Study');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Boards List state
  const [boards, setBoards] = useState<CanvasBoardMetadata[]>([
    { id: 'default', title: 'Romans 8 Study', updatedAt: new Date().toISOString(), nodeCount: 3 }
  ]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Theologica AI Modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiToast, setAiToast] = useState<{ message: string; count: number } | null>(null);

  // Keep references to latest nodes & edges for stable callbacks
  const nodesRef = useRef<Node<CanvasNodeData>[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Undo / Redo history engine
  const historyRef = useRef<HistorySnapshot[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoActive = useRef(false);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateHistoryState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Converts live React Flow nodes to lightweight SerializableNode[]
  const toSerializableNodes = useCallback((nds: Node<CanvasNodeData>[]): SerializableNode[] => {
    return nds.map((n) => ({
      id: n.id,
      type: 'customCard',
      position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
      data: {
        title: n.data.title,
        content: n.data.content,
        category: n.data.category,
        color: n.data.color,
        tags: n.data.tags,
      },
      style: n.style as React.CSSProperties | undefined,
    }));
  }, []);

  // Converts live React Flow edges to lightweight SerializableEdge[]
  const toSerializableEdges = useCallback((eds: Edge[]): SerializableEdge[] => {
    return eds.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label as string | undefined,
      animated: e.animated,
    }));
  }, []);

  // Push snapshot to undo stack
  const pushSnapshot = useCallback((
    newNodes?: Node<CanvasNodeData>[],
    newEdges?: Edge[]
  ) => {
    if (isUndoRedoActive.current) {
      isUndoRedoActive.current = false;
      return;
    }

    const currentNodes = newNodes || nodesRef.current;
    const currentEdges = newEdges || edgesRef.current;

    const snapNodes = toSerializableNodes(currentNodes);
    const snapEdges = toSerializableEdges(currentEdges);

    // Don't push duplicate if identical to last snapshot
    const lastSnap = historyRef.current[historyIndexRef.current];
    if (lastSnap) {
      const isSameNodes = JSON.stringify(lastSnap.nodes) === JSON.stringify(snapNodes);
      const isSameEdges = JSON.stringify(lastSnap.edges) === JSON.stringify(snapEdges);
      if (isSameNodes && isSameEdges) {
        return;
      }
    }

    // Slice history at current index
    const trimmed = historyRef.current.slice(0, historyIndexRef.current + 1);
    trimmed.push({ nodes: snapNodes, edges: snapEdges });

    // Limit stack size to 35
    if (trimmed.length > 35) {
      trimmed.shift();
    }

    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
    updateHistoryState();
  }, [toSerializableNodes, toSerializableEdges, updateHistoryState]);

  // Node action callbacks (memoized with stable references)
  const handleUpdateNode = useCallback((id: string, updates: Partial<CanvasNodeData>) => {
    setNodes((nds) => {
      const next = nds.map((n) => {
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
      pushSnapshot(next, edgesRef.current);
      return next;
    });
  }, [pushSnapshot, setNodes]);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => {
      const remainingNodes = nds.filter((n) => n.id !== id);
      setEdges((eds) => {
        const remainingEdges = eds.filter((e) => e.source !== id && e.target !== id);
        pushSnapshot(remainingNodes, remainingEdges);
        return remainingEdges;
      });
      return remainingNodes;
    });
  }, [pushSnapshot, setEdges, setNodes]);

  const handleDuplicateNode: (id: string) => void = useCallback((id: string) => {
    const target = nodesRef.current.find((n) => n.id === id);
    if (!target) return;

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

    setNodes((nds) => {
      const next: Node<CanvasNodeData>[] = [
        ...nds.map((n) => ({ ...n, selected: false })),
        duplicated,
      ];
      pushSnapshot(next, edgesRef.current);
      return next;
    });
  }, [handleDeleteNode, handleUpdateNode, pushSnapshot, setNodes, theme]);

  // Connect source card to target card (from card options menu)
  const handleConnectTo = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const edgeId = `edge-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newEdge: Edge = {
      id: edgeId,
      source: sourceId,
      target: targetId,
      type: 'customEdge',
      label: 'Connected',
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isDark ? '#a1a1aa' : '#71717a',
        width: 16,
        height: 16,
      },
    };

    setEdges((eds) => {
      if (eds.some((e) => e.source === sourceId && e.target === targetId)) {
        return eds;
      }
      const next = [...eds, newEdge];
      pushSnapshot(nodesRef.current, next);
      return next;
    });
  }, [isDark, pushSnapshot, setEdges]);

  // Auto Arrange all cards into clean hierarchical columns
  const handleAutoArrange = useCallback(() => {
    if (nodesRef.current.length === 0) return;

    const currentNodes = nodesRef.current;
    const currentEdges = edgesRef.current;

    const COL_STEP = 460;
    const ROW_STEP = 340;

    // Calculate in-degrees for topological rank
    const inDegree: Record<string, number> = {};
    currentNodes.forEach((n) => { inDegree[n.id] = 0; });
    currentEdges.forEach((e) => {
      if (inDegree[e.target] !== undefined) {
        inDegree[e.target] = (inDegree[e.target] || 0) + 1;
      }
    });

    const columns: string[][] = [];
    const hasEdges = currentEdges.length > 0;

    if (hasEdges) {
      const ranks: Record<string, number> = {};
      const queue: string[] = [];

      currentNodes.forEach((n) => {
        if (inDegree[n.id] === 0) {
          ranks[n.id] = 0;
          queue.push(n.id);
        }
      });

      if (queue.length === 0 && currentNodes.length > 0) {
        ranks[currentNodes[0].id] = 0;
        queue.push(currentNodes[0].id);
      }

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const currRank = ranks[curr];
        currentEdges.filter(e => e.source === curr).forEach(e => {
          const nextRank = Math.max(ranks[e.target] || 0, currRank + 1);
          ranks[e.target] = nextRank;
          if (!queue.includes(e.target)) {
            queue.push(e.target);
          }
        });
      }

      currentNodes.forEach((n) => {
        if (ranks[n.id] === undefined) {
          ranks[n.id] = 0;
        }
      });

      currentNodes.forEach((n) => {
        const r = Math.min(ranks[n.id] || 0, 4);
        while (columns.length <= r) columns.push([]);
        columns[r].push(n.id);
      });
    } else {
      const col0: string[] = [];
      const col1: string[] = [];
      const col2: string[] = [];

      currentNodes.forEach((n) => {
        const cat = n.data.category;
        if (cat === 'scripture' || cat === 'historical_context') {
          col0.push(n.id);
        } else if (cat === 'illustration' || cat === 'application') {
          col2.push(n.id);
        } else {
          col1.push(n.id);
        }
      });

      [col0, col1, col2].filter(c => c.length > 0).forEach(c => columns.push(c));
    }

    if (columns.length === 0) {
      columns.push(currentNodes.map(n => n.id));
    }

    const maxRows = Math.max(...columns.map(c => c.length), 1);
    const totalHeight = (maxRows - 1) * ROW_STEP;
    const baseX = 100;
    const baseY = 100;

    const nodePosMap: Record<string, { x: number; y: number }> = {};
    columns.forEach((colNodes, colIndex) => {
      const colHeight = (colNodes.length - 1) * ROW_STEP;
      const startY = baseY + (totalHeight - colHeight) / 2;

      colNodes.forEach((nodeId, rowIndex) => {
        nodePosMap[nodeId] = {
          x: Math.round(baseX + colIndex * COL_STEP),
          y: Math.round(startY + rowIndex * ROW_STEP),
        };
      });
    });

    setNodes((nds) => {
      const arranged = nds.map((n) => {
        const newPos = nodePosMap[n.id];
        return newPos ? { ...n, position: newPos } : n;
      });
      pushSnapshot(arranged, edgesRef.current);
      return arranged;
    });

    setTimeout(() => {
      fitView({ padding: 0.2, duration: 600 });
    }, 100);
  }, [fitView, pushSnapshot, setNodes]);

  // Format node helper
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
        onConnectTo: handleConnectTo,
      },
      style: raw.style,
    };
  }, [handleDeleteNode, handleDuplicateNode, handleUpdateNode, handleConnectTo, theme]);

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

  // Load a specific board by ID
  const loadBoardData = useCallback(async (boardId: string) => {
    let loadedNodes: SerializableNode[] = INITIAL_DEMO_NODES;
    let loadedEdges: SerializableEdge[] = INITIAL_DEMO_EDGES;
    let loadedTitle = 'Romans 8 Study';

    // 1. Try local storage
    try {
      const local = localStorage.getItem(`theologica_canvas_state_${boardId}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed.nodes && parsed.nodes.length > 0) {
          loadedNodes = parsed.nodes;
          loadedEdges = parsed.edges || [];
          if (parsed.title) loadedTitle = parsed.title;
        }
      }
    } catch (e) {
      console.warn('LocalStorage canvas parse error:', e);
    }

    // Set state
    const pNodes = loadedNodes.map(prepareNode);
    const pEdges = loadedEdges.map(prepareEdge);

    setNodes(pNodes);
    setEdges(pEdges);
    setBoardTitle(loadedTitle);

    // Initialize history with this board's starting state
    historyRef.current = [{
      nodes: toSerializableNodes(pNodes),
      edges: toSerializableEdges(pEdges),
    }];
    historyIndexRef.current = 0;
    updateHistoryState();

    // 2. Fetch remote update in background
    try {
      const res = await fetch(`/api/canvas?id=${boardId}`);
      if (res.ok) {
        const remote = await res.json();
        if (remote.nodes && remote.nodes.length > 0 && !localStorage.getItem(`theologica_canvas_state_${boardId}`)) {
          const rNodes = remote.nodes.map(prepareNode);
          const rEdges = (remote.edges || []).map(prepareEdge);
          setNodes(rNodes);
          setEdges(rEdges);
          if (remote.title) setBoardTitle(remote.title);
          historyRef.current = [{
            nodes: toSerializableNodes(rNodes),
            edges: toSerializableEdges(rEdges),
          }];
          historyIndexRef.current = 0;
          updateHistoryState();
        }
      }
    } catch {
      // Offline fallback is fine
    }

    setTimeout(() => {
      fitView({ padding: 0.25, duration: 500 });
    }, 120);
  }, [fitView, prepareEdge, prepareNode, toSerializableEdges, toSerializableNodes, updateHistoryState, setNodes, setEdges]);

  // Load boards list and initial board on mount
  useEffect(() => {
    // 1. Load boards index from localStorage
    try {
      const localList = localStorage.getItem('theologica_canvas_boards_list_v1');
      if (localList) {
        const parsed = JSON.parse(localList);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBoards(parsed);
        }
      }
    } catch {
      // Ignore
    }

    // 2. Fetch boards list from API
    fetch('/api/canvas?list=true')
      .then((res) => res.json())
      .then((remoteList) => {
        if (Array.isArray(remoteList) && remoteList.length > 0) {
          setBoards(remoteList);
          localStorage.setItem('theologica_canvas_boards_list_v1', JSON.stringify(remoteList));
        }
      })
      .catch(() => {});

    // Load initial active board
    loadBoardData('default');
  }, []); // Run once on mount

  // Sync theme changes to nodes
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

  // Auto-save debounce for current board
  useEffect(() => {
    if (nodes.length === 0) return;

    setSaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        const payload: CanvasStatePayload & { title: string; updatedAt: string } = {
          title: boardTitle,
          nodes: toSerializableNodes(nodes),
          edges: toSerializableEdges(edges),
          updatedAt: new Date().toISOString(),
        };

        // Cache locally
        localStorage.setItem(`theologica_canvas_state_${activeBoardId}`, JSON.stringify(payload));

        // Update boards index list
        setBoards((prev) => {
          const updated = prev.map((b) =>
            b.id === activeBoardId
              ? { ...b, title: boardTitle, nodeCount: nodes.length, updatedAt: payload.updatedAt }
              : b
          );
          localStorage.setItem('theologica_canvas_boards_list_v1', JSON.stringify(updated));
          return updated;
        });

        // Sync with API
        fetch('/api/canvas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: activeBoardId,
            title: boardTitle,
            nodes: payload.nodes,
            edges: payload.edges,
          }),
        }).catch(() => {});

        setSaveStatus('saved');
      } catch (err) {
        console.error('Error auto-saving canvas:', err);
        setSaveStatus('unsaved');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [nodes, edges, boardTitle, activeBoardId, toSerializableNodes, toSerializableEdges]);

  // Handle incoming node from Bible reader or AI chat
  useEffect(() => {
    if (!incomingNode) return;

    const timestamp = Date.now();
    const newId = `card-incoming-${timestamp}`;

    let posX = 140;
    let posY = 140;
    if (nodes.length > 0) {
      let maxX = -Infinity;
      for (const n of nodes) {
        if (n.position.x > maxX) maxX = n.position.x;
      }
      posX = maxX + 380;
      posY = 140;
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
      const next: Node<CanvasNodeData>[] = [
        ...nds.map((n) => ({ ...n, selected: false })),
        newNode,
      ];
      pushSnapshot(next, edgesRef.current);
      return next;
    });

    if (onIncomingNodeHandled) {
      onIncomingNodeHandled();
    }

    setTimeout(() => {
      fitView({ padding: 0.25, duration: 600 });
    }, 120);
  }, [incomingNode, nodes, theme, handleUpdateNode, handleDuplicateNode, handleDeleteNode, onIncomingNodeHandled, pushSnapshot, fitView, setNodes]);

  // Add card from toolbar or context menu
  const handleAddNode = useCallback((category: NodeCategory, customPos?: { x: number; y: number }) => {
    const timestamp = Date.now();
    const newId = `card-${timestamp}`;

    let posX = customPos ? customPos.x : 200;
    let posY = customPos ? customPos.y : 200;

    if (!customPos && nodes.length > 0) {
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
      const next: Node<CanvasNodeData>[] = [
        ...nds.map((n) => ({ ...n, selected: false })),
        newNode,
      ];
      pushSnapshot(next, edgesRef.current);
      return next;
    });
  }, [nodes, theme, handleUpdateNode, handleDuplicateNode, handleDeleteNode, pushSnapshot, setNodes]);

  // Connecting edges
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return; // Prevent self-connections

    setEdges((eds) => {
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

      const next = addEdge(newEdge, eds);
      pushSnapshot(nodesRef.current, next);
      return next;
    });
  }, [isDark, pushSnapshot, setEdges]);

  // Capture drag stop so moving nodes can be undone!
  const onNodeDragStop = useCallback(() => {
    pushSnapshot(nodesRef.current, edgesRef.current);
  }, [pushSnapshot]);

  // Capture node delete
  const onNodesDelete = useCallback((deleted: Node[]) => {
    const deletedIds = new Set(deleted.map((n) => n.id));
    const nextNodes = nodesRef.current.filter((n) => !deletedIds.has(n.id));
    const nextEdges = edgesRef.current.filter(
      (e) => !deletedIds.has(e.source) && !deletedIds.has(e.target)
    );
    pushSnapshot(nextNodes, nextEdges);
  }, [pushSnapshot]);

  // Capture edge delete
  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    const deletedIds = new Set(deleted.map((e) => e.id));
    const nextEdges = edgesRef.current.filter((e) => !deletedIds.has(e.id));
    pushSnapshot(nodesRef.current, nextEdges);
  }, [pushSnapshot]);

  // UNDO implementation
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;

    isUndoRedoActive.current = true;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];

    if (!snapshot) return;

    const restoredNodes = snapshot.nodes.map(prepareNode);
    const restoredEdges = snapshot.edges.map(prepareEdge);

    setNodes(restoredNodes);
    setEdges(restoredEdges);
    updateHistoryState();
  }, [prepareEdge, prepareNode, setEdges, setNodes, updateHistoryState]);

  // REDO implementation
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;

    isUndoRedoActive.current = true;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];

    if (!snapshot) return;

    const restoredNodes = snapshot.nodes.map(prepareNode);
    const restoredEdges = snapshot.edges.map(prepareEdge);

    setNodes(restoredNodes);
    setEdges(restoredEdges);
    updateHistoryState();
  }, [prepareEdge, prepareNode, setEdges, setNodes, updateHistoryState]);

  // Global Keyboard Shortcuts (Cmd+Z, Cmd+Shift+Z, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        const selectedNodes = nodesRef.current.filter((n) => n.selected);
        const selectedEdges = edgesRef.current.filter((ed) => ed.selected);

        if (selectedNodes.length === 0 && selectedEdges.length === 0) return;

        const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
        const selectedEdgeIds = new Set(selectedEdges.map((e) => e.id));

        const nextNodes = nodesRef.current.filter((n) => !selectedNodeIds.has(n.id));
        const nextEdges = edgesRef.current.filter(
          (e) => !selectedEdgeIds.has(e.id) && !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)
        );

        setNodes(nextNodes);
        setEdges(nextEdges);
        pushSnapshot(nextNodes, nextEdges);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, pushSnapshot, setEdges, setNodes]);

  // Clear Canvas
  const handleClear = useCallback(() => {
    if (nodes.length === 0) return;
    if (window.confirm('Clear all cards on this board? You can undo this action.')) {
      setNodes([]);
      setEdges([]);
      pushSnapshot([], []);
    }
  }, [nodes.length, pushSnapshot, setEdges, setNodes]);

  // Sidebar Board Switcher Handlers
  const handleSelectBoard = useCallback((boardId: string) => {
    if (boardId === activeBoardId) return;
    setActiveBoardId(boardId);
    loadBoardData(boardId);
  }, [activeBoardId, loadBoardData]);

  const handleCreateBoard = useCallback(() => {
    const timestamp = Date.now();
    const newId = `board-${timestamp}`;
    const newBoardMeta: CanvasBoardMetadata = {
      id: newId,
      title: 'New Canvas',
      updatedAt: new Date().toISOString(),
      nodeCount: 0,
    };

    const nextBoards = [newBoardMeta, ...boards];
    setBoards(nextBoards);
    localStorage.setItem('theologica_canvas_boards_list_v1', JSON.stringify(nextBoards));

    setActiveBoardId(newId);
    setBoardTitle('New Canvas');
    setNodes([]);
    setEdges([]);

    historyRef.current = [{ nodes: [], edges: [] }];
    historyIndexRef.current = 0;
    updateHistoryState();

    // Persist empty board to API
    fetch('/api/canvas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newId,
        title: 'New Canvas',
        nodes: [],
        edges: [],
      }),
    }).catch(() => {});
  }, [boards, updateHistoryState, setNodes, setEdges]);

  const handleRenameBoard = useCallback((id: string, newTitle: string) => {
    if (id === activeBoardId) {
      setBoardTitle(newTitle);
    }
    setBoards((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, title: newTitle } : b));
      localStorage.setItem('theologica_canvas_boards_list_v1', JSON.stringify(next));
      return next;
    });

    fetch('/api/canvas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        title: newTitle,
        nodes: toSerializableNodes(nodesRef.current),
        edges: toSerializableEdges(edgesRef.current),
      }),
    }).catch(() => {});
  }, [activeBoardId, toSerializableEdges, toSerializableNodes]);

  const handleDeleteBoard = useCallback((id: string) => {
    const remaining = boards.filter((b) => b.id !== id);
    if (remaining.length === 0) return;

    setBoards(remaining);
    localStorage.setItem('theologica_canvas_boards_list_v1', JSON.stringify(remaining));
    localStorage.removeItem(`theologica_canvas_state_${id}`);

    // Call API delete
    fetch(`/api/canvas?id=${id}`, { method: 'DELETE' }).catch(() => {});

    // If active was deleted, switch to first remaining board
    if (id === activeBoardId) {
      const nextActive = remaining[0].id;
      setActiveBoardId(nextActive);
      loadBoardData(nextActive);
    }
  }, [boards, activeBoardId, loadBoardData]);

  // Apply updates from Theologica AI
  const handleApplyAiGraph = useCallback((
    newNodes: SerializableNode[],
    newEdges: SerializableEdge[],
    explanation: string
  ) => {
    const preparedNewNodes = newNodes.map(prepareNode);
    const preparedNewEdges = newEdges.map(prepareEdge);

    const nextNodes: Node<CanvasNodeData>[] = [
      ...nodesRef.current.map((n) => ({ ...n, selected: false })),
      ...preparedNewNodes.map((n) => ({ ...n, selected: true })),
    ];
    const nextEdges = edgesRef.current.concat(preparedNewEdges);

    setNodes(nextNodes);
    setEdges(nextEdges);
    pushSnapshot(nextNodes, nextEdges);

    setAiToast({
      message: explanation || `Theologica AI added ${newNodes.length} cards to your canvas.`,
      count: newNodes.length,
    });
    setTimeout(() => setAiToast(null), 6000);

    setTimeout(() => {
      fitView({ padding: 0.25, duration: 800 });
    }, 150);
  }, [fitView, prepareEdge, prepareNode, pushSnapshot, setEdges, setNodes]);

  // Target selected node for AI expansion
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
      nodes: toSerializableNodes(nodes),
      edges: toSerializableEdges(edges),
    };
  }, [nodes, edges, toSerializableNodes, toSerializableEdges]);

  // Node & Edge types
  const nodeTypes = useMemo(() => ({ customCard: CustomCanvasNode }), []);
  const edgeTypes = useMemo(() => ({ customEdge: CustomCanvasEdge }), []);

  // Enrich live nodes with otherNodes summary list for the "Add Connection" card menu
  const displayNodes = useMemo(() => {
    const summary = nodes.map((n) => ({
      id: n.id,
      title: n.data.title || 'Untitled Card',
      category: (n.data.category || 'general') as NodeCategory,
    }));

    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        theme,
        onUpdate: handleUpdateNode,
        onDuplicate: handleDuplicateNode,
        onDelete: handleDeleteNode,
        onConnectTo: handleConnectTo,
        otherNodes: summary.filter((s) => s.id !== n.id),
      },
    }));
  }, [nodes, theme, handleUpdateNode, handleDuplicateNode, handleDeleteNode, handleConnectTo]);

  return (
    <div 
      className="relative w-full h-full overflow-hidden select-none transition-colors duration-200"
      style={{
        backgroundColor: isDark ? '#161618' : '#F6F6F6',
      }}
    >
      {/* Canvases Sidebar */}
      <CanvasSidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        boards={boards}
        activeBoardId={activeBoardId}
        onSelectBoard={handleSelectBoard}
        onCreateBoard={handleCreateBoard}
        onRenameBoard={handleRenameBoard}
        onDeleteBoard={handleDeleteBoard}
        theme={theme}
      />

      {/* Top Action Toolbar */}
      <CanvasToolbar
        boardTitle={boardTitle}
        onTitleChange={(t) => handleRenameBoard(activeBoardId, t)}
        onAddNode={handleAddNode}
        onOpenAi={() => setIsAiModalOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onFitView={() => fitView({ padding: 0.2, duration: 600 })}
        onAutoArrange={handleAutoArrange}
        onClear={handleClear}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        saveStatus={saveStatus}
        theme={theme}
        nodeCount={nodes.length}
      />

      {/* React Flow Canvas Engine */}
      <ReactFlow<Node<CanvasNodeData>, Edge>
        nodes={displayNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onPaneContextMenu={(event) => {
          event.preventDefault();
          setPaneContextMenu({ x: event.clientX, y: event.clientY });
          setPaneAddSubmenuOpen(false);
        }}
        onPaneClick={() => {
          if (paneContextMenu) setPaneContextMenu(null);
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.1}
        maxZoom={2.0}
        selectionMode={SelectionMode.Partial}
        panOnScroll={false}
        selectionOnDrag={true}
        panOnDrag={[1, 2]}
        zoomOnPinch={true}
        zoomOnScroll={true}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'customEdge',
          animated: true,
        }}
        className="w-full h-full"
      >
        {/* Dot Grid */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color={isDark ? '#323236' : '#D4D4D8'}
        />

        {/* MiniMap */}
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

        {/* Zoom Controls */}
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

      {/* Canvas Pane Right-Click Context Menu */}
      {paneContextMenu && (
        <div
          ref={contextMenuRef}
          style={{ 
            left: Math.min(paneContextMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 220), 
            top: Math.min(paneContextMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 280) 
          }}
          className={`fixed z-50 w-52 rounded-xl shadow-2xl border p-1.5 animate-in fade-in-50 zoom-in-95 backdrop-blur-md select-none ${
            isDark ? 'bg-[#222226]/95 border-zinc-700 text-zinc-200' : 'bg-white/95 border-zinc-200 text-zinc-800 shadow-xl'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">
            Canvas Options
          </div>

          {/* Add Card Submenu */}
          <div>
            <button
              type="button"
              onClick={() => setPaneAddSubmenuOpen(!paneAddSubmenuOpen)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Plus size={14} className="text-accent" />
                <span>Add Card...</span>
              </div>
              <ChevronRight size={12} className={`text-zinc-400 transition-transform ${paneAddSubmenuOpen ? 'rotate-90' : ''}`} />
            </button>

            {paneAddSubmenuOpen && (
              <div className={`my-1 py-1 pl-2 border-l space-y-0.5 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                {(Object.keys(CATEGORY_METADATA) as NodeCategory[]).map((cat) => {
                  const meta = CATEGORY_METADATA[cat];
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        const flowPos = screenToFlowPosition({ x: paneContextMenu.x, y: paneContextMenu.y });
                        handleAddNode(cat, flowPos);
                        setPaneContextMenu(null);
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors cursor-pointer text-left ${
                        isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-800'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: meta.accent }} />
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Theologica AI */}
          <button
            type="button"
            onClick={() => {
              setPaneContextMenu(null);
              setIsAiModalOpen(true);
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isDark ? 'hover:bg-zinc-800 text-amber-300' : 'hover:bg-amber-50 text-amber-700'
            }`}
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>Theologica AI</span>
          </button>

          <div className={`border-t my-1 ${isDark ? 'border-zinc-700/60' : 'border-zinc-200'}`} />

          {/* Auto Arrange */}
          <button
            type="button"
            onClick={() => {
              setPaneContextMenu(null);
              handleAutoArrange();
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-800'
            }`}
          >
            <LayoutGrid size={14} />
            <span>Auto Arrange</span>
          </button>

          {/* Fit View */}
          <button
            type="button"
            onClick={() => {
              setPaneContextMenu(null);
              fitView({ padding: 0.2, duration: 600 });
            }}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-800'
            }`}
          >
            <Maximize2 size={14} />
            <span>Fit to View</span>
          </button>

          <div className={`border-t my-1 ${isDark ? 'border-zinc-700/60' : 'border-zinc-200'}`} />

          {/* Undo */}
          <button
            type="button"
            disabled={!canUndo}
            onClick={() => {
              setPaneContextMenu(null);
              handleUndo();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              canUndo 
                ? (isDark ? 'hover:bg-zinc-800 text-zinc-300 cursor-pointer' : 'hover:bg-zinc-100 text-zinc-800 cursor-pointer')
                : 'opacity-40 cursor-not-allowed text-zinc-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <Undo2 size={14} />
              <span>Undo</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">{mod.symbol}Z</span>
          </button>

          {/* Redo */}
          <button
            type="button"
            disabled={!canRedo}
            onClick={() => {
              setPaneContextMenu(null);
              handleRedo();
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              canRedo 
                ? (isDark ? 'hover:bg-zinc-800 text-zinc-300 cursor-pointer' : 'hover:bg-zinc-100 text-zinc-800 cursor-pointer')
                : 'opacity-40 cursor-not-allowed text-zinc-500'
            }`}
          >
            <div className="flex items-center gap-2">
              <Redo2 size={14} />
              <span>Redo</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">{mod.symbol}{mod.shift}Z</span>
          </button>
        </div>
      )}

      {/* Floating Theologica AI Success Toast */}
      {aiToast && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#1e1e22]/95 border border-accent/60 shadow-2xl text-xs text-white backdrop-blur-md animate-in fade-in slide-in-from-bottom-3">
          <Sparkles size={15} className="text-accent animate-pulse shrink-0" />
          <span className="font-medium">{aiToast.message}</span>
          <button
            type="button"
            onClick={() => {
              handleUndo();
              setAiToast(null);
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            <Undo2 size={12} />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Theologica AI Canvas Architect Modal */}
      <TheologicaAiCanvasModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        currentGraph={currentGraphPayload}
        selectedNode={selectedNode}
        onApplyGraphUpdate={handleApplyAiGraph}
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
