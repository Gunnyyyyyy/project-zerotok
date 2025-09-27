import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { ArrowLeft, Settings, Trash2 } from "lucide-react"

interface PageProps {
  params: {
    groupId: string
  }
}

export default async function GroupSettingsPage({ params }: PageProps) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Get group details and verify admin access
  const { data: group, error: groupError } = await supabase
    .from("group_chats")
    .select(`
      id,
      name,
      description,
      created_by,
      group_members!inner(
        user_id,
        is_admin
      )
    `)
    .eq("id", params.groupId)
    .eq("group_members.user_id", user.id)
    .single()

  if (groupError || !group) {
    redirect("/groups")
  }

  const currentUserMember = group.group_members?.find((m) => m.user_id === user.id)
  const isAdmin = currentUserMember?.is_admin || false

  if (!isAdmin) {
    redirect(`/groups/${params.groupId}`)
  }

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
            <h1 className="text-2xl font-sans text-foreground">단톡방 설정</h1>
            <p className="text-sm text-muted-foreground">{group.name}</p>
          </div>
        </div>

        {/* Group Settings */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <Settings className="w-5 h-5 mr-2" />
              기본 설정
            </CardTitle>
            <CardDescription className="text-muted-foreground">단톡방 정보를 수정할 수 있습니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName" className="text-foreground">
                단톡방 이름
              </Label>
              <Input
                id="groupName"
                type="text"
                defaultValue={group.name}
                className="bg-background border-border text-foreground"
                disabled
              />
              <p className="text-xs text-muted-foreground">단톡방 이름 변경 기능은 곧 추가될 예정입니다</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">
                설명
              </Label>
              <Textarea
                id="description"
                defaultValue={group.description || ""}
                className="bg-background border-border text-foreground resize-none"
                rows={3}
                disabled
              />
              <p className="text-xs text-muted-foreground">설명 변경 기능은 곧 추가될 예정입니다</p>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        {group.created_by === user.id && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <Trash2 className="w-5 h-5 mr-2" />
                위험 구역
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                이 작업은 되돌릴 수 없습니다. 신중하게 결정해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" className="w-full" disabled>
                단톡방 삭제 (곧 지원 예정)
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
