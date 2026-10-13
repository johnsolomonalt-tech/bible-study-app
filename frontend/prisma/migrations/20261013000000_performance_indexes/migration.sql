-- CreateIndex
CREATE INDEX "Note_userId_createdAt_idx" ON "Note"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Chat_userId_createdAt_idx" ON "Chat"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Message_chatId_createdAt_idx" ON "Message"("chatId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX "Highlight_userId_book_chapter_idx" ON "Highlight"("userId", "book", "chapter");
