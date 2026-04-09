-- Add new columns for enhanced saved replies
ALTER TABLE "public"."saved_replies"
ADD COLUMN IF NOT EXISTS "icon" text,
ADD COLUMN IF NOT EXISTS "is_favorite" boolean DEFAULT false;

-- Update existing rows to have default values
UPDATE "public"."saved_replies"
SET is_favorite = false
WHERE is_favorite IS NULL;

-- Update specific seed data to be favorites for testing
UPDATE "public"."saved_replies"
SET is_favorite = true, icon = '👋'
WHERE title = '👋 Bienvenida';

UPDATE "public"."saved_replies"
SET is_favorite = true, icon = '💸'
WHERE title = '💸 Precios Estándar';
