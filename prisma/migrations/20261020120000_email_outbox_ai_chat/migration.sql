CREATE TABLE "EmailNotification" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "bookingId" TEXT,
    "recipient" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailNotification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmailNotification_key_key" ON "EmailNotification"("key");
CREATE INDEX "EmailNotification_status_scheduledFor_idx" ON "EmailNotification"("status", "scheduledFor");
CREATE INDEX "EmailNotification_bookingId_kind_idx" ON "EmailNotification"("bookingId", "kind");

CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "category" "InterviewCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiConversation_userId_updatedAt_idx" ON "AiConversation"("userId", "updatedAt");
CREATE UNIQUE INDEX "AiConversation_scopeKey_key" ON "AiConversation"("scopeKey");
CREATE INDEX "AiConversation_bookingId_userId_idx" ON "AiConversation"("bookingId", "userId");
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AiChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "clientMessageId" TEXT,
    "replyToMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiChatMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiChatMessage_conversationId_createdAt_idx" ON "AiChatMessage"("conversationId", "createdAt");
CREATE UNIQUE INDEX "AiChatMessage_conversationId_clientMessageId_key" ON "AiChatMessage"("conversationId", "clientMessageId");
CREATE UNIQUE INDEX "AiChatMessage_replyToMessageId_key" ON "AiChatMessage"("replyToMessageId");
ALTER TABLE "AiChatMessage" ADD CONSTRAINT "AiChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
