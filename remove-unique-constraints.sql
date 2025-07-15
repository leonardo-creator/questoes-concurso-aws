-- Remove all unique constraints from codigoReal field
-- First, find all unique constraints on the questions table
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find and drop all unique constraints that include codigoReal
    FOR constraint_name IN 
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'questions' 
          AND tc.constraint_type = 'UNIQUE'
          AND kcu.column_name = 'codigoReal'
    LOOP
        EXECUTE 'ALTER TABLE questions DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
    
    -- Also drop any indexes that enforce uniqueness on codigoReal
    FOR constraint_name IN 
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'questions' 
          AND indexdef LIKE '%UNIQUE%'
          AND indexdef LIKE '%codigoReal%'
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(constraint_name);
        RAISE NOTICE 'Dropped unique index: %', constraint_name;
    END LOOP;
END $$;

-- Allow NULL values in codigoReal
ALTER TABLE questions ALTER COLUMN "codigoReal" DROP NOT NULL;

-- Verify the changes
SELECT 
    constraint_name, 
    constraint_type, 
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'questions' 
  AND constraint_type = 'UNIQUE';
