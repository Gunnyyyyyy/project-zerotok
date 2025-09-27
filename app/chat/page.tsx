import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { User, MessageCircle, Users, MessageSquare } from "lucide-react"
import { ConversationsList } from "@/components/conversations-list"

export default async function ChatPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Get conversations (friends with recent messages)
  const { data: conversations, error: conversationsError } = await supabase
    .from("friendships")
    .select(
      `
      id,
      friend:friend_id (
        id,
        user_code,
        display_name
      )
    `,
    )
    .eq("user_id", user.id)
    .eq("status", "accepted")

  if (conversationsError) {
    console.error("Conversations error:", conversationsError)
  }

  // Get recent messages for each conversation
  const conversationsWithMessages = await Promise.all(
    (conversations || []).map(async (conversation) => {
      const { data: lastMessage } = await supabase
        .from("messages")
        .select("content, created_at, sender_id")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${conversation.friend?.id}),and(sender_id.eq.${conversation.friend?.id},receiver_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      // Get unread count
      const { count: unreadCount } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", conversation.friend?.id)
        .eq("receiver_id", user.id)
        .eq("is_read", false)

      return {
        ...conversation,
        lastMessage,
        unreadCount: unreadCount || 0,
      }
    }),
  )

  // Sort by last message time
  conversationsWithMessages.sort((a, b) => {
    const aTime = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0
    const bTime = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0
    return bTime - aTime
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-md mx-auto p-4 flex items-center justify-between">
          <h1 className="text-2xl font-sans text-foreground">제로톡</h1>
          <div className="flex space-x-2">
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link href="/groups">
                <MessageSquare className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link href="/friends">
                <Users className="w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Link href="/profile">
                <User className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Conversations */}
      <div className="max-w-md mx-auto">
        {conversationsWithMessages.length > 0 ? (
          <ConversationsList conversations={conversationsWithMessages} currentUserId={user.id} />
        ) : (
          <div className="p-8 text-center">
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">아직 대화가 없습니다</h3>
            <p className="text-muted-foreground mb-4">친구를 추가해서 채팅을 시작해보세요</p>
            <div className="space-y-2">
              <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/friends">친구 추가</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-border text-foreground hover:bg-accent bg-transparent"
              >
                <Link href="/groups">단톡방 만들기</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
