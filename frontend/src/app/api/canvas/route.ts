import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CanvasStatePayload, CanvasBoardMetadata } from '@/types/canvas';

// In-memory fallback cache for anonymous sessions or transient offline resilience
const memoryCache: Record<string, { payload: CanvasStatePayload; title: string; updatedAt: string }> = {};
const memoryIndexCache: Record<string, CanvasBoardMetadata[]> = {};

async function getSafeUserId(): Promise<string | null> {
  try {
    const clerkAuth = await auth();
    return clerkAuth?.userId || null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const userId = await getSafeUserId();
    const activeUserId = userId || 'anonymous_user';

    const url = new URL(req.url);
    const isList = url.searchParams.get('list') === 'true';

    // 1. Fetch Board List
    if (isList) {
      if (userId) {
        try {
          const dbRecords = await prisma.canvas.findMany({
            where: { userId },
            select: {
              boardId: true,
              title: true,
              updatedAt: true,
              nodes: true,
            },
            orderBy: { updatedAt: 'desc' },
          });

          const list: CanvasBoardMetadata[] = dbRecords.map((r) => ({
            id: r.boardId,
            title: r.title,
            updatedAt: r.updatedAt.toISOString(),
            nodeCount: Array.isArray(r.nodes) ? r.nodes.length : 0,
          }));

          memoryIndexCache[userId] = list;
          return NextResponse.json(list);
        } catch (dbErr) {
          console.warn('Canvas: PostgreSQL list query failed, falling back to memory:', dbErr);
        }
      }

      // Anonymous / memory fallback
      const fallbackList = memoryIndexCache[activeUserId] || [];
      return NextResponse.json(fallbackList);
    }

    // 2. Fetch Single Board
    const boardId = url.searchParams.get('id');
    if (!boardId) {
      return NextResponse.json({ error: 'Board ID is required.' }, { status: 400 });
    }

    const cacheKey = `${activeUserId}_${boardId}`;

    if (userId) {
      try {
        const record = await prisma.canvas.findUnique({
          where: {
            userId_boardId: {
              userId,
              boardId,
            },
          },
        });

        if (record) {
          const payload: CanvasStatePayload = {
            nodes: (record.nodes as any) || [],
            edges: (record.edges as any) || [],
            viewport: (record.viewport as any) || undefined,
          };

          memoryCache[cacheKey] = {
            title: record.title,
            updatedAt: record.updatedAt.toISOString(),
            payload,
          };

          return NextResponse.json({
            id: record.boardId,
            title: record.title,
            updatedAt: record.updatedAt.toISOString(),
            ...payload,
          });
        }
      } catch (dbErr) {
        console.warn(`Canvas: PostgreSQL board query failed for ${boardId}, falling back:`, dbErr);
      }
    }

    // Check memory cache
    if (memoryCache[cacheKey]) {
      return NextResponse.json({
        id: boardId,
        title: memoryCache[cacheKey].title,
        updatedAt: memoryCache[cacheKey].updatedAt,
        ...memoryCache[cacheKey].payload,
      });
    }

    // Default blank board if completely new
    return NextResponse.json({
      id: boardId,
      title: 'Untitled Canvas',
      nodes: [],
      edges: [],
      updatedAt: new Date().toISOString(),
    });
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
    const userId = await getSafeUserId();
    const activeUserId = userId || 'anonymous_user';

    const body = await req.json();
    const { id = 'default', title = 'Untitled Canvas', nodes = [], edges = [], viewport } = body;

    const cacheKey = `${activeUserId}_${id}`;
    const nowIso = new Date().toISOString();

    // In-memory update
    memoryCache[cacheKey] = {
      title,
      updatedAt: nowIso,
      payload: { nodes, edges, viewport },
    };

    // Update in-memory index
    const index = memoryIndexCache[activeUserId] || [];
    const metaItem: CanvasBoardMetadata = {
      id,
      title,
      updatedAt: nowIso,
      nodeCount: nodes.length,
    };
    const existingIdx = index.findIndex((b) => b.id === id);
    if (existingIdx >= 0) {
      index[existingIdx] = metaItem;
    } else {
      index.unshift(metaItem);
    }
    memoryIndexCache[activeUserId] = index;

    // Persist directly to PostgreSQL database under user account
    if (userId) {
      try {
        const saved = await prisma.canvas.upsert({
          where: {
            userId_boardId: {
              userId,
              boardId: id,
            },
          },
          update: {
            title,
            nodes,
            edges,
            viewport: viewport || undefined,
          },
          create: {
            userId,
            boardId: id,
            title,
            nodes,
            edges,
            viewport: viewport || undefined,
          },
        });

        return NextResponse.json({
          success: true,
          id: saved.boardId,
          title: saved.title,
          updatedAt: saved.updatedAt.toISOString(),
        });
      } catch (dbErr) {
        console.error('Canvas: PostgreSQL upsert error (in-memory cached):', dbErr);
      }
    }

    return NextResponse.json({ success: true, id, title, updatedAt: nowIso });
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
    const userId = await getSafeUserId();
    const activeUserId = userId || 'anonymous_user';

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Board ID is required.' }, { status: 400 });
    }

    const cacheKey = `${activeUserId}_${id}`;
    delete memoryCache[cacheKey];

    if (memoryIndexCache[activeUserId]) {
      memoryIndexCache[activeUserId] = memoryIndexCache[activeUserId].filter((b) => b.id !== id);
    }

    // Delete from PostgreSQL database
    if (userId) {
      try {
        await prisma.canvas.deleteMany({
          where: {
            userId,
            boardId: id,
          },
        });
      } catch (dbErr) {
        console.error('Canvas: PostgreSQL delete error:', dbErr);
      }
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
