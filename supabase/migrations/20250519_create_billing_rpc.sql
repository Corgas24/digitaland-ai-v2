-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: billing RPC + minimum_charge enforcement
-- Executar no Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Garante tabela logs com coluna correta 'meta' (a tabela existente usa 'meta')
CREATE TABLE IF NOT EXISTS public.logs (
  id           bigserial PRIMARY KEY,
  user_id      uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model        text         NOT NULL,
  total_tokens int          NOT NULL DEFAULT 0,
  cost         numeric      NOT NULL DEFAULT 0,
  meta         jsonb        DEFAULT '{}'::jsonb,
  created_at   timestamptz  NOT NULL DEFAULT NOW()
);

-- 2. Renomeia 'meta' → 'metadata' se ainda estiver como 'meta'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logs' AND table_schema = 'public' AND column_name = 'meta'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logs' AND table_schema = 'public' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.logs RENAME COLUMN meta TO metadata;
    RAISE NOTICE 'Renomeada coluna meta → metadata na tabela logs';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logs' AND table_schema = 'public' AND column_name = 'meta'
  ) THEN
    -- ambas as colunas existem: manter metadata (apagar meta se for duplicado)
    BEGIN
      ALTER TABLE public.logs DROP COLUMN IF EXISTS meta;
    EXCEPTION
      WHEN others THEN NULL;
    END;
    RAISE NOTICE 'Coluna meta removida (metadata ja existe)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_logs_user_id    ON public.logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs(created_at DESC);

-- 3. Função RPC atômica: desconta saldo + regista log em uma transação
--    p_cost chega COM piso aplicado (gateway garante Math.max(raw, 0.001))
CREATE OR REPLACE FUNCTION public.deduct_balance_and_log(
  p_user_id       uuid,
  p_model         text,
  p_tokens_in     int,
  p_tokens_out    int,
  p_cost          numeric,
  p_meta          jsonb DEFAULT '{}'::jsonb,
  p_req           int   DEFAULT 20,
  p_res           int   DEFAULT 40
) RETURNS void AS $$
BEGIN
  UPDATE public.profiles
     SET balance         = GREATEST(
                             COALESCE((SELECT balance FROM public.profiles WHERE id = p_user_id), 0)
                             - p_cost,
                             0
                           ),
         last_request_at = NOW()
   WHERE id = p_user_id;

  INSERT INTO public.logs (user_id, model, total_tokens, cost, metadata)
  VALUES (p_user_id, p_model, p_tokens_in + p_tokens_out, p_cost, p_meta);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Garante colunas que faltassem em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_request_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin        boolean DEFAULT false;

COMMIT;
