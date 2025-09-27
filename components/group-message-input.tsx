"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface GroupMessageInputProps {
  groupId: string
}

export function GroupMessageInput({ groupId }: GroupMessageInputProps) {
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    setIsLoading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("로그인이 필요합니다")

      const { error } = await supabase.from("messages").insert({
        content: message.trim(),
        sender_id: user.id,
        group_id: groupId,
        receiver_id: null, // Group messages don't have a specific receiver
      })

      if (error) throw error

      setMessage("")
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSend} className="flex space-x-2">
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
        className="bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={!message.trim() || isLoading}
      >
        <Send className="w-4 h-4" />
      </Button>
    </form>
  )
}
