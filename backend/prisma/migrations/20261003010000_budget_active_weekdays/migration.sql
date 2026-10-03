-- Budgets can say which days of the week the money is spent on (e.g. transport Mon-Fri)
ALTER TABLE "budgets" ADD COLUMN "activeWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
