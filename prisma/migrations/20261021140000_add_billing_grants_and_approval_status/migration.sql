ALTER TYPE "PayoutStatus" ADD VALUE 'APPROVED';
ALTER TABLE "Payout" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Payout" ADD COLUMN "approvedBy" TEXT;

CREATE TABLE "BillingCreditGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentAttemptId" TEXT NOT NULL,
    "subscriptionItemId" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingCreditGrant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingCreditGrant_paymentAttemptId_subscriptionItemId_key"
ON "BillingCreditGrant"("paymentAttemptId", "subscriptionItemId");
CREATE INDEX "BillingCreditGrant_userId_createdAt_idx"
ON "BillingCreditGrant"("userId", "createdAt");
ALTER TABLE "BillingCreditGrant" ADD CONSTRAINT "BillingCreditGrant_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
