-- Recurring transactions can repeat on chosen days of the week (e.g. Mon, Tue, Fri)
ALTER TABLE "recurrings" ADD COLUMN "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
