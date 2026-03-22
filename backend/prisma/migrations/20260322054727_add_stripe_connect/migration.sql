/*
  Warnings:

  - A unique constraint covering the columns `[stripe_connect_account_id]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "connect_onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripe_connect_account_id" TEXT;

-- CreateTable
CREATE TABLE "revenue_events" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "stripe_invoice_id" TEXT NOT NULL,
    "gross_amount" INTEGER NOT NULL,
    "platform_fee" INTEGER NOT NULL,
    "creator_payout" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "learner_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "revenue_events_stripe_invoice_id_key" ON "revenue_events"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "revenue_events_org_id_idx" ON "revenue_events"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripe_connect_account_id_key" ON "organizations"("stripe_connect_account_id");

-- AddForeignKey
ALTER TABLE "revenue_events" ADD CONSTRAINT "revenue_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
