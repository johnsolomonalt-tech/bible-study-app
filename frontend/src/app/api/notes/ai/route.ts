import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const AI_MODELS = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
];

function isRetryable(e: unknown): boolean {
  try {
    const msg = (e as Error).message || '';
    try {
      const parsed = JSON.parse(msg);
      const code = parsed?.error?.code;
      if (code === 503 || code === 429 || code === 404 || code === 500) return true;
    } catch {}
    const status = (e as any)?.status || (e as any)?.code;
    if (status === 503 || status === 429 || status === 404 || status === 500 || status === 'NOT_FOUND' || status === 'UNAVAILABLE') return true;
    if (/not found|unavailable|overloaded|high demand|quota|rate limit|resource exhausted|503|429|404/i.test(msg)) return true;
    return true;
  } catch {
    return true;
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
      console.warn(`Model ${model} unavailable for notes AI, trying next in fallback chain...`);
    }
  }
  throw lastError;
}

export type NoteAiAction =
  | 'summarize'
  | 'questions'
  | 'cross_references'
  | 'applications'
  | 'theology_context'
  | 'custom';

interface RequestBody {
  action: NoteAiAction;
  noteTitle: string;
  noteContent: string;
  customPrompt?: string;
  theologicalLens?: string;
}

export async function POST(req: Request) {
  try {
    await auth(); // Clerk auth check

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'AI service is currently not configured.' },
        { status: 500 }
      );
    }

    const body: RequestBody = await req.json();
    const { action, noteTitle, noteContent, customPrompt, theologicalLens = 'canonical' } = body;

    if (!noteContent && !customPrompt && !noteTitle) {
      return NextResponse.json(
        { error: 'Note is empty. Please add some notes or a passage first.' },
        { status: 400 }
      );
    }

    let taskInstruction = '';
    switch (action) {
      case 'summarize':
        taskInstruction = `Provide a concise, profound theological summary and key takeaways of this study note.
Include:
- **Core Theological Proposition**: 1-2 sentences summarizing the main biblical truth.
- **Key Themes**: Bulleted list of 2-4 critical themes with biblical grounding.
- **Summary Synthesis**: 1-2 brief paragraphs synthesizing the flow of thought.`;
        break;

      case 'questions':
        taskInstruction = `Generate 4-5 thought-provoking Inductive Bible Study and Reflection questions based directly on this note.
Include:
- **Observation Questions** (What does the text literally reveal?): 1-2 questions.
- **Interpretation Questions** (What does it mean for God's redemptive plan / theology?): 1-2 questions.
- **Application Questions** (How does this reshape our daily desires, actions, and prayer life?): 1-2 questions.`;
        break;

      case 'cross_references':
        taskInstruction = `Identify and explain 3-5 powerful Biblical Cross-References that directly enrich the themes and verses in this study note.
For each cross-reference:
- State the citation in bold (e.g. **Romans 8:28-30**).
- Quote the key verse snippet.
- Provide 1-2 sentences explaining the canonical connection and theological harmony with the user's note.`;
        break;

      case 'applications':
        taskInstruction = `Formulate 3-4 concrete, transformative Christian Life Applications based on this study note.
For each application:
- Provide an active title (e.g. **1. Cultivate Grateful Prayer in Uncertainty**).
- Give 2-3 sentences of clear, practical guidance on how to live out this truth in modern life (work, family, thoughts, church).
- Include a specific prayer prompt or spiritual discipline to practice this week.`;
        break;

      case 'theology_context':
        taskInstruction = `Provide rich Historical, Cultural, and Theological Background context to illuminate the biblical themes in this note.
Include:
- **Historical & Cultural Setting**: The original audience, authorial context, or ancient cultural customs relevant to the text.
- **Key Biblical Terms / Original Language**: Any significant Hebrew or Greek roots/nuances that clarify the meaning.
- **Canonical & Christocentric Connection**: How this theme points forward or relates to Christ and the gospel.`;
        break;

      case 'custom':
      default:
        taskInstruction = customPrompt || 'Analyze and expand on this Bible study note faithfully.';
        break;
    }

    const lensInstruction =
      theologicalLens && theologicalLens !== 'canonical'
        ? `Apply the ${theologicalLens.toUpperCase()} theological lens: reflect the hermeneutical priorities, historical citations, and pastoral nuance of the ${theologicalLens} tradition.`
        : 'Maintain a faithful, canonical, Christ-centered biblical perspective.';

    const systemPrompt = `You are "Theologica AI", an expert Christian theological scholar, biblical expositor, and pastor assisting a student of Scripture.
STRICT IDENTITY RULES: You are exclusively "Theologica AI", built specifically for this Bible study application. Never mention Google, Gemini, or underlying models.

${lensInstruction}

USER'S NOTE:
Title: "${noteTitle || 'Untitled Note'}"
Content:
---
${noteContent || '(Empty content - analyze title or instructions)'}
---

ASSIGNMENT:
${taskInstruction}

FORMATTING INSTRUCTIONS:
- Format completely in clean GitHub-flavored Markdown.
- Bold all scripture references (e.g., **Philippians 4:6**, **Romans 8:28**).
- Do not output conversational filler like "Sure! Here is the summary:".
- Output directly the formatted markdown response ready to be inserted into a study journal.`;

    const generatedText = await withModelFallback(AI_MODELS, async (model) => {
      const response = await ai.models.generateContent({
        model,
        contents: systemPrompt,
        config: {
          temperature: 0.35,
        },
      });
      return response.text ?? '';
    });

    if (!generatedText || !generatedText.trim()) {
      return NextResponse.json(
        { error: 'Could not generate a response. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      content: generatedText.trim(),
      action,
    });
  } catch (error: any) {
    console.error('Error in /api/notes/ai:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process AI study request.' },
      { status: 500 }
    );
  }
}
