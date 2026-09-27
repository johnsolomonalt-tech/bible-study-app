import { NextResponse } from 'next/server';
import { auth, verifyToken } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';
import { CanvasStatePayload, SerializableNode, SerializableEdge } from '@/types/canvas';

async function getSafeUserId(req?: Request): Promise<string | null> {
  try {
    const clerkAuth = await auth();
    if (clerkAuth?.userId) {
      return clerkAuth.userId;
    }
  } catch {}

  if (req) {
    try {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        const token = authHeader.substring(7).trim();
        if (token) {
          if (process.env.CLERK_SECRET_KEY) {
            try {
              const verified = await verifyToken(token, {
                secretKey: process.env.CLERK_SECRET_KEY,
              });
              if (verified && typeof verified.sub === 'string' && verified.sub) {
                return verified.sub;
              }
            } catch {}
          }
        }
      }
    } catch {}
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawCode = (body.code || body.sourceBoardId || '').trim();

    if (!rawCode) {
      return NextResponse.json({ error: 'Share link or board code is required.' }, { status: 400 });
    }

    // Extract boardId from link or raw code (e.g., https://.../share/canvas/board-123456 -> board-123456)
    let sourceBoardId = rawCode;
    const match = rawCode.match(/(?:share\/canvas\/|board-)([a-zA-Z0-9_-]+)/);
    if (match) {
      sourceBoardId = match[0].startsWith('share/canvas/') ? match[1] : match[0];
    }

    // 1. Look up the source board from PostgreSQL Prisma
    let sourceBoard: any = null;
    try {
      sourceBoard = await prisma.canvas.findFirst({
        where: { boardId: sourceBoardId },
      });
    } catch (dbErr) {
      console.warn('Canvas Import: DB lookup failed:', dbErr);
    }

    if (!sourceBoard) {
      return NextResponse.json(
        { error: 'Canvas board not found. Please verify the code or link and ensure the board exists.' },
        { status: 404 }
      );
    }

    // 2. Clone into recipient account
    const userId = await getSafeUserId(req);
    const targetUserId = userId || 'anonymous_user';
    const newBoardId = `board-${Date.now()}`;
    const newTitle = sourceBoard.title || 'Imported Canvas';
    const nodes = (sourceBoard.nodes as any) || [];
    const edges = (sourceBoard.edges as any) || [];
    const viewport = (sourceBoard.viewport as any) || undefined;

    let savedBoard: any = null;
    try {
      savedBoard = await prisma.canvas.create({
        data: {
          userId: targetUserId,
          boardId: newBoardId,
          title: newTitle,
          nodes,
          edges,
          viewport,
        },
      });
    } catch (saveErr) {
      console.warn('Canvas Import: DB insert failed, returning cloned payload for local storage:', saveErr);
    }

    const nowIso = new Date().toISOString();

    return NextResponse.json({
      success: true,
      board: {
        id: newBoardId,
        title: savedBoard?.title || newTitle,
        nodes,
        edges,
        viewport,
        nodeCount: Array.isArray(nodes) ? nodes.length : 0,
        updatedAt: savedBoard?.updatedAt?.toISOString() || nowIso,
        sourceBoardId,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/canvas/import:', error);
    return NextResponse.json(
      { error: 'Failed to import shared canvas.' },
      { status: 500 }
    );
  }
}
