-- CreateTable
CREATE TABLE "Note" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'legacy',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'legacy',
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "chatId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tracker" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'legacy',
    "chapterId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tracker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Highlight" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'legacy',
    "book" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Highlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Canvas" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'legacy',
    "title" TEXT NOT NULL DEFAULT 'Untitled Canvas',
    "nodes" JSONB NOT NULL DEFAULT '[]',
    "edges" JSONB NOT NULL DEFAULT '[]',
    "viewport" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Canvas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "anonymousId" TEXT NOT NULL DEFAULT 'anon',
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevAdminConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "passwordHash" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "adminUserId" TEXT,
    "adminEmail" TEXT,
    "allowedEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowedUserIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DevAdminConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tracker_userId_chapterId_key" ON "Tracker"("userId", "chapterId");

-- CreateIndex
CREATE INDEX "Canvas_userId_idx" ON "Canvas"("userId");

-- CreateIndex
CREATE INDEX "Canvas_boardId_idx" ON "Canvas"("boardId");

-- CreateIndex
CREATE UNIQUE INDEX "Canvas_userId_boardId_key" ON "Canvas"("userId", "boardId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_timestamp_idx" ON "AnalyticsEvent"("eventType", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_timestamp_idx" ON "AnalyticsEvent"("timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_anonymousId_timestamp_idx" ON "AnalyticsEvent"("anonymousId", "timestamp");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
