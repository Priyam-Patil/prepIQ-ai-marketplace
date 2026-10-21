CREATE TABLE "SessionFeedback" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "intervieweeId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SessionFeedback_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SessionFeedback_bookingId_key" ON "SessionFeedback"("bookingId");
CREATE INDEX "SessionFeedback_intervieweeId_createdAt_idx" ON "SessionFeedback"("intervieweeId", "createdAt");
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_intervieweeId_fkey" FOREIGN KEY ("intervieweeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
