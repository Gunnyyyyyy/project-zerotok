import { redirect } from "next/navigation"
import { createClient, getUserFromHeaders } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Users, MessageSquare } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import { CopyCodeButton } from "@/components/copy-code-button"

export default async function ProfilePage() {
  // Get user from middleware headers to avoid duplicate auth calls
  const user = await getUserFromHeaders()
  
  if (!user) {
    redirect("/auth/login")
  }

  const supabase = await createClient()

  // Get user profile with user code
  let profile = null
  let profileError = null

  const { data: profileData, error: fetchError } = await supabase
    .from("users")
    .select("user_code, display_name")
    .eq("id", user.id)
    .single()

  if (fetchError) {
    console.error("Profile error:", fetchError)
    profileError = fetchError

    // If profile doesn't exist, try to create it
    if (fetchError.code === "PGRST116") {
      // No rows returned
      const generateUserCode = () => {
        return Math.random().toString(36).substring(2, 10).toUpperCase()
      }

      const { data: newProfile, error: createError } = await supabase
        .from("users")
        .insert({
          id: user.id,
          user_code: generateUserCode(),
          display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "사용자",
        })
        .select("user_code, display_name")
        .single()

      if (!createError && newProfile) {
        profile = newProfile
        profileError = null
      }
    }
  } else {
    profile = profileData
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-sans text-foreground">프로필</h1>
          <LogoutButton />
        </div>

        {/* User Info Card */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">{profile?.display_name || "사용자"}</CardTitle>
            <CardDescription className="text-muted-foreground">{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">나의 고유 코드:</p>
              <div className="flex items-center space-x-2">
                <code className="bg-muted px-3 py-2 rounded text-foreground font-mono text-lg">
                  {profile?.user_code || "생성 중..."}
                </code>
                {profile?.user_code && <CopyCodeButton code={profile.user_code} />}
              </div>
              <p className="text-xs text-muted-foreground">이 코드를 친구들과 공유해서 연결하세요</p>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="space-y-3">
          <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/friends">
              <Users className="w-4 h-4 mr-2" />
              친구 관리
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full border-border text-foreground hover:bg-accent bg-transparent"
          >
            <Link href="/groups">
              <MessageSquare className="w-4 h-4 mr-2" />
              단톡방
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full border-border text-foreground hover:bg-accent bg-transparent"
          >
            <Link href="/chat">채팅으로 돌아가기</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
