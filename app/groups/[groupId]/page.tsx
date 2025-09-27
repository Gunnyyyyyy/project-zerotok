import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { GroupChatMessages } from "@/components/group-chat-messages"
import { GroupMessageInput } from "@/components/group-message-input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Users, Settings } from "lucide-react"

interface PageProps {
  params: {
    groupId: string
  }
}

export default async function GroupChatPage({ params }: PageProps) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Get group details and verify membership
  const { data: group, error: groupError } = await supabase
    .from("group_chats")
    .select(`
      id,
      name,
      description,
      created_by,
      group_members!inner(
        user_id,
        is_admin,
        users(display_name)
      )
    `)
    .eq("id", params.groupId)
    .eq("group_members.user_id", user.id)
    .single()

  if (groupError || !group) {
    redirect("/groups")
  }

  const memberCount = group.group_members?.length || 0
  const isAdmin = group.group_members?.some((m) => m.user_id === user.id && m.is_admin) || false

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-background border-b border-border p-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/groups">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div>
              <h1 className="font-medium text-foreground">{group.name}</h1>
              <p className="text-xs text-muted-foreground">멤버 {memberCount}명</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/groups/${params.groupId}/members`}>
                <Users className="w-4 h-4" />
              </Link>
            </Button>
            {isAdmin && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/groups/${params.groupId}/settings`}>
                  <Settings className="w-4 h-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-md mx-auto h-full">
          <GroupChatMessages groupId={params.groupId} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-background border-t border-border p-4">
        <div className="max-w-md mx-auto">
          <GroupMessageInput groupId={params.groupId} />
        </div>
      </div>
    </div>
  )
}
