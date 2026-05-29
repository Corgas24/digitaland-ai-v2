-- SQL Migration: 20260529_support_tables.sql
-- Create support live chat and AI fallback infrastructure

-- 1. Create Support Agent Status Table
CREATE TABLE IF NOT EXISTS public.support_agent_status (
  id          text PRIMARY KEY, -- 'main_agent'
  status      text NOT NULL DEFAULT 'offline', -- 'active' (green), 'away' (yellow), 'offline' (red)
  updated_at  timestamptz DEFAULT now()
);

-- Seed initial status
INSERT INTO public.support_agent_status (id, status) 
VALUES ('main_agent', 'offline') 
ON CONFLICT (id) DO NOTHING;

-- 2. Create Support Chats Table
CREATE TABLE IF NOT EXISTS public.support_chats (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_session_id text NOT NULL,
  guest_name       text DEFAULT 'Visitor',
  status           text NOT NULL DEFAULT 'open', -- 'open', 'closed'
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- 3. Create Support Messages Table
CREATE TABLE IF NOT EXISTS public.support_messages (
  id          bigserial PRIMARY KEY,
  chat_id     uuid NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
  sender_role text NOT NULL, -- 'guest', 'agent', 'system'
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- 4. Enable Row Level Security (RLS) but make it accessible for our prototype (or bypass it)
ALTER TABLE public.support_agent_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Allow anonymous read access to agent status" ON public.support_agent_status
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow anonymous insert and select on chats" ON public.support_chats
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow anonymous insert and select on messages" ON public.support_messages
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role complete control" ON public.support_agent_status
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role complete control on chats" ON public.support_chats
  FOR ALL TO service_role USING (true);

CREATE POLICY "Allow service role complete control on messages" ON public.support_messages
  FOR ALL TO service_role USING (true);

-- 6. Add to realtime replication publication if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_agent_status;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chats;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  END IF;
END $$;
