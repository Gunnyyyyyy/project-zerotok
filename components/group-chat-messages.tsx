"use client"

import { useEffect, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface GroupMessage {
  id: string
  content: string
  sender_id: string
  group_id: string
  created_at: string
  sender: {
    display_name: string
  }
}

interface GroupChatMessagesProps {
  groupId: string
}

export function GroupChatMessages({ groupId }: GroupChatMessagesProps) {
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const initializeChat = async () => {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUserId(user.id)

      // Load existing messages
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          sender_id,
          group_id,
          created_at,
          sender:users!messages_sender_id_fkey(display_name)
        `)
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("Error loading messages:", error)
      } else {
        setMessages(messagesData || [])
      }

      setLoading(false)
    }

    initializeChat()
  }, [groupId, supabase])

  useEffect(() => {
    if (!currentUserId) return

    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const newMessage = payload.new as any

          // Get sender info
          const { data: senderData } = await supabase
            .from("users")
            .select("display_name")
            .eq("id", newMessage.sender_id)
            .single()

          const messageWithSender = {
            ...newMessage,
            sender: senderData || { display_name: "Unknown" },
          }

          setMessages((prev) => [...prev, messageWithSender])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, groupId, supabase])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground">메시지를 불러오는 중...</p>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground text-center">
          아직 메시지가 없습니다.
          <br />
          메시지를 보내서 대화를 시작해보세요!
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => {
        const isOwn = message.sender_id === currentUserId
        const showTimestamp =
          index === 0 ||
          new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000 // 5 minutes

        const showSender =
          !isOwn &&
          (index === 0 ||
            messages[index - 1].sender_id !== message.sender_id ||
            new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000)

        return (
          <div key={message.id} className="space-y-2">
            {showTimestamp && (
              <div className="text-center">
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ko })}
                </span>
              </div>
            )}
            <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[70%]", isOwn ? "items-end" : "items-start")}>
                {showSender && (
                  <div className="text-xs text-muted-foreground mb-1 px-1">{message.sender.display_name}</div>
                )}
                <div
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm",
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}
                >
                  <p className="break-words">{message.content}</p>
                </div>
              </div>
            </div>
          </div>
        )
      })}
      <div ref={messagesEndRef} />
    </div>
  )
}
