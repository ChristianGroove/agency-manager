-- Fix Foreign Keys to allow Lead Deletion (SET NULL instead of RESTRICT)

DO $$ 
BEGIN
  -- 1. FIX QUOTES
  -- Check if constraint exists and drop it to recreate with ON DELETE SET NULL
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'quotes_lead_id_fkey') THEN
    ALTER TABLE "quotes" DROP CONSTRAINT "quotes_lead_id_fkey";
  END IF;
  
  -- Add new constraint (CASCADE deletes the quote when lead is deleted)
  ALTER TABLE "quotes" 
    ADD CONSTRAINT "quotes_lead_id_fkey" 
    FOREIGN KEY ("lead_id") 
    REFERENCES "leads"("id") 
    ON DELETE CASCADE;

  -- 2. FIX CONVERSATIONS (Check if lead_id column exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'conversations' AND column_name = 'lead_id') THEN
      -- Try to drop likely FK name
      BEGIN
        ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_lead_id_fkey";
      EXCEPTION WHEN OTHERS THEN NULL; END;

      -- Add/Ensure constraint is CASCADE
      ALTER TABLE "conversations" 
        ADD CONSTRAINT "conversations_lead_id_fkey" 
        FOREIGN KEY ("lead_id") 
        REFERENCES "leads"("id") 
        ON DELETE CASCADE;
  END IF;

END $$;
