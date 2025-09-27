"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale" // 한국어 로케일 추가
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface Friend {
  id: string
  user_code: string
  display_name: string
}

interface LastMessage {
  content: string
  created_at: string
  sender_id: string
}

interface Conversation {
  id: string
  friend?: Friend
  lastMessage?: LastMessage
  unreadCount: number
}

interface ConversationsListProps {
  conversations: Conversation[]
  currentUserId: string
}

export function ConversationsList({ conversations: initialConversations, currentUserId }: ConversationsListProps) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel("conversation-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const newMessage = payload.new as any

          // Update conversations list with new message
          setConversations((prev) => {
            const updated = prev.map((conv) => {
              if (conv.friend?.id === newMessage.sender_id || conv.friend?.id === newMessage.receiver_id) {
                const isFromFriend = newMessage.sender_id === conv.friend?.id
                return {
                  ...conv,
                  lastMessage: {
                    content: newMessage.content,
                    created_at: newMessage.created_at,
                    sender_id: newMessage.sender_id,
                  },
                  unreadCount: isFromFriend ? conv.unreadCount + 1 : conv.unreadCount,
                }
              }
              return conv
            })

            // Sort by last message time
            return updated.sort((a, b) => {
              const aTime = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0
              const bTime = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0
              return bTime - aTime
            })
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, supabase])

  useEffect(() => {
    const channel = supabase
      .channel("read-status-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const updatedMessage = payload.new as any

          // Update unread count when messages are marked as read
          if (updatedMessage.is_read && updatedMessage.receiver_id === currentUserId) {
            setConversations((prev) =>
              prev.map((conv) => {
                if (conv.friend?.id === updatedMessage.sender_id) {
                  return {
                    ...conv,
                    unreadCount: Math.max(0, conv.unreadCount - 1),
                  }
                }
                return conv
              }),
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, supabase])

  return (
    <div className="divide-y divide-border">
      {conversations.map((conversation) => (
        <Link
          key={conversation.id}
          href={`/chat/${conversation.friend?.id}`}
          className="block p-4 hover:bg-accent transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-foreground truncate">{conversation.friend?.display_name}</h3>
                {conversation.lastMessage && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conversation.lastMessage.created_at), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground truncate">
                  {conversation.lastMessage ? (
                    <>
                      {conversation.lastMessage.sender_id === currentUserId ? "나: " : ""}
                      {conversation.lastMessage.content}
                    </>
                  ) : (
                    "아직 메시지가 없습니다"
                  )}
                </p>
                {conversation.unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
