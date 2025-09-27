"use client"

import { useEffect, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface Message {
  id: string
  content: string
  sender_id: string
  receiver_id: string
  is_read: boolean
  created_at: string
}

interface ChatMessagesProps {
  messages: Message[]
  currentUserId: string
  friendId: string
}

export function ChatMessages({ messages: initialMessages, currentUserId, friendId }: ChatMessagesProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    console.log("[v0] Setting up real-time subscription for messages")

    const channel = supabase
      .channel(`messages-${currentUserId}-${friendId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          console.log("[v0] New message received:", payload.new)
          const newMessage = payload.new as Message

          // 현재 채팅방과 관련된 메시지만 처리
          if (
            (newMessage.sender_id === currentUserId && newMessage.receiver_id === friendId) ||
            (newMessage.sender_id === friendId && newMessage.receiver_id === currentUserId)
          ) {
            setMessages((prev) => {
              // 중복 메시지 방지
              if (prev.some((msg) => msg.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage]
            })

            // 친구가 보낸 메시지는 자동으로 읽음 처리
            if (newMessage.sender_id === friendId) {
              supabase
                .from("messages")
                .update({ is_read: true })
                .eq("id", newMessage.id)
                .then(() => {
                  setMessages((prev) => prev.map((msg) => (msg.id === newMessage.id ? { ...msg, is_read: true } : msg)))
                })
            }
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          console.log("[v0] Message updated:", payload.new)
          const updatedMessage = payload.new as Message

          // 현재 채팅방과 관련된 메시지만 처리
          if (
            (updatedMessage.sender_id === currentUserId && updatedMessage.receiver_id === friendId) ||
            (updatedMessage.sender_id === friendId && updatedMessage.receiver_id === currentUserId)
          ) {
            setMessages((prev) => prev.map((msg) => (msg.id === updatedMessage.id ? updatedMessage : msg)))
          }
        },
      )
      .subscribe((status) => {
        console.log("[v0] Subscription status:", status)
      })

    return () => {
      console.log("[v0] Cleaning up real-time subscription")
      supabase.removeChannel(channel)
    }
  }, [currentUserId, friendId, supabase])

  const addMessage = (newMessage: Message) => {
    setMessages((prev) => {
      if (prev.some((msg) => msg.id === newMessage.id)) {
        return prev
      }
      return [...prev, newMessage]
    })
  }

  useEffect(() => {
    const handleNewTempMessage = (event: CustomEvent) => {
      const tempMessage = event.detail
      setMessages((prev) => [...prev, tempMessage])
    }

    const handleRemoveTempMessage = (event: CustomEvent) => {
      const { tempId } = event.detail
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId))
    }

    const handleReplaceTempMessage = (event: CustomEvent) => {
      const { tempId, realMessage } = event.detail
      setMessages((prev) => prev.map((msg) => (msg.id === tempId ? realMessage : msg)))
    }

    window.addEventListener("newTempMessage", handleNewTempMessage as EventListener)
    window.addEventListener("removeTempMessage", handleRemoveTempMessage as EventListener)
    window.addEventListener("replaceTempMessage", handleReplaceTempMessage as EventListener)

    return () => {
      window.removeEventListener("newTempMessage", handleNewTempMessage as EventListener)
      window.removeEventListener("removeTempMessage", handleRemoveTempMessage as EventListener)
      window.removeEventListener("replaceTempMessage", handleReplaceTempMessage as EventListener)
    }
  }, [])

  // 전역 이벤트 리스너로 메시지 입력 컴포넌트에서 호출할 수 있도록 설정
  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      addMessage(event.detail)
    }

    window.addEventListener("newMessage", handleNewMessage as EventListener)
    return () => {
      window.removeEventListener("newMessage", handleNewMessage as EventListener)
    }
  }, [])

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
              <div
                className={cn(
                  "max-w-[70%] px-3 py-2 rounded-lg text-sm",
                  isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm",
                )}
              >
                <p className="break-words">{message.content}</p>
                {isOwn && <div className="text-xs opacity-70 mt-1">{message.is_read ? "읽음" : "전송됨"}</div>}
              </div>
            </div>
          </div>
        )
      })}
      <div ref={messagesEndRef} />
    </div>
  )
}
