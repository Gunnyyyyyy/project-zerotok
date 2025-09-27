-- Create group chats table
CREATE TABLE IF NOT EXISTS public.group_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_chats
CREATE POLICY "group_chats_select_members" ON public.group_chats 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "group_chats_insert_own" ON public.group_chats 
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "group_chats_update_admin" ON public.group_chats 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = id AND user_id = auth.uid() AND is_admin = true
    )
  );

-- Create group members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.group_chats(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_members
CREATE POLICY "group_members_select_own" ON public.group_members 
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.group_members gm 
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "group_members_insert_admin" ON public.group_members 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = group_members.group_id AND user_id = auth.uid() AND is_admin = true
    ) OR
    EXISTS (
      SELECT 1 FROM public.group_chats 
      WHERE id = group_members.group_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "group_members_delete_admin" ON public.group_members 
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = group_members.group_id AND user_id = auth.uid() AND is_admin = true
    )
  );

-- Update messages table to support group chats
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.group_chats(id) ON DELETE CASCADE;

-- Update RLS policies for messages to include group messages
DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;
CREATE POLICY "messages_select_participants" ON public.messages 
  FOR SELECT USING (
    -- Direct messages
    (group_id IS NULL AND (sender_id = auth.uid() OR receiver_id = auth.uid())) OR
    -- Group messages
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = messages.group_id AND user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own" ON public.messages 
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND (
      -- Direct messages
      (group_id IS NULL AND receiver_id IS NOT NULL) OR
      -- Group messages
      (group_id IS NOT NULL AND receiver_id IS NULL AND EXISTS (
        SELECT 1 FROM public.group_members 
        WHERE group_id = messages.group_id AND user_id = auth.uid()
      ))
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON public.messages(group_id);
