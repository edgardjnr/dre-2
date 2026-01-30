DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contas_contabeis'
      AND column_name = 'categoria'
  ) THEN
    ALTER TABLE public.contas_contabeis
      ALTER COLUMN categoria TYPE text
      USING categoria::text;
  END IF;
END $$;

DROP TYPE IF EXISTS public.conta_categoria_enum;

