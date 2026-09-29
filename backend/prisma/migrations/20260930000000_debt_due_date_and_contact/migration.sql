-- Debt reminders: due date and the other person's contact details
ALTER TABLE "debts" ADD COLUMN "dueDate" DATE;
ALTER TABLE "debts" ADD COLUMN "contactPhone" VARCHAR(30);
ALTER TABLE "debts" ADD COLUMN "contactEmail" VARCHAR(150);
