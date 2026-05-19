-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: billing RPC + minimum_charge enforcement
-- Executar no Supabase Dashboard → SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Tabela de logs (se não existir)
CREATE TABLE IF NOT EXISTS public.logs (
  id           bigserial PRIMARY KEY,
  user_id      uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model        text         NOT NULL,
  total_tokens int          NOT NULL DEFAULT 0,
  cost         numeric      NOT NULL DEFAULT 0,
  metadata     jsonb        DEFAULT '{}'::jsonb,
  created_at   timestamptz  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_user_id      ON public.logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at   ON public.logs(created_at DESC);

-- 2. Função RPC atômica: desconta saldo + regista log em uma transação
--    p_cost deve chegar já com piso aplicado (o gateway garante isso)
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

-- 3. Garantir colunas que faltassem na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_request_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin        boolean DEFAULT false;

COMMIT;
