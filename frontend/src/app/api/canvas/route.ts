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
    // Already exists
  }
}

function sanitize(str: string) {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getIndexFilePath(userId: string) {
  return path.join(STORAGE_DIR, `canvas_index_${sanitize(userId)}.json`);
}

function getUserFilePath(userId: string, boardId: string = 'default') {
  return path.join(STORAGE_DIR, `canvas_${sanitize(userId)}_${sanitize(boardId)}.json`);
}

// In-memory cache for rapid access
const memoryCache: Record<string, { payload: CanvasStatePayload; title: string; updatedAt: string }> = {};
const indexCache: Record<string, CanvasBoardMetadata[]> = {};

async function readUserIndex(userId: string): Promise<CanvasBoardMetadata[]> {
  if (indexCache[userId]) {
    return indexCache[userId];
  }
  await ensureDir();
  const filePath = getIndexFilePath(userId);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    indexCache[userId] = parsed;
    return parsed;
  } catch {
    const defaultIndex: CanvasBoardMetadata[] = [
      {
        id: 'default',
        title: 'Romans 8 Study',
        updatedAt: new Date().toISOString(),
        nodeCount: 3,
      },
    ];
    indexCache[userId] = defaultIndex;
    try {
      await fs.writeFile(filePath, JSON.stringify(defaultIndex, null, 2), 'utf-8');
    } catch {
      // Ignore write errors
    }
    return defaultIndex;
  }
}

async function writeUserIndex(userId: string, list: CanvasBoardMetadata[]) {
  indexCache[userId] = list;
  await ensureDir();
  const filePath = getIndexFilePath(userId);
  try {
    await fs.writeFile(filePath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write canvas index:', err);
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    const activeUserId = userId || 'anonymous_user';

    const url = new URL(req.url);
    const isList = url.searchParams.get('list') === 'true';

    if (isList) {
      const list = await readUserIndex(activeUserId);
      return NextResponse.json(list);
    }

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
        title: parsed.title || 'Untitled Canvas',
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        payload: {
          nodes: parsed.nodes || [],
          edges: parsed.edges || [],
        },
      };
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({
        id: boardId,
        title: boardId === 'default' ? 'Romans 8 Study' : 'Untitled Canvas',
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
    const { id = 'default', title = 'Untitled Canvas', nodes = [], edges = [] } = body;

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

    // Update boards index
    const index = await readUserIndex(activeUserId);
    const existingIdx = index.findIndex((b) => b.id === id);
    const metaItem: CanvasBoardMetadata = {
      id,
      title,
      updatedAt,
      nodeCount: nodes.length,
    };

    if (existingIdx >= 0) {
      index[existingIdx] = metaItem;
    } else {
      index.unshift(metaItem);
    }
    await writeUserIndex(activeUserId, index);

    return NextResponse.json({ success: true, id, title, updatedAt });
  } catch (error: any) {
    console.error('Error in POST /api/canvas:', error);
    return NextResponse.json(
      { error: 'Failed to persist canvas state.' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    const activeUserId = userId || 'anonymous_user';

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Board ID is required.' }, { status: 400 });
    }

    const cacheKey = `${activeUserId}_${id}`;
    delete memoryCache[cacheKey];

    // Remove file if exists
    try {
      const filePath = getUserFilePath(activeUserId, id);
      await fs.unlink(filePath);
    } catch {
      // Ignore if not on disk
    }

    // Update index
    const index = await readUserIndex(activeUserId);
    const updated = index.filter((b) => b.id !== id);
    await writeUserIndex(activeUserId, updated);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('Error in DELETE /api/canvas:', error);
    return NextResponse.json(
      { error: 'Failed to delete canvas board.' },
      { status: 500 }
    );
  }
}
