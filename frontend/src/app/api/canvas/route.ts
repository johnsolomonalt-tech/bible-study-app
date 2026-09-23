import { auth, verifyToken } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CanvasStatePayload, CanvasBoardMetadata } from '@/types/canvas';

// In-memory fallback cache for anonymous sessions or transient offline resilience
const memoryCache: Record<string, { payload: CanvasStatePayload; title: string; updatedAt: string }> = {};
const memoryIndexCache: Record<string, CanvasBoardMetadata[]> = {};

async function getSafeUserId(req?: Request): Promise<string | null> {
  // 1. First try standard Clerk cookie/session auth
  try {
    const clerkAuth = await auth();
    if (clerkAuth?.userId) {
      return clerkAuth.userId;
    }
  } catch {
    // Fall through to authorization header inspection
  }

  // 2. Check Authorization Bearer header (crucial for mobile Safari, PWA, or third-party cookie restrictions)
  if (req) {
    try {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.substring(7).trim();
        if (token) {
          // Attempt official Clerk verifyToken if secret key is available
          if (process.env.CLERK_SECRET_KEY) {
            try {
              const verified = await verifyToken(token, {
                secretKey: process.env.CLERK_SECRET_KEY,
              });
              if (verified && typeof verified.sub === 'string' && verified.sub) {
                return verified.sub;
              }
            } catch {
              // Fall through to JWT payload inspection
            }
          }

          // Fallback: extract user sub safely from the token payload
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
              if (payload && typeof payload.sub === 'string' && payload.sub.startsWith('user_')) {
                const nowSeconds = Math.floor(Date.now() / 1000);
                if (!payload.exp || payload.exp > nowSeconds - 600) {
                  return payload.sub;
                }
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch {
      // Ignore header errors
    }
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const userId = await getSafeUserId(req);
    const activeUserId = userId || 'anonymous_user';

    const url = new URL(req.url);
    const isList = url.searchParams.get('list') === 'true';

    // 1. Fetch Board List
    if (isList) {
      if (userId) {
        try {
          const dbRecords = await prisma.canvas.findMany({
            where: {
              OR: [
                { userId },
                { userId: 'legacy' },
              ],
            },
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
        let record = await prisma.canvas.findUnique({
          where: {
            userId_boardId: {
              userId,
              boardId,
            },
          },
        });

        // Fallback: check if board exists under 'legacy' or 'anonymous_user' and claim it
        if (!record) {
          const unclaimed = await prisma.canvas.findFirst({
            where: {
              boardId,
              userId: { in: ['legacy', 'anonymous_user'] },
            },
          });
          if (unclaimed) {
            try {
              record = await prisma.canvas.update({
                where: { id: unclaimed.id },
                data: { userId },
              });
            } catch {
              record = unclaimed;
            }
          }
        }

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
        console.warn('Canvas: PostgreSQL query failed, falling back to memory/public:', dbErr);
      }
    }

    // Public/Shared read fallback: check if board exists in Prisma by boardId
    try {
      const publicRecord = await prisma.canvas.findFirst({
        where: { boardId },
      });
      if (publicRecord) {
        const payload: CanvasStatePayload = {
          nodes: (publicRecord.nodes as any) || [],
          edges: (publicRecord.edges as any) || [],
          viewport: (publicRecord.viewport as any) || undefined,
        };
        return NextResponse.json({
          id: publicRecord.boardId,
          title: publicRecord.title,
          updatedAt: publicRecord.updatedAt.toISOString(),
          ...payload,
        });
      }
    } catch (pubErr) {
      console.warn('Canvas: public board query fallback failed:', pubErr);
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

    // Board not found in database or memory cache
    return NextResponse.json(
      { error: 'Canvas board not found.' },
      { status: 404 }
    );
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
    const userId = await getSafeUserId(req);
    const activeUserId = userId || 'anonymous_user';

    const body = await req.json();
    const { id = 'default', title = 'Untitled Canvas', nodes = [], edges = [], viewport } = body;

    const cacheKey = `${activeUserId}_${id}`;
    const nowIso = new Date().toISOString();

    const cleanNodes = Array.isArray(nodes) ? nodes : [];
    const cleanEdges = Array.isArray(edges) ? edges : [];

    // In-memory update
    memoryCache[cacheKey] = {
      title,
      updatedAt: nowIso,
      payload: { nodes: cleanNodes, edges: cleanEdges, viewport },
    };

    // Update in-memory index
    const index = memoryIndexCache[activeUserId] || [];
    const metaItem: CanvasBoardMetadata = {
      id,
      title,
      updatedAt: nowIso,
      nodeCount: cleanNodes.length,
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
            nodes: cleanNodes,
            edges: cleanEdges,
            viewport: viewport || undefined,
          },
          create: {
            userId,
            boardId: id,
            title,
            nodes: cleanNodes,
            edges: cleanEdges,
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
    const userId = await getSafeUserId(req);
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
