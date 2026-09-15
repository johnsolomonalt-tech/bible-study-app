export type NodeCategory = 
  | 'scripture' 
  | 'theological_point' 
  | 'historical_context' 
  | 'illustration' 
  | 'application' 
  | 'general';

export interface CanvasNodeData extends Record<string, unknown> {
  title: string;
  content: string; // Markdown text
  category: NodeCategory;
  color?: string;
  tags?: string[];
  // Transient or callback props passed to node component
  onUpdate?: (id: string, updates: Partial<CanvasNodeData>) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onConnectTo?: (sourceId: string, targetId: string) => void;
  otherNodes?: Array<{ id: string; title: string; category: NodeCategory }>;
  theme?: 'dark' | 'light';
}

export interface SerializableNode {
  id: string;
  type: 'customCard' | 'groupNode';
  position: { x: number; y: number };
  data: CanvasNodeData;
  style?: React.CSSProperties;
}

export interface SerializableEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface CanvasStatePayload {
  nodes: SerializableNode[];
  edges: SerializableEdge[];
}

export interface CanvasBoardMetadata {
  id: string;
  title: string;
  updatedAt: string;
  nodeCount?: number;
  description?: string;
}

export const CATEGORY_METADATA: Record<
  NodeCategory, 
  { 
    label: string; 
    accent: string; 
    borderDark: string; 
    borderLight: string; 
    bgDark: string; 
    bgLight: string; 
    textDark: string; 
    textLight: string; 
  }
> = {
  scripture: {
    label: 'Scripture',
    accent: '#F59E0B',
    borderDark: 'border-amber-500/40',
    borderLight: 'border-amber-400',
    bgDark: 'bg-amber-500/10',
    bgLight: 'bg-amber-50',
    textDark: 'text-amber-400',
    textLight: 'text-amber-700',
  },
  theological_point: {
    label: 'Theological Point',
    accent: '#06B6D4',
    borderDark: 'border-cyan-500/40',
    borderLight: 'border-cyan-400',
    bgDark: 'bg-cyan-500/10',
    bgLight: 'bg-cyan-50',
    textDark: 'text-cyan-400',
    textLight: 'text-cyan-700',
  },
  historical_context: {
    label: 'Historical Context',
    accent: '#8B5CF6',
    borderDark: 'border-purple-500/40',
    borderLight: 'border-purple-400',
    bgDark: 'bg-purple-500/10',
    bgLight: 'bg-purple-50',
    textDark: 'text-purple-400',
    textLight: 'text-purple-700',
  },
  illustration: {
    label: 'Illustration',
    accent: '#10B981',
    borderDark: 'border-emerald-500/40',
    borderLight: 'border-emerald-400',
    bgDark: 'bg-emerald-500/10',
    bgLight: 'bg-emerald-50',
    textDark: 'text-emerald-400',
    textLight: 'text-emerald-700',
  },
  application: {
    label: 'Application',
    accent: '#F43F5E',
    borderDark: 'border-rose-500/40',
    borderLight: 'border-rose-400',
    bgDark: 'bg-rose-500/10',
    bgLight: 'bg-rose-50',
    textDark: 'text-rose-400',
    textLight: 'text-rose-700',
  },
  general: {
    label: 'General',
    accent: '#71717A',
    borderDark: 'border-zinc-600/40',
    borderLight: 'border-zinc-300',
    bgDark: 'bg-zinc-500/10',
    bgLight: 'bg-zinc-100',
    textDark: 'text-zinc-400',
    textLight: 'text-zinc-700',
  },
};
