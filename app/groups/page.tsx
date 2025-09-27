import { redirect } from "next/navigation"
import { createClient, getUserFromHeaders } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Users, MessageCircle } from "lucide-react"

export default async function GroupsPage() {
  // Get user from middleware headers to avoid duplicate auth calls
  const user = await getUserFromHeaders()
  
  if (!user) {
    redirect("/auth/login")
  }

  const supabase = await createClient()

  // Get user's groups
  const { data: groups, error: groupsError } = await supabase
    .from("group_chats")
    .select(`
      id,
      name,
      description,
      created_at,
      group_members!inner(
        user_id,
        is_admin,
        users(display_name)
      )
    `)
    .eq("group_members.user_id", user.id)
    .order("created_at", { ascending: false })

  if (groupsError) {
    console.error("Groups error:", groupsError)
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-sans text-foreground">단톡방</h1>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/groups/create">
              <Plus className="w-4 h-4 mr-1" />
              만들기
            </Link>
          </Button>
        </div>

        {/* Groups List */}
        <div className="space-y-3">
          {groups && groups.length > 0 ? (
            groups.map((group) => {
              const memberCount = group.group_members?.length || 0
              return (
                <Card key={group.id} className="border-border hover:bg-accent/50 transition-colors">
                  <CardContent className="p-4">
                    <Link href={`/groups/${group.id}`} className="block">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate">{group.name}</h3>
                          <p className="text-sm text-muted-foreground">멤버 {memberCount}명</p>
                          {group.description && (
                            <p className="text-xs text-muted-foreground truncate mt-1">{group.description}</p>
                          )}
                        </div>
                        <MessageCircle className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              )
            })
          ) : (
            <Card className="border-border">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">단톡방이 없습니다</h3>
                <p className="text-muted-foreground mb-4">친구들과 함께 대화할 단톡방을 만들어보세요</p>
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/groups/create">
                    <Plus className="w-4 h-4 mr-2" />첫 번째 단톡방 만들기
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navigation */}
        <div className="space-y-3">
          <Button
            asChild
            variant="outline"
            className="w-full border-border text-foreground hover:bg-accent bg-transparent"
          >
            <Link href="/chat">개인 채팅으로 돌아가기</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
