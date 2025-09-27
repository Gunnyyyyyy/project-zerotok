-- Create users table with unique user codes
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_code VARCHAR(8) UNIQUE NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "users_select_own" ON public.users 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users 
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_delete_own" ON public.users 
  FOR DELETE USING (auth.uid() = id);

-- Allow users to search for other users by user_code (for friend adding)
CREATE POLICY "users_select_by_code" ON public.users 
  FOR SELECT USING (true);

-- Create index for user_code lookups
CREATE INDEX IF NOT EXISTS idx_users_user_code ON public.users(user_code);

-- Function to generate unique user codes
CREATE OR REPLACE FUNCTION generate_user_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  new_code VARCHAR(8);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    new_code := UPPER(
      SUBSTRING(
        MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) 
        FROM 1 FOR 8
      )
    );
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.users WHERE user_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;
