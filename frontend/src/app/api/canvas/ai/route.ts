import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { SerializableNode, SerializableEdge, NodeCategory } from '@/types/canvas';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Fallback chain for Gemini 3 Flash
const AI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash'
];

function isRetryable(e: unknown): boolean {
  try {
    const msg = (e as Error).message || '';
    const code = JSON.parse(msg)?.error?.code;
    return code === 503 || code === 429;
  } catch {
    return false;
  }
}

async function withModelFallback<T>(
  models: string[],
  fn: (model: string) => Promise<T>
): Promise<T> {
  let lastError: unknown;
  for (const model of models) {
    try {
      return await fn(model);
    } catch (e) {
      lastError = e;
      if (!isRetryable(e)) throw e;
      console.warn(`Model ${model} unavailable for canvas, trying next...`);
    }
  }
  throw lastError;
}

interface RequestBody {
  prompt: string;
  currentGraph?: {
    nodes: SerializableNode[];
    edges: SerializableEdge[];
  };
  selectedNodeId?: string;
  mode?: 'generate' | 'expand' | 'synthesize';
}

interface RawGeneratedNode {
  title: string;
  content: string;
  category: NodeCategory;
  suggestedX?: number;
  suggestedY?: number;
}

interface RawGeneratedEdge {
  sourceIndex: number | string;
  targetIndex: number | string;
  label?: string;
}

interface AiResponsePayload {
  explanation: string;
  action: 'add_nodes' | 'expand_node' | 'synthesize_graph' | 'answer';
  nodes?: RawGeneratedNode[];
  edges?: RawGeneratedEdge[];
  synthesis?: string;
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    // Allow non-logged in or guest sessions to use canvas AI as well if API key is present
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const body: RequestBody = await req.json();
    const { prompt, currentGraph, selectedNodeId, mode = 'generate' } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 });
    }

    const existingNodes = currentGraph?.nodes || [];
    const existingEdges = currentGraph?.edges || [];

    const selectedNode = selectedNodeId 
      ? existingNodes.find((n) => n.id === selectedNodeId)
      : null;

    // Compact summary of current canvas for context
    const canvasSummary = existingNodes.length > 0
      ? existingNodes.map((n, i) => 
          `[Node ${i + 1}] ID: "${n.id}", Category: ${n.data.category}, Title: "${n.data.title}", Excerpt: "${(n.data.content || '').slice(0, 100)}..."`
        ).join('\n')
      : 'Canvas is currently empty.';

    const edgeSummary = existingEdges.length > 0
      ? existingEdges.map(e => `Edge from "${e.source}" -> "${e.target}" (Label: "${e.label || 'connected'}")`).join('\n')
      : 'No edges.';

    const systemPrompt = `You are the "Theologica Canvas Architect", an expert Christian theological scholar, expositor, and visual graph architect.
Your role is to build and manipulate an interactive Obsidian-style Infinite Canvas for Bible study.

Categories available for cards:
- "scripture": Biblical texts, quotations, verse references.
- "theological_point": Doctrinal definitions, theological arguments, systematic points.
- "historical_context": Cultural, archeological, original language (Greek/Hebrew), authorship, or historical background.
- "illustration": Analogies, metaphors, object lessons, typology.
- "application": Practical Christian living, spiritual disciplines, personal reflection, prayers.
- "general": Synthesis, questions, summaries.

CURRENT CANVAS CONTEXT:
${canvasSummary}
${edgeSummary}

${selectedNode ? `CURRENTLY SELECTED NODE:
ID: "${selectedNode.id}"
Title: "${selectedNode.data.title}"
Category: "${selectedNode.data.category}"
Content: "${selectedNode.data.content}"
` : ''}

USER INSTRUCTION:
"${prompt}"

INSTRUCTIONS:
1. Return a STRICT JSON object with no wrapping outside the JSON.
2. If the user wants to generate or expand a knowledge graph (e.g. topic, passage, expanding a node):
   - Provide high quality, substantive markdown content for each card. Include scripture references and rich formatting (bullet points, quotes, bold).
   - Return an array of "nodes" with:
     - "title": concise clear title
     - "content": markdown content (1-4 concise paragraphs with quotes/bullets)
     - "category": one of ["scripture", "theological_point", "historical_context", "illustration", "application", "general"]
   - Return an array of "edges" showing theological or narrative flow:
     - "sourceIndex": index of source node (0-indexed) or existing node ID
     - "targetIndex": index of target node (0-indexed) or existing node ID
     - "label": brief relationship label (e.g., "Scriptural Basis", "Historic Context", "Fulfills", "Application", "Contrasts With")
3. If the user wants to synthesize or ask a question about the canvas ("synthesize_graph" or "answer"):
   - Set "action": "synthesize_graph"
   - Provide a comprehensive "synthesis" in markdown format synthesizing the nodes and ideas on the canvas.
   - You may still optionally generate summary cards.
4. Always provide an "explanation" string summarizing what you created or analyzed.

JSON Format:
{
  "action": "add_nodes" | "expand_node" | "synthesize_graph",
  "explanation": "Summary of visual graph operations...",
  "nodes": [
    {
      "title": "...",
      "content": "...",
      "category": "scripture" | "theological_point" | "historical_context" | "illustration" | "application" | "general"
    }
  ],
  "edges": [
    {
      "sourceIndex": 0,
      "targetIndex": 1,
      "label": "..."
    }
  ],
  "synthesis": "Optional markdown text if synthesizing"
}`;

    const aiResponseText = await withModelFallback(AI_MODELS, async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: systemPrompt,
        config: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      });
      return response.text ?? '';
    });

    let parsed: AiResponsePayload;
    try {
      // Strip any accidental markdown formatting if present
      const cleaned = aiResponseText
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse Gemini Canvas JSON:', parseErr, aiResponseText);
      return NextResponse.json(
        { error: 'Invalid JSON response from AI assistant. Please try again.' },
        { status: 500 }
      );
    }

    // Assign collision-free spatial layout coordinates
    const createdNodes: SerializableNode[] = [];
    const createdEdges: SerializableEdge[] = [];
    const timestamp = Date.now();

    // Determine base placement coordinates
    let baseX = 100;
    let baseY = 100;

    if (selectedNode) {
      // Position to the right of selected node
      baseX = selectedNode.position.x + 420;
      baseY = selectedNode.position.y - 120;
    } else if (existingNodes.length > 0) {
      // Find bounding box of existing nodes
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const n of existingNodes) {
        if (n.position.x > maxX) maxX = n.position.x;
        if (n.position.y > maxY) maxY = n.position.y;
      }
      baseX = maxX + 450;
      baseY = 100;
    }

    const rawNodes = parsed.nodes || [];
    const nodeIdMap: Record<number | string, string> = {};

    rawNodes.forEach((rawNode, index) => {
      const uniqueId = `node-${timestamp}-${index}-${Math.random().toString(36).substring(2, 6)}`;
      nodeIdMap[index] = uniqueId;

      // Intelligent column/grid distribution
      // Column width: 380px, row height: 280px
      const col = Math.floor(index / 3);
      const row = index % 3;

      const posX = baseX + (col * 380);
      const posY = baseY + (row * 280);

      createdNodes.push({
        id: uniqueId,
        type: 'customCard',
        position: { x: posX, y: posY },
        data: {
          title: rawNode.title || 'Theological Insight',
          content: rawNode.content || '',
          category: rawNode.category || 'theological_point',
        },
      });
    });

    // If expanding a selected node and no edges specified, connect selected node to first new node
    if (selectedNode && (!parsed.edges || parsed.edges.length === 0) && createdNodes.length > 0) {
      createdEdges.push({
        id: `edge-${timestamp}-conn-0`,
        source: selectedNode.id,
        target: createdNodes[0].id,
        label: 'Expands',
        animated: true,
      });
    }

    // Map raw edges
    if (parsed.edges && Array.isArray(parsed.edges)) {
      parsed.edges.forEach((rawEdge, edgeIndex) => {
        let sourceId: string | undefined;
        let targetId: string | undefined;

        // Check if sourceIndex is index in new nodes or existing node ID
        if (typeof rawEdge.sourceIndex === 'number' && nodeIdMap[rawEdge.sourceIndex]) {
          sourceId = nodeIdMap[rawEdge.sourceIndex];
        } else if (typeof rawEdge.sourceIndex === 'string') {
          sourceId = existingNodes.some(n => n.id === rawEdge.sourceIndex)
            ? rawEdge.sourceIndex
            : nodeIdMap[rawEdge.sourceIndex] || (selectedNode?.id);
        }

        if (typeof rawEdge.targetIndex === 'number' && nodeIdMap[rawEdge.targetIndex]) {
          targetId = nodeIdMap[rawEdge.targetIndex];
        } else if (typeof rawEdge.targetIndex === 'string') {
          targetId = existingNodes.some(n => n.id === rawEdge.targetIndex)
            ? rawEdge.targetIndex
            : nodeIdMap[rawEdge.targetIndex];
        }

        if (sourceId && targetId && sourceId !== targetId) {
          createdEdges.push({
            id: `edge-${timestamp}-${edgeIndex}-${Math.random().toString(36).substring(2, 6)}`,
            source: sourceId,
            target: targetId,
            label: rawEdge.label || undefined,
            animated: true,
          });
        }
      });
    }

    return NextResponse.json({
      action: parsed.action || 'add_nodes',
      explanation: parsed.explanation || 'Visual graph generated successfully.',
      nodes: createdNodes,
      edges: createdEdges,
      synthesis: parsed.synthesis,
    });
  } catch (error: any) {
    console.error('Error in /api/canvas/ai:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process AI canvas request.' },
      { status: 500 }
    );
  }
}
