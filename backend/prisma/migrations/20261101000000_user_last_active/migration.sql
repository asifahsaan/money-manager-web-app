-- When the user last used the app (shown in the admin panel)
ALTER TABLE "users" ADD COLUMN "lastActiveAt" TIMESTAMP(3);
