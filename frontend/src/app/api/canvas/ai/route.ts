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
        { error: 'Theologica AI service is currently unavailable.' },
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

    const systemPrompt = `You are the "Theologica Canvas Architect" (Theologica AI), an expert Christian theological scholar, expositor, and visual graph architect.
STRICT IDENTITY RULES: You are exclusively "Theologica AI", created specifically for this Bible study application. Under NO CIRCUMSTANCES should you ever mention Google, Gemini, or underlying AI model infrastructure. If asked, you are Theologica AI.
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
      console.error('Failed to parse Theologica Canvas JSON:', parseErr, aiResponseText);
      return NextResponse.json(
        { error: 'Invalid JSON response from AI assistant. Please try again.' },
        { status: 500 }
      );
    }

    // Assign collision-free spatial layout coordinates
    const createdNodes: SerializableNode[] = [];
    const createdEdges: SerializableEdge[] = [];
    const timestamp = Date.now();
    const rawNodes = parsed.nodes || [];
    const nodeIdMap: Record<number | string, string> = {};

    // Helper function to estimate card height from title and content length
    const estimateAiCardHeight = (title?: string, content?: string): number => {
      let estimated = 90; // Header, body padding, accent strip
      const t = title || '';
      if (t.length > 25) {
        estimated += Math.ceil((t.length - 25) / 25) * 22;
      }
      const c = content || '';
      if (c.trim()) {
        const rawLines = c.split('\n');
        let visualLines = 0;
        for (const line of rawLines) {
          const trimmed = line.trim();
          if (!trimmed) {
            visualLines += 0.6;
            continue;
          }
          const wrapped = Math.max(1, Math.ceil(trimmed.length / 36));
          visualLines += wrapped;
          if (trimmed.startsWith('#')) visualLines += 0.8;
          if (trimmed.startsWith('>')) visualLines += 0.6;
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\./.test(trimmed)) visualLines += 0.3;
        }
        estimated += Math.round(visualLines * 22);
      } else {
        estimated += 60;
      }
      return Math.max(190, Math.min(estimated, 1800));
    };

    // Standard generous layout constants
    const CARD_WIDTH = 340;
    const HORIZONTAL_GAP = 120; // column step = 460px
    const VERTICAL_GAP = 55;
    const COL_STEP = CARD_WIDTH + HORIZONTAL_GAP; // 460px

    if (selectedNode) {
      // MODE: Expanding a selected node - fan out cleanly to the right
      const total = rawNodes.length;
      const maxRowsPerCol = total <= 4 ? total : Math.ceil(total / 2);
      const baseX = selectedNode.position.x + COL_STEP;
      
      // Group node indices into columns
      const cols: number[][] = [];
      rawNodes.forEach((_, index) => {
        const c = Math.floor(index / maxRowsPerCol);
        while (cols.length <= c) cols.push([]);
        cols[c].push(index);
      });

      // Position each column using cumulative dynamic heights
      cols.forEach((colIndices, colIdx) => {
        const colHeights = colIndices.map(idx => estimateAiCardHeight(rawNodes[idx].title, rawNodes[idx].content));
        const totalColH = colHeights.reduce((sum, h) => sum + h, 0) + Math.max(0, colIndices.length - 1) * VERTICAL_GAP;
        const startY = selectedNode.position.y - (totalColH / 2);

        let currentY = startY;
        colIndices.forEach((nodeIdx, r) => {
          const rawNode = rawNodes[nodeIdx];
          const uniqueId = `node-${timestamp}-${nodeIdx}-${Math.random().toString(36).substring(2, 6)}`;
          nodeIdMap[nodeIdx] = uniqueId;

          const posX = baseX + (colIdx * COL_STEP);
          const posY = currentY;
          currentY += colHeights[r] + VERTICAL_GAP;

          createdNodes.push({
            id: uniqueId,
            type: 'customCard',
            position: { x: Math.round(posX), y: Math.round(posY) },
            data: {
              title: rawNode.title || 'Theological Insight',
              content: rawNode.content || '',
              category: rawNode.category || 'theological_point',
            },
          });
        });
      });

      // Connect parent node to all newly expanded nodes if no edges provided
      if ((!parsed.edges || parsed.edges.length === 0) && createdNodes.length > 0) {
        createdNodes.forEach((node, idx) => {
          createdEdges.push({
            id: `edge-${timestamp}-conn-${idx}`,
            source: selectedNode.id,
            target: node.id,
            label: idx === 0 ? 'Expands' : 'Related Point',
            animated: true,
          });
        });
      }
    } else {
      // MODE: Generating a new knowledge graph / topic exploration
      let baseX = 100;
      let baseY = 100;

      if (existingNodes.length > 0) {
        let maxX = -Infinity;
        for (const n of existingNodes) {
          if (n.position.x > maxX) maxX = n.position.x;
        }
        baseX = maxX + 500;
      }

      // Group nodes into 3 progressive columns:
      // Column 0 (Scripture Foundation): 'scripture', 'historical_context'
      // Column 1 (Doctrinal Core): 'theological_point', 'general'
      // Column 2 (Application & Reflection): 'illustration', 'application'
      const colBuckets: number[][] = [[], [], []];

      rawNodes.forEach((rawNode, index) => {
        const cat = rawNode.category || 'theological_point';
        if (cat === 'scripture' || cat === 'historical_context') {
          colBuckets[0].push(index);
        } else if (cat === 'illustration' || cat === 'application') {
          colBuckets[2].push(index);
        } else {
          colBuckets[1].push(index);
        }
      });

      // If categories are heavily skewed or all in one bucket, balance into 2-3 even columns
      const nonEmptyCols = colBuckets.filter(b => b.length > 0);
      const isSkewed = nonEmptyCols.length === 1 || colBuckets.some(b => b.length > 4);

      const columns: number[][] = [];

      if (isSkewed || rawNodes.length <= 3) {
        const maxPerCol = rawNodes.length <= 4 ? 2 : 3;
        rawNodes.forEach((_, index) => {
          const col = Math.floor(index / maxPerCol);
          while (columns.length <= col) columns.push([]);
          columns[col].push(index);
        });
      } else {
        colBuckets.forEach(b => {
          if (b.length > 0) {
            columns.push(b);
          }
        });
      }

      if (columns.length === 0) {
        columns.push(rawNodes.map((_, i) => i));
      }

      // Compute total cumulative height per column
      const colTotalHeights: number[] = columns.map(colIndices => {
        let sum = 0;
        colIndices.forEach((idx, i) => {
          const h = estimateAiCardHeight(rawNodes[idx].title, rawNodes[idx].content);
          sum += h;
          if (i < colIndices.length - 1) sum += VERTICAL_GAP;
        });
        return sum;
      });

      const maxColHeight = Math.max(...colTotalHeights, 1);

      columns.forEach((colIndices, colIdx) => {
        const colH = colTotalHeights[colIdx] || 0;
        const startY = baseY + Math.max(0, Math.round((maxColHeight - colH) * 0.15));

        let currentY = startY;
        colIndices.forEach((nodeIdx) => {
          const rawNode = rawNodes[nodeIdx];
          const uniqueId = `node-${timestamp}-${nodeIdx}-${Math.random().toString(36).substring(2, 6)}`;
          nodeIdMap[nodeIdx] = uniqueId;

          const cardH = estimateAiCardHeight(rawNode.title, rawNode.content);
          const posX = baseX + (colIdx * COL_STEP);
          const posY = currentY;
          currentY += cardH + VERTICAL_GAP;

          createdNodes.push({
            id: uniqueId,
            type: 'customCard',
            position: { x: Math.round(posX), y: Math.round(posY) },
            data: {
              title: rawNode.title || 'Theological Insight',
              content: rawNode.content || '',
              category: rawNode.category || 'theological_point',
            },
          });
        });
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
            label: rawEdge.label && String(rawEdge.label).trim() !== '' ? rawEdge.label : 'Relates to',
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
