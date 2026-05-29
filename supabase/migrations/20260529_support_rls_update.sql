-- SQL Migration: 20260529_support_rls_update.sql
-- Relax RLS restrictions so that authenticated admin users can modify agent status and reply to chats

-- 1. Drop existing policies on support_agent_status
DROP POLICY IF EXISTS "Allow anonymous read access to agent status" ON public.support_agent_status;
DROP POLICY IF EXISTS "Allow service role complete control" ON public.support_agent_status;

-- 2. Drop existing policies on support_chats
DROP POLICY IF EXISTS "Allow anonymous insert and select on chats" ON public.support_chats;
DROP POLICY IF EXISTS "Allow service role complete control on chats" ON public.support_chats;

-- 3. Drop existing policies on support_messages
DROP POLICY IF EXISTS "Allow anonymous insert and select on messages" ON public.support_messages;
DROP POLICY IF EXISTS "Allow service role complete control on messages" ON public.support_messages;

-- 4. Create new relaxed policies allowing FULL access for both anon and authenticated users
CREATE POLICY "Allow full access on support_agent_status" ON public.support_agent_status
  FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access on support_chats" ON public.support_chats
  FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access on support_messages" ON public.support_messages
  FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
