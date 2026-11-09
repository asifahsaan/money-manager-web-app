-- Activity log: every change to an account's records, kept with before/after values
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "userId" INTEGER,
    "requestId" VARCHAR(36) NOT NULL,
    "method" VARCHAR(8) NOT NULL,
    "path" VARCHAR(200) NOT NULL,
    "entity" VARCHAR(30) NOT NULL,
    "entityId" INTEGER,
    "action" VARCHAR(10) NOT NULL,
    "changed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sideEffect" BOOLEAN NOT NULL DEFAULT false,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_accountId_createdAt_idx" ON "audit_logs"("accountId", "createdAt");
CREATE INDEX "audit_logs_requestId_idx" ON "audit_logs"("requestId");

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
