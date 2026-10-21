CREATE TABLE "StreamRecording" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "streamEgressId" TEXT NOT NULL,
  "recordingUrl" TEXT NOT NULL,
  "readyAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StreamRecording_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StreamRecording_streamEgressId_key" ON "StreamRecording"("streamEgressId");
CREATE INDEX "StreamRecording_bookingId_readyAt_idx" ON "StreamRecording"("bookingId", "readyAt");
ALTER TABLE "StreamRecording" ADD CONSTRAINT "StreamRecording_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
