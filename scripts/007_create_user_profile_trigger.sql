-- 사용자 프로필 자동 생성을 위한 트리거 함수 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, display_name, user_code)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', '사용자'),
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거가 있다면 삭제
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 새 사용자가 생성될 때 프로필을 자동으로 생성하는 트리거
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RLS 정책 업데이트 (사용자가 자신의 데이터만 접근할 수 있도록)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 기존 정책들 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- 새 정책들 생성
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- 트리거 함수가 사용자 프로필을 생성할 수 있도록 허용
CREATE POLICY "Enable insert for authenticated users only" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);
