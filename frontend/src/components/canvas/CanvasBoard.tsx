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
import { AddVerseToCanvasModal } from './AddVerseToCanvasModal';
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
  ChevronRight,
  Workflow
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
  isActiveTab?: boolean;
  onNavigateToVerse?: (book: string, chapter: number, verse: number) => void;
}

interface HistorySnapshot {
  nodes: SerializableNode[];
  edges: SerializableEdge[];
}

// Calculate dynamic node width based on React Flow DOM measurements, style, or standard card base width
function getNodeWidth(node: Node<CanvasNodeData> | SerializableNode): number {
  if ('measured' in node && typeof node.measured?.width === 'number' && node.measured.width > 100) {
    return Math.round(node.measured.width);
  }
  const styleW = node.style?.width;
  if (typeof styleW === 'number' && styleW > 100) {
    return Math.round(styleW);
  }
  if (typeof styleW === 'string') {
    const parsed = parseFloat(styleW);
    if (!isNaN(parsed) && parsed > 100) return Math.round(parsed);
  }
  return 380;
}

// Calculate dynamic node height based on React Flow DOM measurements or content-length estimation
function getNodeHeight(node: Node<CanvasNodeData> | SerializableNode): number {
  // 1. If React Flow has measured the node DOM height, use it directly
  if ('measured' in node && typeof node.measured?.height === 'number' && node.measured.height > 80) {
    return Math.round(node.measured.height);
  }

  // 2. If style height was explicitly set (e.g. via resizer)
  if (node.style && typeof node.style.height === 'number' && node.style.height > 80) {
    return Math.round(node.style.height);
  }

  // 3. Fallback content-based height estimation for unmeasured or newly added cards
  const title = node.data?.title || '';
  const content = node.data?.content || '';
  const tags = (node.data as any)?.tags || [];

  // Base card chrome: header (~54px) + body padding (~28px) + footer accent strip (4px) + borders
  let estimatedHeight = 90;

  // Title wrapping (explicit newlines or average ~26 characters per line in title textarea)
  const rawTitleLines = title.split('\n');
  let titleLines = 0;
  for (const tLine of rawTitleLines) {
    titleLines += Math.max(1, Math.ceil(tLine.length / 26));
  }
  if (titleLines > 1) {
    estimatedHeight += (titleLines - 1) * 22;
  }

  // Tags pill row
  if (Array.isArray(tags) && tags.length > 0) {
    estimatedHeight += 32;
  }

  // Markdown body content
  if (content.trim()) {
    const rawLines = content.split('\n');
    let visualLines = 0;

    for (const line of rawLines) {
      const trimmed = line.trim();
      if (!trimmed) {
        visualLines += 0.6; // paragraph spacing
        continue;
      }
      // In a 380px wide card with 14px font, average ~44 characters fit per line
      const wrapped = Math.max(1, Math.ceil(trimmed.length / 44));
      visualLines += wrapped;

      // Markdown headings have larger font and margin
      if (trimmed.startsWith('#')) {
        visualLines += 0.8;
      }
      // Blockquotes and callouts have vertical padding
      if (trimmed.startsWith('>')) {
        visualLines += 0.6;
      }
      // Bullet items have slight vertical spacing
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\./.test(trimmed)) {
        visualLines += 0.3;
      }
    }

    // Line height is approximately 24px in Tailwind prose-sm
    estimatedHeight += Math.round(visualLines * 24);
  } else {
    // Empty placeholder height
    estimatedHeight += 60;
  }

  // Bounded minimum card height and upper safety limit
  return Math.max(200, Math.min(estimatedHeight, 1800));
}

// Optimal handle selector: connects side-to-side across columns or top-to-bottom in same column
function getOptimalHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number }
): { sourceHandle: string; targetHandle: string } {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;

  // When target is distinctly to the right (standard column progression across generous 240px gap)
  if (dx >= 160) {
    return { sourceHandle: 'right-source', targetHandle: 'left-target' };
  }
  // When target is distinctly to the left
  if (dx <= -160) {
    return { sourceHandle: 'left-source', targetHandle: 'right-target' };
  }
  // When in same column and target is below
  if (dy >= 50) {
    return { sourceHandle: 'bottom-source', targetHandle: 'top-target' };
  }
  // When in same column and target is above
  if (dy <= -50) {
    return { sourceHandle: 'top-source', targetHandle: 'bottom-target' };
  }

  return { sourceHandle: 'right-source', targetHandle: 'left-target' };
}

function InnerCanvasBoard({
  theme = 'dark',
  incomingNode,
  onIncomingNodeHandled,
  isActiveTab = true,
  onNavigateToVerse,
}: CanvasBoardProps) {
  const { fitView, setViewport, getViewport, screenToFlowPosition } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const currentViewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const isDark = theme === 'dark';
  const mod = useModifierKey();
  const [isAddVerseModalOpen, setIsAddVerseModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobileQuery = window.matchMedia('(max-width: 768px)').matches;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(mobileQuery || hasTouch);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Viewport restoration & activation when switching to the canvas tab
  useEffect(() => {
    if (!isActiveTab) return;

    const timer = setTimeout(() => {
      if (!containerRef.current || containerRef.current.clientWidth <= 100) return;

      if (currentViewportRef.current && currentViewportRef.current.zoom >= 0.25) {
        setViewport(currentViewportRef.current, { duration: 250 });
      } else {
        fitView({ padding: isMobile ? 0.15 : 0.25, duration: 400, minZoom: 0.25, maxZoom: 1.1 });
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [isActiveTab, fitView, setViewport, isMobile]);

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

  // Persistence storage key constants
  const STORAGE_KEY_ACTIVE_BOARD = 'theologica_active_canvas_board_id';
  const STORAGE_KEY_BOARDS_LIST = 'theologica_canvas_boards_list_v1';
  const STORAGE_KEY_BOARD_PREFIX = 'theologica_canvas_state_';

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CanvasNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [activeBoardId, setActiveBoardId] = useState('');
  const [boardTitle, setBoardTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Boards List state
  const [boards, setBoards] = useState<CanvasBoardMetadata[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Theologica AI Modal state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiToast, setAiToast] = useState<{ message: string; count: number } | null>(null);

  // Keep references to latest nodes, edges, activeBoardId, boardTitle, and state flags
  const nodesRef = useRef<Node<CanvasNodeData>[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const activeBoardIdRef = useRef<string>('');
  const boardTitleRef = useRef<string>('');
  const isBoardLoadingRef = useRef<boolean>(false);
  const isDirtyRef = useRef<boolean>(false);

  nodesRef.current = nodes;
  edgesRef.current = edges;
  activeBoardIdRef.current = activeBoardId;
  boardTitleRef.current = boardTitle;

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
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
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
    const sourceNode = nodesRef.current.find((n) => n.id === sourceId);
    const targetNode = nodesRef.current.find((n) => n.id === targetId);
    const handles = sourceNode && targetNode
      ? getOptimalHandles(sourceNode.position, targetNode.position)
      : { sourceHandle: 'right-source', targetHandle: 'left-target' };

    const edgeId = `edge-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newEdge: Edge = {
      id: edgeId,
      source: sourceId,
      target: targetId,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      type: 'customEdge',
      label: 'Connected',
      animated: true,
      data: { theme },
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
  }, [isDark, theme, pushSnapshot, setEdges]);

  // Core Auto Arrange Algorithm: computes collision-free topological columns & optimal connection handles
  const arrangeGraph = useCallback((
    currentNodes: Node<CanvasNodeData>[],
    currentEdges: Edge[]
  ): { arrangedNodes: Node<CanvasNodeData>[]; arrangedEdges: Edge[] } => {
    if (currentNodes.length === 0) {
      return { arrangedNodes: currentNodes, arrangedEdges: currentEdges };
    }

    const HORIZONTAL_GAP = 320; // Generous Obsidian-style breathing room between side-to-side columns
    const VERTICAL_GAP = 110; // Spacious breathing room between cards in a column

    // Lookup map of current nodes for quick dimension queries
    const nodeMap: Record<string, Node<CanvasNodeData>> = {};
    currentNodes.forEach((n) => { nodeMap[n.id] = n; });

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
          const cat = n.data?.category;
          if (cat === 'scripture' || cat === 'historical_context') ranks[n.id] = 0;
          else if (cat === 'illustration' || cat === 'application') ranks[n.id] = 2;
          else ranks[n.id] = 1;
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

    const baseX = 140;
    const baseY = 120;

    // Calculate dynamic column widths based on the widest node in each column
    const colWidths: number[] = columns.map((colNodes) => {
      let maxW = 380;
      colNodes.forEach((nodeId) => {
        const node = nodeMap[nodeId];
        if (node) {
          const w = getNodeWidth(node);
          if (w > maxW) maxW = w;
        }
      });
      return maxW;
    });

    // Compute exact X starting position for each column, guaranteeing HORIZONTAL_GAP (320px) between columns
    const colXPositions: number[] = [];
    let currColX = baseX;
    for (let c = 0; c < columns.length; c++) {
      colXPositions.push(currColX);
      currColX += colWidths[c] + HORIZONTAL_GAP;
    }

    const nodePosMap: Record<string, { x: number; y: number }> = {};
    columns.forEach((colNodes, colIndex) => {
      const startY = baseY; // Clean, disciplined top alignment across all columns
      const colX = colXPositions[colIndex] ?? (baseX + colIndex * (380 + HORIZONTAL_GAP));

      let currentY = startY;
      colNodes.forEach((nodeId) => {
        const node = nodeMap[nodeId];
        const h = node ? getNodeHeight(node) : 260;

        nodePosMap[nodeId] = {
          x: Math.round(colX),
          y: Math.round(currentY),
        };

        currentY += h + VERTICAL_GAP;
      });
    });

    const arrangedNodes = currentNodes.map((n) => {
      const newPos = nodePosMap[n.id];
      return newPos
        ? {
            ...n,
            position: newPos,
            style: {
              width: n.style?.width || 380,
              ...n.style,
            },
          }
        : n;
    });

    // Update all edges to connect from optimal handles so lines never loop or obscure cards
    const arrangedEdges = currentEdges.map((edge) => {
      const sNode = arrangedNodes.find((n) => n.id === edge.source);
      const tNode = arrangedNodes.find((n) => n.id === edge.target);
      if (sNode && tNode) {
        const handles = getOptimalHandles(sNode.position, tNode.position);
        return {
          ...edge,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
        };
      }
      return edge;
    });

    return { arrangedNodes, arrangedEdges };
  }, []);

  // Auto Arrange all cards into clean hierarchical columns without vertical stacking/overlapping
  const handleAutoArrange = useCallback(() => {
    if (nodesRef.current.length === 0) return;
    const { arrangedNodes, arrangedEdges } = arrangeGraph(nodesRef.current, edgesRef.current);
    setNodes(arrangedNodes);
    setEdges(arrangedEdges);
    pushSnapshot(arrangedNodes, arrangedEdges);

    setTimeout(() => {
      if (containerRef.current && containerRef.current.clientWidth > 100) {
        fitView({ padding: 0.28, duration: 600, minZoom: 0.35, maxZoom: 1.1 });
      }
    }, 100);
  }, [arrangeGraph, fitView, pushSnapshot, setEdges, setNodes]);

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
        onVerseClick: onNavigateToVerse,
      },
      style: {
        width: raw.style?.width || (isMobile ? 310 : 380),
        ...raw.style,
      },
    };
  }, [handleDeleteNode, handleDuplicateNode, handleUpdateNode, handleConnectTo, onNavigateToVerse, theme, isMobile]);

  // Format edge helper
  const prepareEdge = useCallback((raw: SerializableEdge): Edge => {
    return {
      id: raw.id,
      source: raw.source,
      target: raw.target,
      sourceHandle: raw.sourceHandle,
      targetHandle: raw.targetHandle,
      type: 'customEdge',
      label: raw.label || 'Relates to',
      animated: raw.animated ?? true,
      data: { theme },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isDark ? '#a1a1aa' : '#71717a',
        width: 16,
        height: 16,
      },
    };
  }, [isDark, theme]);

  // Immediate board persistence helper (sync to localStorage, background sync to API)
  const saveBoardImmediate = useCallback((
    targetBoardId: string,
    titleToSave: string,
    nodesToSave: Node<CanvasNodeData>[],
    edgesToSave: Edge[]
  ) => {
    if (!targetBoardId) return;
    try {
      const serializableNodes = toSerializableNodes(nodesToSave);
      const serializableEdges = toSerializableEdges(edgesToSave);
      const updatedAt = new Date().toISOString();

      let vp = currentViewportRef.current;
      try {
        const liveVp = getViewport();
        if (liveVp && typeof liveVp.zoom === 'number' && liveVp.zoom >= 0.2) {
          vp = liveVp;
          currentViewportRef.current = liveVp;
        }
      } catch {}

      const payload: CanvasStatePayload & { id: string; title: string; updatedAt: string } = {
        id: targetBoardId,
        title: titleToSave,
        nodes: serializableNodes,
        edges: serializableEdges,
        viewport: vp || undefined,
        updatedAt,
      };

      // 1. Immediately persist to localStorage
      try {
        localStorage.setItem(`${STORAGE_KEY_BOARD_PREFIX}${targetBoardId}`, JSON.stringify(payload));
      } catch (lsErr) {
        console.warn('LocalStorage board save error:', lsErr);
      }

      // 2. Update boards index list in state & localStorage
      setBoards((prev) => {
        const idx = prev.findIndex((b) => b.id === targetBoardId);
        const metaItem: CanvasBoardMetadata = {
          id: targetBoardId,
          title: titleToSave,
          updatedAt,
          nodeCount: serializableNodes.length,
        };
        let next: CanvasBoardMetadata[];
        if (idx >= 0) {
          next = prev.map((b, i) => (i === idx ? metaItem : b));
        } else {
          next = [metaItem, ...prev];
        }
        try {
          localStorage.setItem(STORAGE_KEY_BOARDS_LIST, JSON.stringify(next));
        } catch {}
        return next;
      });

      // 3. Background sync to API (safe offline fallback)
      fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetBoardId,
          title: titleToSave,
          nodes: serializableNodes,
          edges: serializableEdges,
          viewport: vp || undefined,
        }),
      }).catch((err) => {
        console.warn('Canvas API sync error (offline preserved):', err);
      });

      setSaveStatus('saved');
      isDirtyRef.current = false;
    } catch (err) {
      console.error('Error saving board immediately:', err);
      setSaveStatus('unsaved');
    }
  }, [toSerializableNodes, toSerializableEdges, getViewport]);

  // Manual save trigger (e.g. Cmd+S or save button)
  const handleManualSave = useCallback(() => {
    saveBoardImmediate(
      activeBoardIdRef.current,
      boardTitleRef.current,
      nodesRef.current,
      edgesRef.current
    );
  }, [saveBoardImmediate]);

  // Load a specific board by ID with full local & remote fallback
  const loadBoardData = useCallback(async (boardId: string) => {
    if (!boardId) {
      isBoardLoadingRef.current = false;
      isDirtyRef.current = false;
      setNodes([]);
      setEdges([]);
      nodesRef.current = [];
      edgesRef.current = [];
      setBoardTitle('');
      boardTitleRef.current = '';
      historyRef.current = [];
      historyIndexRef.current = -1;
      updateHistoryState();
      setSaveStatus('saved');
      return;
    }

    isBoardLoadingRef.current = true;
    isDirtyRef.current = false;

    let loadedNodes: SerializableNode[] = [];
    let loadedEdges: SerializableEdge[] = [];
    let loadedTitle = 'Untitled Canvas';
    let foundLocalData = false;
    let savedViewport: { x: number; y: number; zoom: number } | null = null;

    // Check boards list for metadata title
    try {
      const listRaw = localStorage.getItem(STORAGE_KEY_BOARDS_LIST);
      if (listRaw) {
        const parsedList: CanvasBoardMetadata[] = JSON.parse(listRaw);
        const matched = parsedList.find((b) => b.id === boardId);
        if (matched?.title) {
          loadedTitle = matched.title;
        }
      }
    } catch {}

    // 1. Try local storage
    try {
      const local = localStorage.getItem(`${STORAGE_KEY_BOARD_PREFIX}${boardId}`);
      if (local) {
        const parsed = JSON.parse(local);
        foundLocalData = true;
        loadedNodes = parsed.nodes || [];
        loadedEdges = parsed.edges || [];
        if (parsed.title) loadedTitle = parsed.title;
        if (parsed.viewport && typeof parsed.viewport.zoom === 'number' && parsed.viewport.zoom >= 0.2) {
          savedViewport = parsed.viewport;
          currentViewportRef.current = savedViewport;
        }
      }
    } catch (e) {
      console.warn('LocalStorage canvas parse error:', e);
    }

    // Set state & refs
    const pNodes = loadedNodes.map(prepareNode);
    const pEdges = loadedEdges.map(prepareEdge);

    setNodes(pNodes);
    setEdges(pEdges);
    setBoardTitle(loadedTitle);
    boardTitleRef.current = loadedTitle;
    nodesRef.current = pNodes;
    edgesRef.current = pEdges;

    // Initialize history with this board's starting state
    historyRef.current = [{
      nodes: toSerializableNodes(pNodes),
      edges: toSerializableEdges(pEdges),
    }];
    historyIndexRef.current = 0;
    updateHistoryState();

    isBoardLoadingRef.current = false;
    setSaveStatus('saved');

    // 2. Fetch remote update in background if local didn't exist
    if (!foundLocalData && boardId) {
      try {
        const res = await fetch(`/api/canvas?id=${boardId}`);
        if (res.ok) {
          const remote = await res.json();
          if (remote && remote.id === boardId) {
            const rNodes = (remote.nodes || []).map(prepareNode);
            const rEdges = (remote.edges || []).map(prepareEdge);
            const rTitle = remote.title || loadedTitle;
            if (remote.viewport && typeof remote.viewport.zoom === 'number' && remote.viewport.zoom >= 0.2) {
              savedViewport = remote.viewport;
              currentViewportRef.current = savedViewport;
            }
            setNodes(rNodes);
            setEdges(rEdges);
            setBoardTitle(rTitle);
            nodesRef.current = rNodes;
            edgesRef.current = rEdges;
            boardTitleRef.current = rTitle;
            historyRef.current = [{
              nodes: toSerializableNodes(rNodes),
              edges: toSerializableEdges(rEdges),
            }];
            historyIndexRef.current = 0;
            updateHistoryState();
            try {
              localStorage.setItem(`${STORAGE_KEY_BOARD_PREFIX}${boardId}`, JSON.stringify({
                id: boardId,
                title: rTitle,
                nodes: remote.nodes || [],
                edges: remote.edges || [],
                viewport: savedViewport || undefined,
                updatedAt: remote.updatedAt || new Date().toISOString(),
              }));
            } catch {}
          }
        }
      } catch {
        // Offline fallback
      }
    }

    setTimeout(() => {
      if (savedViewport && typeof savedViewport.zoom === 'number' && savedViewport.zoom >= 0.25) {
        setViewport(savedViewport, { duration: 300 });
      } else if (containerRef.current && containerRef.current.clientWidth > 100) {
        fitView({ padding: 0.25, duration: 500, minZoom: 0.35, maxZoom: 1.1 });
      }
    }, 120);
  }, [fitView, setViewport, prepareEdge, prepareNode, toSerializableEdges, toSerializableNodes, updateHistoryState, setNodes, setEdges]);

  // Load boards list and initial board on mount with smart-merge
  useEffect(() => {
    // 1. Read initial boards index from localStorage
    let initialBoards: CanvasBoardMetadata[] = [];
    try {
      const localList = localStorage.getItem(STORAGE_KEY_BOARDS_LIST);
      if (localList) {
        const parsed = JSON.parse(localList);
        if (Array.isArray(parsed)) {
          // If the list only has the old canned demo 'default' with 'Romans 8 Study', purge it!
          initialBoards = parsed.filter((b) => !(b.id === 'default' && b.title === 'Romans 8 Study'));
          if (initialBoards.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY_BOARDS_LIST, JSON.stringify(initialBoards));
            localStorage.removeItem(`${STORAGE_KEY_BOARD_PREFIX}default`);
          }
        }
      }
    } catch {
      // Ignore
    }
    setBoards(initialBoards);

    // 2. Read initial active board ID from localStorage
    let savedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE_BOARD) || '';
    if (savedActiveId === 'default' && !initialBoards.some((b) => b.id === 'default')) {
      savedActiveId = initialBoards.length > 0 ? initialBoards[0].id : '';
      try {
        if (savedActiveId) {
          localStorage.setItem(STORAGE_KEY_ACTIVE_BOARD, savedActiveId);
        } else {
          localStorage.removeItem(STORAGE_KEY_ACTIVE_BOARD);
        }
      } catch {}
    }

    if (savedActiveId && initialBoards.some((b) => b.id === savedActiveId)) {
      setActiveBoardId(savedActiveId);
      activeBoardIdRef.current = savedActiveId;
      loadBoardData(savedActiveId);
    } else if (initialBoards.length > 0) {
      const firstId = initialBoards[0].id;
      setActiveBoardId(firstId);
      activeBoardIdRef.current = firstId;
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE_BOARD, firstId);
      } catch {}
      loadBoardData(firstId);
    } else {
      setActiveBoardId('');
      activeBoardIdRef.current = '';
      setBoardTitle('');
      boardTitleRef.current = '';
      setNodes([]);
      setEdges([]);
      nodesRef.current = [];
      edgesRef.current = [];
      historyRef.current = [];
      historyIndexRef.current = -1;
      updateHistoryState();
      try {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_BOARD);
      } catch {}
    }

    // 3. Fetch boards list from API and SMART-MERGE (never delete user's local boards!)
    fetch('/api/canvas?list=true')
      .then((res) => res.json())
      .then((remoteList) => {
        if (Array.isArray(remoteList)) {
          // Filter out any canned Romans 8 Study from remoteList too
          const cleanedRemote = remoteList.filter((b: CanvasBoardMetadata) => !(b.id === 'default' && b.title === 'Romans 8 Study'));
          setBoards((prev) => {
            const map = new Map<string, CanvasBoardMetadata>();
            // Remote items
            cleanedRemote.forEach((b: CanvasBoardMetadata) => {
              if (b?.id) map.set(b.id, b);
            });
            // Local items take precedence if updated more recently or newly created
            prev.forEach((b: CanvasBoardMetadata) => {
              if (!b?.id) return;
              const existing = map.get(b.id);
              if (!existing || (b.updatedAt && (!existing.updatedAt || new Date(b.updatedAt) >= new Date(existing.updatedAt)))) {
                map.set(b.id, b);
              }
            });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem(STORAGE_KEY_BOARDS_LIST, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {});
  }, [loadBoardData, updateHistoryState, setNodes, setEdges]); // Run once on mount

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

  // Synchronous auto-save debounce for current board
  useEffect(() => {
    // Never auto-save while loading a board or if no active board exists
    if (isBoardLoadingRef.current || !activeBoardId) return;

    // Keep refs in sync
    nodesRef.current = nodes;
    edgesRef.current = edges;
    boardTitleRef.current = boardTitle;
    activeBoardIdRef.current = activeBoardId;

    // Mark as dirty
    isDirtyRef.current = true;
    setSaveStatus('saving');

    const timer = setTimeout(() => {
      if (isBoardLoadingRef.current || !activeBoardId) return;
      saveBoardImmediate(activeBoardId, boardTitle, nodes, edges);
    }, 600);

    return () => clearTimeout(timer);
  }, [nodes, edges, boardTitle, activeBoardId, saveBoardImmediate]);

  // Synchronously flush changes to localStorage on beforeunload, pagehide, and unmount
  useEffect(() => {
    const handlePageUnload = () => {
      if (isDirtyRef.current && activeBoardIdRef.current) {
        try {
          const payload = {
            id: activeBoardIdRef.current,
            title: boardTitleRef.current,
            nodes: toSerializableNodes(nodesRef.current),
            edges: toSerializableEdges(edgesRef.current),
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(`${STORAGE_KEY_BOARD_PREFIX}${activeBoardIdRef.current}`, JSON.stringify(payload));
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handlePageUnload);
    window.addEventListener('pagehide', handlePageUnload);

    return () => {
      window.removeEventListener('beforeunload', handlePageUnload);
      window.removeEventListener('pagehide', handlePageUnload);
      handlePageUnload();
    };
  }, [toSerializableNodes, toSerializableEdges]);

  // Sidebar Board Switcher Handlers (with atomic flushing and race-condition prevention)
  const handleSelectBoard = useCallback((newBoardId: string) => {
    if (newBoardId === activeBoardIdRef.current) return;

    // 1. Flush & save current board immediately if dirty
    if (isDirtyRef.current && activeBoardIdRef.current) {
      saveBoardImmediate(
        activeBoardIdRef.current,
        boardTitleRef.current,
        nodesRef.current,
        edgesRef.current
      );
    }

    // 2. Persist newly active board ID
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_BOARD, newBoardId);
    } catch {}
    setActiveBoardId(newBoardId);
    activeBoardIdRef.current = newBoardId;

    // 3. Load target board data
    loadBoardData(newBoardId);
  }, [saveBoardImmediate, loadBoardData]);

  const handleCreateBoard = useCallback((customTitle?: string) => {
    // 1. Flush current board if dirty
    if (isDirtyRef.current && activeBoardIdRef.current) {
      saveBoardImmediate(
        activeBoardIdRef.current,
        boardTitleRef.current,
        nodesRef.current,
        edgesRef.current
      );
    }

    const timestamp = Date.now();
    const newId = `board-${timestamp}`;
    const newTitle = (typeof customTitle === 'string' && customTitle.trim()) ? customTitle.trim() : 'New Canvas';
    const now = new Date().toISOString();

    const newBoardMeta: CanvasBoardMetadata = {
      id: newId,
      title: newTitle,
      updatedAt: now,
      nodeCount: 0,
    };

    // 2. Immediately write new board record to localStorage
    try {
      localStorage.setItem(`${STORAGE_KEY_BOARD_PREFIX}${newId}`, JSON.stringify({
        id: newId,
        title: newTitle,
        nodes: [],
        edges: [],
        updatedAt: now,
      }));
    } catch (e) {
      console.warn('Failed to initialize new board storage:', e);
    }

    // 3. Update boards index list
    setBoards((prev) => {
      const next = [newBoardMeta, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_BOARDS_LIST, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 4. Update active board ID
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_BOARD, newId);
    } catch {}
    activeBoardIdRef.current = newId;
    setActiveBoardId(newId);

    // 5. Update state
    setBoardTitle(newTitle);
    boardTitleRef.current = newTitle;
    setNodes([]);
    setEdges([]);
    nodesRef.current = [];
    edgesRef.current = [];

    historyRef.current = [{ nodes: [], edges: [] }];
    historyIndexRef.current = 0;
    updateHistoryState();
    isDirtyRef.current = false;
    setSaveStatus('saved');

    // 6. Sync new board to API
    fetch('/api/canvas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newId,
        title: newTitle,
        nodes: [],
        edges: [],
      }),
    }).catch(() => {});

    return newId;
  }, [saveBoardImmediate, updateHistoryState, setNodes, setEdges]);

  const handleRenameBoard = useCallback((id: string, newTitle: string) => {
    const trimmed = newTitle.trim() || 'Untitled Canvas';

    // 1. Update boards index list in state & localStorage
    setBoards((prev) => {
      const next = prev.map((b) => (b.id === id ? { ...b, title: trimmed } : b));
      try {
        localStorage.setItem(STORAGE_KEY_BOARDS_LIST, JSON.stringify(next));
      } catch {}
      return next;
    });

    // 2. If active board, update title state and immediate save
    if (id === activeBoardIdRef.current) {
      setBoardTitle(trimmed);
      boardTitleRef.current = trimmed;
      saveBoardImmediate(id, trimmed, nodesRef.current, edgesRef.current);
    } else {
      // If inactive board, safely load that board's record, update title, and write back
      try {
        const existingRaw = localStorage.getItem(`${STORAGE_KEY_BOARD_PREFIX}${id}`);
        if (existingRaw) {
          const parsed = JSON.parse(existingRaw);
          parsed.title = trimmed;
          parsed.updatedAt = new Date().toISOString();
          localStorage.setItem(`${STORAGE_KEY_BOARD_PREFIX}${id}`, JSON.stringify(parsed));

          // Sync to API with inactive board's own nodes (never active board's nodes!)
          fetch('/api/canvas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id,
              title: trimmed,
              nodes: parsed.nodes || [],
              edges: parsed.edges || [],
            }),
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('Failed to rename inactive board in storage:', e);
      }
    }
  }, [saveBoardImmediate]);

  const handleDeleteBoard = useCallback((id: string) => {
    let nextBoardsList: CanvasBoardMetadata[] = [];
    setBoards((prev) => {
      const remaining = prev.filter((b) => b.id !== id);
      nextBoardsList = remaining;
      try {
        localStorage.setItem(STORAGE_KEY_BOARDS_LIST, JSON.stringify(remaining));
        localStorage.removeItem(`${STORAGE_KEY_BOARD_PREFIX}${id}`);
      } catch {}
      return remaining;
    });

    // Delete from API
    fetch(`/api/canvas?id=${id}`, { method: 'DELETE' }).catch(() => {});

    // If active was deleted
    if (id === activeBoardIdRef.current) {
      if (nextBoardsList.length > 0) {
        const nextActiveId = nextBoardsList[0].id;
        try {
          localStorage.setItem(STORAGE_KEY_ACTIVE_BOARD, nextActiveId);
        } catch {}
        activeBoardIdRef.current = nextActiveId;
        setActiveBoardId(nextActiveId);
        loadBoardData(nextActiveId);
      } else {
        // Zero boards left!
        try {
          localStorage.removeItem(STORAGE_KEY_ACTIVE_BOARD);
        } catch {}
        activeBoardIdRef.current = '';
        setActiveBoardId('');
        boardTitleRef.current = '';
        setBoardTitle('');
        nodesRef.current = [];
        edgesRef.current = [];
        setNodes([]);
        setEdges([]);
        historyRef.current = [];
        historyIndexRef.current = -1;
        updateHistoryState();
        isDirtyRef.current = false;
        setSaveStatus('saved');
      }
    }
  }, [loadBoardData, updateHistoryState, setNodes, setEdges]);

  // Handle incoming node from Bible reader or AI chat
  useEffect(() => {
    if (!incomingNode) return;

    if (!activeBoardIdRef.current) {
      handleCreateBoard(incomingNode.title || 'Scripture Reference');
    }

    const timestamp = Date.now();
    const newId = `card-incoming-${timestamp}`;

    let posX = 140;
    let posY = 140;
    if (nodes.length > 0) {
      let maxX = -Infinity;
      for (const n of nodes) {
        if (n.position.x > maxX) maxX = n.position.x;
      }
      posX = maxX + 700; // 380px card width + 320px open horizontal channel
      posY = 140;
    }

    const newNode: Node<CanvasNodeData> = {
      id: newId,
      type: 'customCard',
      position: { x: posX, y: posY },
      selected: true,
      style: { width: 380 },
      data: {
        title: incomingNode.title || 'Scripture Reference',
        content: incomingNode.content || '',
        category: incomingNode.category || 'scripture',
        theme,
        onVerseClick: onNavigateToVerse,
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
      if (containerRef.current && containerRef.current.clientWidth > 100) {
        fitView({ padding: 0.25, duration: 600, minZoom: 0.35, maxZoom: 1.1 });
      }
    }, 120);
  }, [incomingNode, handleCreateBoard, nodes, theme, onNavigateToVerse, handleUpdateNode, handleDuplicateNode, handleDeleteNode, onIncomingNodeHandled, pushSnapshot, fitView, setNodes]);

  // Add card from toolbar or context menu
  const handleAddNode = useCallback((category: NodeCategory, customPos?: { x: number; y: number }) => {
    if (!activeBoardIdRef.current) {
      handleCreateBoard();
    }

    const timestamp = Date.now();
    const newId = `card-${timestamp}`;

    let posX = customPos ? customPos.x : 200;
    let posY = customPos ? customPos.y : 200;

    if (!customPos && nodesRef.current.length > 0) {
      const last = nodesRef.current[nodesRef.current.length - 1];
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

    const cardWidth = isMobile ? 310 : 380;
    const newNode: Node<CanvasNodeData> = {
      id: newId,
      type: 'customCard',
      position: { x: posX, y: posY },
      selected: true,
      style: { width: cardWidth },
      data: {
        title: titles[category],
        content: '',
        category,
        theme,
        onVerseClick: onNavigateToVerse,
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
  }, [handleCreateBoard, theme, onNavigateToVerse, handleUpdateNode, handleDuplicateNode, handleDeleteNode, pushSnapshot, setNodes, isMobile]);

  // Add scripture verse directly to canvas from lookup modal
  const handleAddVerse = useCallback((verseData: { title: string; content: string; reference: string }) => {
    if (!activeBoardIdRef.current) {
      handleCreateBoard(verseData.title);
    }

    const timestamp = Date.now();
    const newId = `card-verse-${timestamp}`;
    const cardWidth = isMobile ? 310 : 380;

    let posX = 200;
    let posY = 200;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerPos = screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
      posX = Math.round(centerPos.x - cardWidth / 2);
      posY = Math.round(centerPos.y - 120);
    } else if (nodesRef.current.length > 0) {
      const last = nodesRef.current[nodesRef.current.length - 1];
      posX = last.position.x + 60;
      posY = last.position.y + 60;
    }

    const newNode: Node<CanvasNodeData> = {
      id: newId,
      type: 'customCard',
      position: { x: posX, y: posY },
      selected: true,
      style: { width: cardWidth },
      data: {
        title: verseData.title,
        content: verseData.content,
        category: 'scripture',
        theme,
        onVerseClick: onNavigateToVerse,
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
  }, [handleCreateBoard, theme, onNavigateToVerse, handleUpdateNode, handleDuplicateNode, handleDeleteNode, pushSnapshot, setNodes, screenToFlowPosition, isMobile]);

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
        label: 'Relates to',
        animated: true,
        data: { theme },
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
  }, [isDark, theme, pushSnapshot, setEdges]);

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

  // Global Keyboard Shortcuts (Cmd+Z, Cmd+Shift+Z, Cmd+S, Delete)
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

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleManualSave();
      } else if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
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
  }, [handleUndo, handleRedo, handleManualSave, pushSnapshot, setEdges, setNodes]);

  // Clear Canvas
  const handleClear = useCallback(() => {
    if (nodes.length === 0) return;
    if (window.confirm('Clear all cards on this board? You can undo this action.')) {
      setNodes([]);
      setEdges([]);
      pushSnapshot([], []);
    }
  }, [nodes.length, pushSnapshot, setEdges, setNodes]);

  // Apply updates from Theologica AI
  const handleApplyAiGraph = useCallback((
    newNodes: SerializableNode[],
    newEdges: SerializableEdge[],
    explanation: string,
    suggestedBoardTitle?: string,
    mode?: 'generate' | 'expand' | 'synthesize'
  ) => {
    const cleanTitle = (typeof suggestedBoardTitle === 'string' && suggestedBoardTitle.trim())
      ? suggestedBoardTitle.trim()
      : '';

    // 1. If no board is active, create a new board with the AI's title
    if (!activeBoardIdRef.current) {
      handleCreateBoard(cleanTitle || 'Theologica Study Canvas');
    } else if (cleanTitle) {
      // 2. If board is active, automatically rename the canvas if:
      //    - mode is 'generate' (user asked AI to generate a study canvas)
      //    - or the board is empty (brand new blank board)
      //    - or the board still has a default placeholder title
      const currentTitle = (boardTitleRef.current || '').trim().toLowerCase();
      const isDefaultPlaceholder = !currentTitle || 
        ['new canvas', 'untitled canvas', 'untitled', 'theologica study canvas', 'new canvas board'].includes(currentTitle);
      const isCleanBoard = nodesRef.current.length === 0;

      if (mode === 'generate' || isCleanBoard || isDefaultPlaceholder) {
        handleRenameBoard(activeBoardIdRef.current, cleanTitle);
      }
    }

    const preparedNewNodes = newNodes.map(prepareNode);
    const preparedNewEdges = newEdges.map(prepareEdge);

    const nextNodes: Node<CanvasNodeData>[] = [
      ...nodesRef.current.map((n) => ({ ...n, selected: false })),
      ...preparedNewNodes.map((n) => ({ ...n, selected: true })),
    ];
    const nextEdges = edgesRef.current.concat(preparedNewEdges);

    // Automatically organize into clean, collision-free topological columns with optimal edge handles!
    const { arrangedNodes, arrangedEdges } = arrangeGraph(nextNodes, nextEdges);

    setNodes(arrangedNodes);
    setEdges(arrangedEdges);
    pushSnapshot(arrangedNodes, arrangedEdges);

    const toastMessage = explanation || (cleanTitle 
      ? `Theologica AI generated "${cleanTitle}" with ${newNodes.length} cards.`
      : `Theologica AI added ${newNodes.length} cards to your canvas.`);

    setAiToast({
      message: toastMessage,
      count: newNodes.length,
    });
    setTimeout(() => setAiToast(null), 6000);

    setTimeout(() => {
      if (containerRef.current && containerRef.current.clientWidth > 100) {
        fitView({ padding: 0.28, duration: 800, minZoom: 0.35, maxZoom: 1.1 });
      }
    }, 150);
  }, [arrangeGraph, fitView, handleCreateBoard, handleRenameBoard, prepareEdge, prepareNode, pushSnapshot, setEdges, setNodes]);

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
      style: {
        width: n.style?.width || 380,
        ...n.style,
      },
      data: {
        ...n.data,
        theme,
        onUpdate: handleUpdateNode,
        onDuplicate: handleDuplicateNode,
        onDelete: handleDeleteNode,
        onConnectTo: handleConnectTo,
        onVerseClick: onNavigateToVerse,
        otherNodes: summary.filter((s) => s.id !== n.id),
      },
    }));
  }, [nodes, theme, handleUpdateNode, handleDuplicateNode, handleDeleteNode, handleConnectTo, onNavigateToVerse]);

  return (
    <div 
      ref={containerRef}
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
        onOpenAddVerse={() => setIsAddVerseModalOpen(true)}
        onOpenAi={() => setIsAiModalOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onFitView={() => {
          if (containerRef.current && containerRef.current.clientWidth > 100) {
            fitView({ padding: 0.2, duration: 600, minZoom: 0.35, maxZoom: 1.1 });
          }
        }}
        onAutoArrange={handleAutoArrange}
        onClear={handleClear}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        saveStatus={saveStatus}
        onSave={handleManualSave}
        theme={theme}
        nodeCount={nodes.length}
        hasActiveBoard={Boolean(activeBoardId && boards.length > 0)}
        onCreateBoard={() => handleCreateBoard()}
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
        onMoveEnd={(event, viewport) => {
          if (viewport && typeof viewport.zoom === 'number' && viewport.zoom >= 0.2) {
            currentViewportRef.current = viewport;
          }
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.2}
        maxZoom={2.0}
        defaultViewport={{ x: isMobile ? 20 : 80, y: isMobile ? 40 : 60, zoom: isMobile ? 0.7 : 0.85 }}
        selectionMode={SelectionMode.Partial}
        panOnScroll={false}
        selectionOnDrag={!isMobile}
        panOnDrag={isMobile ? true : [1, 2]}
        zoomOnPinch={true}
        zoomOnScroll={true}
        preventScrolling={true}
        autoPanOnNodeDrag={true}
        autoPanOnConnect={true}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: 'customEdge',
          animated: true,
        }}
        className="w-full h-full touch-none"
      >
        {/* Dot Grid */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color={isDark ? '#323236' : '#D4D4D8'}
        />

        {/* MiniMap - hidden on mobile to maximize touch canvas workspace */}
        {!isMobile && boards.length > 0 && nodes.length > 0 && (
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
        )}

        {/* Zoom Controls */}
        {boards.length > 0 && (
          <Controls
            position="bottom-left"
            showInteractive={false}
            className={`!rounded-xl !border shadow-xl !overflow-hidden mb-2 sm:mb-0 ${
              isDark 
                ? '!bg-[#1e1e22] !border-zinc-700/70 !text-zinc-200 [&>button]:!border-zinc-700 [&>button]:!bg-[#1e1e22] [&>button]:!fill-zinc-300 hover:[&>button]:!bg-zinc-800' 
                : '!bg-white !border-zinc-200 !text-zinc-700 [&>button]:!border-zinc-200 [&>button]:!bg-white [&>button]:!fill-zinc-600 hover:[&>button]:!bg-zinc-50'
            }`}
          />
        )}
      </ReactFlow>

      {/* Empty State Overlay in the Board Space (When there are 0 boards) */}
      {boards.length === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-6 pointer-events-none">
          <div 
            className={`pointer-events-auto max-w-md w-full p-8 rounded-3xl border shadow-2xl backdrop-blur-xl text-center space-y-6 animate-in fade-in-50 zoom-in-95 transition-all duration-300 ${
              isDark 
                ? 'bg-[#1c1c20]/90 border-zinc-800/80 text-zinc-100 shadow-black/50' 
                : 'bg-white/95 border-zinc-200/80 text-zinc-900 shadow-zinc-200/60'
            }`}
          >
            {/* Icon badge with glow */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shadow-inner relative group">
              <Workflow size={32} className="transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute -inset-1 rounded-2xl bg-accent/20 blur-md -z-10 animate-pulse" />
            </div>

            {/* Header & Description */}
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                No Canvas Boards
              </h2>
              <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Create a canvas to start organizing scripture passages, theological points, and study notes into an interactive visual graph.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleCreateBoard()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-accent/25 active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>Create Canvas Board</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium active:scale-95 transition-all cursor-pointer ${
                  isDark 
                    ? 'border-zinc-700 hover:bg-zinc-800/60 text-zinc-200 hover:text-white' 
                    : 'border-zinc-200 hover:bg-zinc-100 text-zinc-700'
                }`}
              >
                <Sparkles size={15} className="text-amber-400" />
                <span>Generate with AI</span>
              </button>
            </div>

            {/* Helper Footer */}
            <div className={`pt-3 border-t text-[11px] flex items-center justify-center gap-4 ${isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-100 text-zinc-400'}`}>
              <span>Right-click for options</span>
              <span>•</span>
              <span>Press &quot;Boards&quot; to manage</span>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Pane Right-Click Context Menu */}
      {paneContextMenu && (
        <div
          ref={contextMenuRef}
          style={{ 
            left: Math.min(paneContextMenu.x, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 270), 
            top: Math.min(paneContextMenu.y, (typeof window !== 'undefined' ? window.innerHeight : 800) - 400) 
          }}
          className={`fixed z-50 w-64 rounded-2xl shadow-2xl border p-2 animate-in fade-in-50 zoom-in-95 backdrop-blur-md select-none ${
            isDark ? 'bg-[#222226]/95 border-zinc-700 text-zinc-200' : 'bg-white/95 border-zinc-200 text-zinc-800 shadow-xl'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider px-3 py-1.5">
            Canvas Options
          </div>

          {boards.length === 0 ? (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  setPaneContextMenu(null);
                  handleCreateBoard();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-zinc-800 text-accent' : 'hover:bg-accent/10 text-accent'
                }`}
              >
                <Plus size={16} className="shrink-0" />
                <span>New Canvas Board</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaneContextMenu(null);
                  setIsAiModalOpen(true);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-zinc-800 text-amber-300' : 'hover:bg-amber-50 text-amber-700'
                }`}
              >
                <Sparkles size={16} className="text-amber-400 shrink-0" />
                <span>Theologica AI</span>
              </button>
            </div>
          ) : (
            <>
              {/* Add Scripture Verse */}
              <button
                type="button"
                onClick={() => {
                  setPaneContextMenu(null);
                  setIsAddVerseModalOpen(true);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-zinc-800 text-amber-300' : 'hover:bg-amber-50 text-amber-700'
                }`}
              >
                <BookOpen size={16} className="text-amber-400 shrink-0" />
                <span>Add Bible Verse...</span>
              </button>

              {/* Add Card Submenu */}
              <div>
                <button
                  type="button"
                  onClick={() => setPaneAddSubmenuOpen(!paneAddSubmenuOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Plus size={16} className="text-accent" />
                    <span>Add Card...</span>
                  </div>
                  <ChevronRight size={15} className={`text-zinc-400 transition-transform duration-150 ${paneAddSubmenuOpen ? 'rotate-90' : ''}`} />
                </button>

                {paneAddSubmenuOpen && (
                  <div className={`my-1.5 py-1.5 pl-3 border-l-2 space-y-1 ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`}>
                    {(Object.keys(CATEGORY_METADATA) as NodeCategory[]).map((cat) => {
                      const meta = CATEGORY_METADATA[cat];
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            if (cat === 'scripture') {
                              setIsAddVerseModalOpen(true);
                            } else {
                              const flowPos = screenToFlowPosition({ x: paneContextMenu.x, y: paneContextMenu.y });
                              handleAddNode(cat, flowPos);
                            }
                            setPaneContextMenu(null);
                          }}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer text-left ${
                            isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-800'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: meta.accent }} />
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
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              isDark ? 'hover:bg-zinc-800 text-amber-300' : 'hover:bg-amber-50 text-amber-700'
            }`}
          >
            <Sparkles size={16} className="text-amber-400 shrink-0" />
            <span>Theologica AI</span>
          </button>

          <div className={`border-t my-1.5 ${isDark ? 'border-zinc-700/60' : 'border-zinc-200'}`} />

          {/* Auto Arrange */}
          <button
            type="button"
            onClick={() => {
              setPaneContextMenu(null);
              handleAutoArrange();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-800'
            }`}
          >
            <LayoutGrid size={16} className="shrink-0" />
            <span>Auto Arrange</span>
          </button>

          {/* Fit View */}
          <button
            type="button"
            onClick={() => {
              setPaneContextMenu(null);
              if (containerRef.current && containerRef.current.clientWidth > 100) {
                fitView({ padding: 0.2, duration: 600, minZoom: 0.35, maxZoom: 1.1 });
              }
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-800'
            }`}
          >
            <Maximize2 size={16} className="shrink-0" />
            <span>Fit to View</span>
          </button>

          <div className={`border-t my-1.5 ${isDark ? 'border-zinc-700/60' : 'border-zinc-200'}`} />

          {/* Undo */}
          <button
            type="button"
            disabled={!canUndo}
            onClick={() => {
              setPaneContextMenu(null);
              handleUndo();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              canUndo 
                ? (isDark ? 'hover:bg-zinc-800 text-zinc-300 cursor-pointer' : 'hover:bg-zinc-100 text-zinc-800 cursor-pointer')
                : 'opacity-40 cursor-not-allowed text-zinc-500'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Undo2 size={16} className="shrink-0" />
              <span>Undo</span>
            </div>
            <span className="text-xs text-zinc-500 font-mono">{mod.symbol}Z</span>
          </button>

          {/* Redo */}
          <button
            type="button"
            disabled={!canRedo}
            onClick={() => {
              setPaneContextMenu(null);
              handleRedo();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              canRedo 
                ? (isDark ? 'hover:bg-zinc-800 text-zinc-300 cursor-pointer' : 'hover:bg-zinc-100 text-zinc-800 cursor-pointer')
                : 'opacity-40 cursor-not-allowed text-zinc-500'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Redo2 size={16} className="shrink-0" />
              <span>Redo</span>
            </div>
            <span className="text-xs text-zinc-500 font-mono">{mod.symbol}{mod.shift}Z</span>
          </button>
        </>
      )}
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

      {/* Add Scripture Verse Modal */}
      <AddVerseToCanvasModal
        isOpen={isAddVerseModalOpen}
        onClose={() => setIsAddVerseModalOpen(false)}
        onAddVerse={handleAddVerse}
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
