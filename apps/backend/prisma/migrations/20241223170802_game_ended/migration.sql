-- AlterTable
ALTER TABLE "Game" ADD COLUMN "ended" BOOLEAN NOT NULL DEFAULT false;

-- Update all existing records to have ended = true
UPDATE "Game" SET "ended" = true;
