-- DropIndex
DROP INDEX "public"."conversations_patientId_startedAt_idx";

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "caregiverId" TEXT,
ADD COLUMN     "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "lettaMessageId" TEXT;

-- CreateIndex
CREATE INDEX "conversations_patientId_lastMessageAt_idx" ON "conversations"("patientId", "lastMessageAt" DESC);

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "caregivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
