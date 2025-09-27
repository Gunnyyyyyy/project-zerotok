-- Fix user code generation to ensure it works properly
-- Update the generate_user_code function to be more reliable
CREATE OR REPLACE FUNCTION generate_user_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  new_code VARCHAR(8);
  code_exists BOOLEAN;
  attempt_count INTEGER := 0;
  max_attempts INTEGER := 100;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code using a more reliable method
    new_code := UPPER(
      SUBSTRING(
        REPLACE(
          REPLACE(
            ENCODE(gen_random_bytes(6), 'base64'),
            '+', ''
          ),
          '/', ''
        )
        FROM 1 FOR 8
      )
    );
    
    -- Ensure we have exactly 8 characters by padding if necessary
    WHILE LENGTH(new_code) < 8 LOOP
      new_code := new_code || SUBSTRING('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', (RANDOM() * 35)::INTEGER + 1, 1);
    END LOOP;
    
    new_code := SUBSTRING(new_code FROM 1 FOR 8);
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.users WHERE user_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    IF NOT code_exists THEN
      EXIT;
    END IF;
    
    -- Prevent infinite loop
    attempt_count := attempt_count + 1;
    IF attempt_count >= max_attempts THEN
      RAISE EXCEPTION 'Unable to generate unique user code after % attempts', max_attempts;
    END IF;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_code VARCHAR(8);
  display_name_value VARCHAR(50);
BEGIN
  -- Generate user code
  new_user_code := generate_user_code();
  
  -- Get display name from metadata or use default
  display_name_value := COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'User');
  
  -- Insert user profile
  INSERT INTO public.users (id, user_code, display_name)
  VALUES (NEW.id, new_user_code, display_name_value)
  ON CONFLICT (id) DO UPDATE SET
    user_code = EXCLUDED.user_code,
    display_name = EXCLUDED.display_name,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Fix any existing users without user codes
DO $$
DECLARE
  user_record RECORD;
  new_code VARCHAR(8);
BEGIN
  FOR user_record IN 
    SELECT id FROM public.users WHERE user_code IS NULL OR user_code = ''
  LOOP
    new_code := generate_user_code();
    UPDATE public.users 
    SET user_code = new_code, updated_at = NOW()
    WHERE id = user_record.id;
  END LOOP;
END;
$$;
