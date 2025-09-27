import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ChatMessages } from "@/components/chat-messages"
import { MessageInput } from "@/components/message-input"

interface ChatPageProps {
  params: Promise<{ friendId: string }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { friendId } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Verify friendship exists
  const { data: friendship, error: friendshipError } = await supabase
    .from("friendships")
    .select(`
      id,
      user_id,
      friend_id,
      friend_user:users!friendships_user_id_fkey (
        id,
        user_code,
        display_name
      ),
      friend_friend:users!friendships_friend_id_fkey (
        id,
        user_code,
        display_name
      )
    `)
    .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
    .eq("status", "accepted")
    .single()

  if (friendshipError || !friendship) {
    console.log("[v0] Friendship error:", friendshipError)
    redirect("/chat")
  }

  // Get messages between users
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select(`
      id,
      content,
      sender_id,
      receiver_id,
      is_read,
      created_at
    `)
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`,
    )
    .order("created_at", { ascending: true })

  if (messagesError) {
    console.error("Messages error:", messagesError)
  }

  // Mark messages as read
  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("sender_id", friendId)
    .eq("receiver_id", user.id)
    .eq("is_read", false)

  // Determine friend info based on user id
  const friendInfo = friendship.user_id === user.id ? friendship.friend_friend : friendship.friend_user

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-md mx-auto p-4 flex items-center space-x-4">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Link href="/chat">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-medium text-foreground">{friendInfo?.display_name}</h1>
            <p className="text-sm text-muted-foreground font-mono">{friendInfo?.user_code}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 max-w-md mx-auto w-full">
        <ChatMessages messages={messages || []} currentUserId={user.id} friendId={friendId} />
      </div>

      {/* Message Input */}
      <div className="border-t border-border bg-card">
        <div className="max-w-md mx-auto p-4">
          <MessageInput friendId={friendId} />
        </div>
      </div>
    </div>
  )
}
