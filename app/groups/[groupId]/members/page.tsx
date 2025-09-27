import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft, Crown, UserMinus } from "lucide-react"

interface PageProps {
  params: {
    groupId: string
  }
}

export default async function GroupMembersPage({ params }: PageProps) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Get group details and members
  const { data: group, error: groupError } = await supabase
    .from("group_chats")
    .select(`
      id,
      name,
      created_by,
      group_members(
        id,
        user_id,
        is_admin,
        joined_at,
        users(
          id,
          display_name,
          user_code
        )
      )
    `)
    .eq("id", params.groupId)
    .single()

  if (groupError || !group) {
    redirect("/groups")
  }

  // Check if current user is a member
  const currentUserMember = group.group_members?.find((m) => m.user_id === user.id)
  if (!currentUserMember) {
    redirect("/groups")
  }

  const isCurrentUserAdmin = currentUserMember.is_admin
  const members = group.group_members || []

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/groups/${params.groupId}`}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-sans text-foreground">멤버 관리</h1>
            <p className="text-sm text-muted-foreground">{group.name}</p>
          </div>
        </div>

        {/* Members List */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">멤버 ({members.length}명)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded border border-border">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-medium">{member.users?.display_name?.charAt(0) || "?"}</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-foreground">{member.users?.display_name}</span>
                      {member.is_admin && (
                        <Badge variant="secondary" className="text-xs">
                          <Crown className="w-3 h-3 mr-1" />
                          관리자
                        </Badge>
                      )}
                      {group.created_by === member.user_id && (
                        <Badge variant="outline" className="text-xs">
                          방장
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.users?.user_code}</p>
                  </div>
                </div>

                {/* Admin Actions */}
                {isCurrentUserAdmin && member.user_id !== user.id && group.created_by !== member.user_id && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actions */}
        {isCurrentUserAdmin && (
          <Card className="border-border">
            <CardContent className="p-4 space-y-3">
              <Button
                asChild
                variant="outline"
                className="w-full border-border text-foreground hover:bg-accent bg-transparent"
              >
                <Link href={`/groups/${params.groupId}/invite`}>멤버 초대</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Leave Group */}
        <Card className="border-border">
          <CardContent className="p-4">
            <Button
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
            >
              {group.created_by === user.id ? "단톡방 삭제" : "단톡방 나가기"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
