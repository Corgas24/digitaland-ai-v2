-- Execute no Supabase Dashboard → SQL Editor
--
-- 1. Renomeia coluna meta → metadata (já usada pelo código do gateway)
-- 2. Atualiza a função RPC para usar GREATEST (piso de saldo)
-- 3. Garante colunas faltantes em profiles
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Renomeia meta → metadata na tabela logs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logs' AND table_schema = 'public' AND column_name = 'meta'
  ) THEN
    ALTER TABLE public.logs RENAME COLUMN meta TO metadata;
    RAISE NOTICE 'Renomeada coluna meta → metadata';
  ELSE
    RAISE NOTICE 'Coluna metadata ja existe ou meta nao existe';
  END IF;
END $$;

-- 2. Atualiza a função RPC para usar a coluna correta
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
                             - GREATEST(p_cost, 0.001),
                             0
                           ),
         last_request_at = NOW()
   WHERE id = p_user_id;

  INSERT INTO public.logs (user_id, model, total_tokens, cost, metadata)
  VALUES (p_user_id, p_model, p_tokens_in + p_tokens_out, p_cost, p_meta);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Garante colunas que faltam em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_request_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin        boolean DEFAULT false;

-- 4. Garante tabela logs se nao existir
CREATE TABLE IF NOT EXISTS public.logs (
  id           bigserial PRIMARY KEY,
  user_id      uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model        text         NOT NULL,
  total_tokens int          NOT NULL DEFAULT 0,
  cost         numeric      NOT NULL DEFAULT 0,
  metadata     jsonb        DEFAULT '{}'::jsonb,
  created_at   timestamptz  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_user_id    ON public.logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs(created_at DESC);

COMMIT;
