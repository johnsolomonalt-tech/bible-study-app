import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { CanvasStatePayload, CanvasBoardMetadata } from '@/types/canvas';

// Local storage directory fallback for persistence
const STORAGE_DIR = path.join(process.cwd(), '.canvas_storage');

async function ensureDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch {
    // Already exists or ignore
  }
}

function getUserFilePath(userId: string, boardId: string = 'default') {
  const safeUser = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeBoard = boardId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(STORAGE_DIR, `canvas_${safeUser}_${safeBoard}.json`);
}

// In-memory cache for rapid access
const memoryCache: Record<string, { payload: CanvasStatePayload; title: string; updatedAt: string }> = {};

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    const activeUserId = userId || 'anonymous_user';

    const url = new URL(req.url);
    const boardId = url.searchParams.get('id') || 'default';
    const cacheKey = `${activeUserId}_${boardId}`;

    // 1. Check memory cache
    if (memoryCache[cacheKey]) {
      return NextResponse.json({
        id: boardId,
        title: memoryCache[cacheKey].title,
        updatedAt: memoryCache[cacheKey].updatedAt,
        ...memoryCache[cacheKey].payload,
      });
    }

    // 2. Check disk storage
    await ensureDir();
    const filePath = getUserFilePath(activeUserId, boardId);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      memoryCache[cacheKey] = {
        title: parsed.title || 'My Theological Canvas',
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        payload: {
          nodes: parsed.nodes || [],
          edges: parsed.edges || [],
        },
      };
      return NextResponse.json(parsed);
    } catch {
      // Return empty canvas template
      return NextResponse.json({
        id: boardId,
        title: 'Theological Study Canvas',
        nodes: [],
        edges: [],
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error('Error in GET /api/canvas:', error);
    return NextResponse.json(
      { id: 'default', title: 'Theological Study Canvas', nodes: [], edges: [] },
      { status: 200 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const activeUserId = userId || 'anonymous_user';

    const body = await req.json();
    const { id = 'default', title = 'Theological Study Canvas', nodes = [], edges = [] } = body;

    const cacheKey = `${activeUserId}_${id}`;
    const updatedAt = new Date().toISOString();

    const record = {
      id,
      title,
      nodes,
      edges,
      updatedAt,
    };

    memoryCache[cacheKey] = {
      title,
      updatedAt,
      payload: { nodes, edges },
    };

    // Persist to file
    await ensureDir();
    const filePath = getUserFilePath(activeUserId, id);
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');

    return NextResponse.json({ success: true, id, title, updatedAt });
  } catch (error: any) {
    console.error('Error in POST /api/canvas:', error);
    return NextResponse.json(
      { error: 'Failed to persist canvas state.' },
      { status: 500 }
    );
  }
}
