-- Add customerId to AppNotification for per-user filtering
ALTER TABLE "app_notifications" ADD COLUMN "customerId" TEXT;
CREATE INDEX "app_notifications_customerId_idx" ON "app_notifications"("customerId");
