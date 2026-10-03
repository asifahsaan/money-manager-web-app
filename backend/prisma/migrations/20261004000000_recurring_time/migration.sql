-- Recurring transactions can carry a time of day (HH:MM)
ALTER TABLE "recurrings" ADD COLUMN "time" VARCHAR(5);
