"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import { useState } from "react"

interface MessageInputProps {
  friendId: string
}

export function MessageInput({ friendId }: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      console.log("[v0] Sending message:", { friendId, message: message.trim() })

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const tempId = `temp-${Date.now()}-${Math.random()}`
      const tempMessage = {
        id: tempId,
        content: message.trim(),
        sender_id: user.id,
        receiver_id: friendId,
        is_read: false,
        created_at: new Date().toISOString(),
        message_type: "text",
      }

      // 즉시 UI에 임시 메시지 표시
      window.dispatchEvent(new CustomEvent("newTempMessage", { detail: tempMessage }))
      setMessage("")

      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: user.id,
          receiver_id: friendId,
          content: message.trim(),
          message_type: "text",
        })
        .select()
        .single()

      if (error) {
        console.log("[v0] Message insert error:", error)
        window.dispatchEvent(new CustomEvent("removeTempMessage", { detail: { tempId } }))
        setMessage(message.trim())
        throw error
      }

      console.log("[v0] Message sent successfully:", data)

      if (data) {
        window.dispatchEvent(
          new CustomEvent("replaceTempMessage", {
            detail: { tempId, realMessage: data },
          }),
        )
      }
    } catch (error) {
      console.error("Error sending message:", error)
      alert("메시지 전송에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSendMessage} className="flex space-x-2">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="메시지를 입력하세요..."
        className="flex-1 bg-background border-border text-foreground"
        disabled={isLoading}
      />
      <Button
        type="submit"
        size="sm"
        disabled={!message.trim() || isLoading}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {isLoading ? "전송중..." : <Send className="w-4 h-4" />}
      </Button>
    </form>
  )
}
