ALTER TABLE public.deportistas ADD COLUMN IF NOT EXISTS region text
  CHECK (region IS NULL OR region IN ('Sierra','Costa','Amazonía','Insular'));