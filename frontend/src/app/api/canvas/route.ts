import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { CanvasStatePayload, CanvasBoardMetadata } from '@/types/canvas';

function getStorageDir(): string {
  const candidate = path.join(process.cwd(), 'frontend');
  const base = fsSync.existsSync(candidate) ? candidate : process.cwd();
  return path.join(base, '.canvas_storage');
}

async function ensureDir() {
  try {
    const dir = getStorageDir();
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Already exists or non-fatal
  }
}

function sanitize(str: string) {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getIndexFilePath(userId: string) {
  return path.join(getStorageDir(), `canvas_index_${sanitize(userId)}.json`);
}

function getUserFilePath(userId: string, boardId: string = 'default') {
  return path.join(getStorageDir(), `canvas_${sanitize(userId)}_${sanitize(boardId)}.json`);
}

async function getSafeUserId(): Promise<string> {
  try {
    const clerkAuth = await auth();
    return clerkAuth?.userId || 'anonymous_user';
  } catch {
    return 'anonymous_user';
  }
}

// In-memory cache for ultra-fast access and serverless fallback
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
    if (Array.isArray(parsed)) {
      indexCache[userId] = parsed;
      return parsed;
    }
  } catch {
    // Ignore read failure
  }

  indexCache[userId] = [];
  return [];
}

async function writeUserIndex(userId: string, list: CanvasBoardMetadata[]) {
  indexCache[userId] = list;
  await ensureDir();
  const filePath = getIndexFilePath(userId);
  try {
    await fs.writeFile(filePath, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Canvas storage: Failed to write canvas index to disk (in-memory preserved):', err);
  }
}

export async function GET(req: Request) {
  try {
    const activeUserId = await getSafeUserId();

    const url = new URL(req.url);
    const isList = url.searchParams.get('list') === 'true';

    if (isList) {
      const list = await readUserIndex(activeUserId);
      return NextResponse.json(list);
    }

    const boardId = url.searchParams.get('id');
    if (!boardId) {
      return NextResponse.json({ error: 'Board ID is required.' }, { status: 400 });
    }
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
          viewport: parsed.viewport,
        },
      };
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({
        id: boardId,
        title: 'Untitled Canvas',
        nodes: [],
        edges: [],
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error: any) {
    console.error('Error in GET /api/canvas:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve canvas state.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const activeUserId = await getSafeUserId();

    const body = await req.json();
    const { id = 'default', title = 'Untitled Canvas', nodes = [], edges = [], viewport } = body;

    const cacheKey = `${activeUserId}_${id}`;
    const updatedAt = new Date().toISOString();

    const record = {
      id,
      title,
      nodes,
      edges,
      viewport,
      updatedAt,
    };

    memoryCache[cacheKey] = {
      title,
      updatedAt,
      payload: { nodes, edges, viewport },
    };

    // Persist to disk (non-fatal if disk is read-only)
    try {
      await ensureDir();
      const filePath = getUserFilePath(activeUserId, id);
      await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf-8');
    } catch (fsErr) {
      console.warn('Canvas storage: Disk write failed, relying on memory cache:', fsErr);
    }

    // Update boards index
    try {
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
    } catch (idxErr) {
      console.warn('Canvas storage: Index write failed:', idxErr);
    }

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
    const activeUserId = await getSafeUserId();

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
    try {
      const index = await readUserIndex(activeUserId);
      const updated = index.filter((b) => b.id !== id);
      await writeUserIndex(activeUserId, updated);
    } catch (idxErr) {
      console.warn('Canvas storage: Index update failed:', idxErr);
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('Error in DELETE /api/canvas:', error);
    return NextResponse.json(
      { error: 'Failed to delete canvas board.' },
      { status: 500 }
    );
  }
}
