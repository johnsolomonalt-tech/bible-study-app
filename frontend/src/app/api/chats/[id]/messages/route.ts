import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { findCanonicalBook } from '@/lib/bibleCanon';
import { BIBLE_VERSE_REGEX } from '@/lib/bibleReferences';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Ordered fallback chain — fastest operational models prioritized
const CHAT_MODELS = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash'];

// Image gen model — Nano Banana 2, fall back to 2.5-flash-image
const IMAGE_GEN_MODELS = ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'];

const SYSTEM_INSTRUCTION = `You are 'Theologica AI', an intelligent Bible study assistant integrated natively into the Theologica web application. Your sole purpose is to help users study the Bible, understand scripture, and act as a guide through Christianity.

STRICT RULES:
1. Under NO CIRCUMSTANCES should you ever mention or reveal that you are developed by Google, that you are the Gemini model, or that you use Google's infrastructure. If asked about your identity, you are exclusively 'Theologica AI', created for this specific Bible app.
2. IMPORTANT THEOLOGICAL GUIDELINES: You are specifically a Christian guide. If a user asks you for reasons to believe in other religions (like Islam, the Quran, Hinduism, Buddhism, etc.), you must politely decline and state that your purpose is to guide them through Christianity and the Bible. Do not defend, promote, or provide apologetics for other religions. Keep all answers firmly rooted in a Christian perspective.

SCRIPTURE CITATION FORMATTING:
Whenever citing or referencing Bible passages or verses in your response, always cite them clearly in standard canonical book and chapter/verse notation (for example: **John 14:27**, **Romans 8:28**, **Genesis 1:1**, **Psalm 23:1**, **1 Corinthians 13:4-7**). Standard references are automatically converted into interactive links for the user to open and read directly in the application's Bible reader.

ORIGINAL LANGUAGE & ROOT WORD MANDATE:
Whenever a user asks a question about scripture, theology, biblical doctrines, Christian living, or Bible stories, in addition to providing your thorough biblical answer and relevant verses, you MUST always include the original Hebrew (for Old Testament concepts or texts) and/or Greek (for New Testament concepts or texts) root words.
For each key root word you introduce:
- Provide the original script (Hebrew characters e.g. חֶסֶד or Greek alphabet e.g. ἀγάπη).
- Provide the phonetic transliteration (e.g., *chesed*, *agape*, *shalom*, *logos*).
- Provide the Strong's Concordance reference number if available (e.g., Strong's H7965, Strong's G26).
- Explain its lexical and etymological meaning, showing how the original linguistic depth enriches the user's understanding of the biblical text or concept.
Blend these original language insights naturally and clearly into your response alongside scripture citations and practical applications.`;

// Keywords that suggest the user wants an image generated
const IMAGE_GEN_KEYWORDS = [
  'draw', 'generate an image', 'create an image', 'make an image', 'paint',
  'illustrate', 'visualize', 'show me a picture', 'create a picture',
  'generate a picture', 'make a picture', 'create a visual', 'depict',
  'render', 'generate art', 'create art', 'make art',
  'show me what', 'generate a photo', 'create a photo', 'make a photo'
];

function isImageGenerationRequest(content: string): boolean {
  const lower = content.toLowerCase();
  return IMAGE_GEN_KEYWORDS.some(kw => lower.includes(kw));
}

/** Returns true for errors that mean "try next model in fallback chain" */
function isRetryable(e: unknown): boolean {
  try {
    const err = e as any;
    const status = err?.status || err?.statusCode;
    if (status === 503 || status === 429 || status === 404 || status === 500) return true;
    const msg = String(err?.message || '');
    if (
      msg.includes('503') || msg.includes('429') || msg.includes('404') || msg.includes('500') ||
      msg.includes('NOT_FOUND') || msg.includes('UNAVAILABLE') || msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('overloaded') || msg.includes('quota') || msg.includes('rate limit') ||
      msg.includes('Model not found') || msg.includes('not supported')
    ) {
      return true;
    }
    const parsedCode = JSON.parse(msg)?.error?.code;
    return parsedCode === 503 || parsedCode === 429 || parsedCode === 404 || parsedCode === 500;
  } catch {
    return true;
  }
}

/** Run fn against each model in the chain until one succeeds */
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
      if (!isRetryable(e)) throw e; // non-retryable — bubble immediately
      console.warn(`Model ${model} unavailable, trying next...`);
    }
  }
  throw lastError;
}

interface ScriptureContext {
  reference: string;
  text: string;
  translation: string;
}

function resolveServerScripture(
  content: string,
  preferredTranslation = 'BSB'
): ScriptureContext | null {
  try {
    if (!content) return null;
    const regex = new RegExp(BIBLE_VERSE_REGEX.source, 'i');
    const match = regex.exec(content);
    if (!match) return null;

    const rawBook = match[1];
    const chapter = parseInt(match[2], 10);
    const startVerse = parseInt(match[3], 10);
    const endVerse = match[4] ? parseInt(match[4], 10) : startVerse;

    const bookMeta = findCanonicalBook(rawBook);
    if (!bookMeta) return null;

    const transLower = (preferredTranslation || 'bsb').toLowerCase();
    const safeTrans = ['bsb', 'web', 'kjv'].includes(transLower) ? transLower : 'bsb';
    const filePath = path.join(process.cwd(), 'public', 'bibles', safeTrans, `${bookMeta.code}.json`);
    if (!fs.existsSync(filePath)) return null;

    const fileRaw = fs.readFileSync(filePath, 'utf-8');
    const bookData = JSON.parse(fileRaw);
    const chapterVerses: { verse: number; text: string }[] = bookData.chapters?.[String(chapter)] || [];
    if (!chapterVerses.length) return null;

    const matchedVerses = chapterVerses.filter(
      (v) => v.verse >= startVerse && v.verse <= endVerse
    );
    if (!matchedVerses.length) return null;

    const text = matchedVerses.map((v) => `${v.verse}. ${v.text}`).join(' ');
    const ref = startVerse === endVerse
      ? `${bookMeta.name} ${chapter}:${startVerse}`
      : `${bookMeta.name} ${chapter}:${startVerse}-${endVerse}`;

    return {
      reference: ref,
      text,
      translation: safeTrans.toUpperCase(),
    };
  } catch (err) {
    console.warn('Failed to resolve server scripture RAG:', err);
    return null;
  }
}

const THEOLOGICAL_LENSES: Record<string, string> = {
  canonical: `[ACTIVE THEOLOGICAL LENS: CANONICAL / BALANCED]
You are operating from a canonical, Christ-centered, balanced biblical theology. Ground all analysis in the organic unity of the Old and New Testaments. Present mainstream orthodox Christian convictions with clarity, charity, and pastoral warmth.`,

  patristic: `[ACTIVE THEOLOGICAL LENS: PATRISTIC / EARLY CHURCH FATHERS]
You are specifically channeling the wisdom, exegesis, and spiritual theology of the Early Church Fathers (1st–6th centuries AD), such as Augustine of Hippo, John Chrysostom, Irenaeus of Lyons, Athanasius, Basil the Great, and the Desert Fathers.
- Prioritize classical Christology, the mystery of the Holy Trinity, the Incarnation, and the historic ecumenical creeds (Nicene, Apostles').
- Read Old Testament narratives through typological and Christological fulfillment, noting how the shadows of the Law find substance in Christ.
- Cite specific Patristic authors and classic ancient homilies when illustrating theological points.`,

  reformation: `[ACTIVE THEOLOGICAL LENS: REFORMATION / HISTORICAL PROTESTANT]
You are specifically channeling the historic Protestant Reformation and Post-Reformation heritage (Martin Luther, John Calvin, Charles Spurgeon, Jonathan Edwards, John Owen, Matthew Henry).
- Emphasize the five Solas: Sola Scriptura, Sola Gratia, Sola Fide, Solus Christus, Soli Deo Gloria.
- Highlight doctrines of sovereign grace, imputed righteousness through faith alone, covenant theology, and the supreme authority of God's Word.
- Use precise expository theology and quote or reference the Reformers and historic catechisms where helpful.`,

  scholarly: `[ACTIVE THEOLOGICAL LENS: MODERN EXEGETICAL & GRAMMATICAL-HISTORICAL]
You are operating as a world-class evangelical biblical scholar and exegete (in the tradition of F.F. Bruce, D.A. Carson, N.T. Wright, Gordon Fee, Richard Bauckham, and Michael Heiser).
- Provide rigorous historical-grammatical analysis, Second Temple Jewish background, Graeco-Roman cultural context, and ancient Near Eastern parallels.
- Pay strict attention to literary genre, grammatical discourse flow, connectives ('therefore', 'for', 'in order that'), and textual nuances.
- Maintain scholarly precision while remaining thoroughly committed to the truth of Scripture.`,

  contemplative: `[ACTIVE THEOLOGICAL LENS: CONTEMPLATIVE / DEVOTIONAL FORMATION]
You are guiding the user with a gentle, prayerful, contemplative heart focused on spiritual formation and intimate communion with God (in the spirit of Bernard of Clairvaux, Brother Lawrence, Thomas à Kempis, Dallas Willard, and Richard Foster).
- Emphasize personal devotion, inward heart renewal, abiding in Christ's love (John 15), silent adoration, and walking in the presence of God.
- Include thoughtful reflective questions that invite the user to examine their soul and pray before the Lord.`,
};

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const chat = await prisma.chat.findUnique({
    where: { id: parseInt(id), userId }
  });
  if (!chat) return new NextResponse('Forbidden', { status: 403 });

  const messages = await prisma.message.findMany({
    where: { chatId: parseInt(id) },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(messages);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const chatId = parseInt(id);
  const { content, image, scriptureContext, translation, theologicalLens } = await req.json();

  const chat = await prisma.chat.findUnique({
    where: { id: chatId, userId }
  });
  if (!chat) return new NextResponse('Forbidden', { status: 403 });

  const userMessage = await prisma.message.create({
    data: {
      content: content || '',
      role: 'user',
      chatId,
    },
  });

  // --- Route: Image Generation ---
  if (isImageGenerationRequest(content) && !image) {
    let imageGenSucceeded = false;
    try {
      const pixazoKey = process.env.PIXAZO_API_KEY;
      
      if (!pixazoKey) {
        // Fallback message if no API key is provided
        const aiMessage = await prisma.message.create({
          data: {
            content: "Image generation requires a Pixazo API key. Please add PIXAZO_API_KEY to your environment variables to enable Flux image generation.\n\nI can still help with Bible study — just ask me any question about scripture!",
            role: 'model',
            chatId,
          },
        });
        return NextResponse.json({ userMessage, aiMessage }, { status: 201 });
      }

      // 0. Verify if the image request is related to the Bible/Christianity
      const validationResponse = await withModelFallback(CHAT_MODELS, (model) =>
        ai.models.generateContent({
          model,
          contents: `Does the following image request relate to the Bible, Christianity, or biblical history/theology? Respond strictly with "YES" or "NO".\n\nRequest: "${content}"`,
          config: { temperature: 0.1 }
        })
      );
      
      const isBibleRelatedText = validationResponse.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() || '';
      const isBibleRelated = isBibleRelatedText.includes('YES');
      
      if (!isBibleRelated) {
        const aiMessage = await prisma.message.create({
          data: {
            content: "I'd love to help, but I can only generate images that are related to the Bible, Christianity, or biblical history. Please feel free to ask for any scriptural scenes or theological illustrations!",
            role: 'model',
            chatId,
          },
        });
        return NextResponse.json({ userMessage, aiMessage }, { status: 201 });
      }

      // 1. Call Pixazo API for image generation
      const prompt = `A beautiful, reverent, artistic Bible-themed image: ${content}`;
      const pixazoRes = await fetch('https://gateway.pixazo.ai/flux-1-schnell/v1/getData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Ocp-Apim-Subscription-Key': pixazoKey,
        },
        body: JSON.stringify({
          prompt: prompt,
          num_steps: 4,
          height: 512,
          width: 512,
          seed: Math.floor(Math.random() * 100000)
        })
      });

      if (!pixazoRes.ok) {
        throw new Error(`Pixazo API Error: ${pixazoRes.status} ${pixazoRes.statusText}`);
      }

      const data = await pixazoRes.json();
      const imageUrl = data.output;
      
      if (!imageUrl) {
        throw new Error("No output URL returned from Pixazo API");
      }

      // 2. Fetch the actual image from the returned URL to convert to base64
      const imageFetchRes = await fetch(imageUrl);
      if (!imageFetchRes.ok) {
         throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
      }
      
      const imageBuffer = await imageFetchRes.arrayBuffer();
      const generatedImageBase64 = Buffer.from(imageBuffer).toString('base64');
      const textResponse = "Here is the image you requested.";

      const aiContent = `__GENERATED_IMAGE__${generatedImageBase64}__END_IMAGE__\n\n${textResponse}`;

      const aiMessage = await prisma.message.create({
        data: { content: aiContent, role: 'model', chatId },
      });

      imageGenSucceeded = true;
      return NextResponse.json({ userMessage, aiMessage }, { status: 201 });
    } catch (err: unknown) {
      console.error('Image generation failed, falling back to text:', err);
      // Fall through to normal text response if anything fails
    }
  }

  // --- Route: Normal Text / Vision Response ---
  const pastMessages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: 'asc' },
  });

  const history = pastMessages
    .filter(m => m.id !== userMessage.id)
    .map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content.replace(/__GENERATED_IMAGE__[\s\S]*?__END_IMAGE__/g, '[generated image]') }],
    }));

  // RAG: Resolve verified scripture ground truth
  const resolvedGroundTruth: ScriptureContext | null =
    scriptureContext && scriptureContext.text
      ? scriptureContext
      : resolveServerScripture(content, translation || 'BSB');

  let effectiveSystemInstruction = SYSTEM_INSTRUCTION;
  if (resolvedGroundTruth) {
    effectiveSystemInstruction += `\n\n[VERIFIED SCRIPTURE GROUND TRUTH - RAG INJECTION]
The user is studying or asking about the following exact passage in their active translation (${resolvedGroundTruth.translation}):
Reference: ${resolvedGroundTruth.reference}
Passage Text: "${resolvedGroundTruth.text}"

MANDATORY ACCURACY INSTRUCTION:
You MUST treat the verse text above as the 100% authoritative ground truth. When referencing, quoting, or explaining this passage, use this exact translation text without speculating or altering the translation's wording.`;
  }

  if (theologicalLens && THEOLOGICAL_LENSES[theologicalLens]) {
    effectiveSystemInstruction += `\n\n${THEOLOGICAL_LENSES[theologicalLens]}`;
  }

  // Build current message parts — support optional inline image
  type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
  const messageParts: Part[] = [];
  if (image?.base64 && image?.mimeType) {
    messageParts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  }

  if (resolvedGroundTruth) {
    messageParts.push({
      text: `[Context: Verified scripture text for ${resolvedGroundTruth.reference} (${resolvedGroundTruth.translation}): "${resolvedGroundTruth.text}"]\n\n${content || 'Please provide an in-depth biblical study on this passage.'}`,
    });
  } else {
    messageParts.push({ text: content || 'Please describe this image in the context of Bible study.' });
  }

  const aiResponseText = await withModelFallback(CHAT_MODELS, async (model) => {
    const chatSession = ai.chats.create({
      model,
      history,
      config: { systemInstruction: effectiveSystemInstruction },
    });
    const result = await chatSession.sendMessage({ message: messageParts });
    return result.text ?? '';
  });

  const aiMessage = await prisma.message.create({
    data: { content: aiResponseText, role: 'model', chatId },
  });

  return NextResponse.json({ userMessage, aiMessage }, { status: 201 });
}
