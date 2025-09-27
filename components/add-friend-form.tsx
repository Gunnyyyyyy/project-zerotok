"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"


export function AddFriendForm() {
  const [friendCode, setFriendCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    const supabase = createClient()

    try {
      console.log("[v0] Adding friend with code:", friendCode)

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Find user by code
      const { data: friendUser, error: findError } = await supabase
        .from("users")
        .select("id, display_name, user_code")
        .eq("user_code", friendCode.toUpperCase())
        .single()

      if (findError || !friendUser) {
        throw new Error("해당 코드의 사용자를 찾을 수 없습니다")
      }

      if (friendUser.id === user.id) {
        throw new Error("자신을 친구로 추가할 수 없습니다")
      }

      // Check if friendship already exists (both directions)
      const { data: existingFriendship } = await supabase
        .from("friendships")
        .select("id, status")
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${friendUser.id}),and(user_id.eq.${friendUser.id},friend_id.eq.${user.id})`,
        )
        .single()

      if (existingFriendship) {
        if (existingFriendship.status === "accepted") {
          throw new Error("이미 친구인 사용자입니다")
        } else if (existingFriendship.status === "pending") {
          throw new Error("이미 친구 요청을 보냈거나 받았습니다")
        }
      }

      // Create friendship request
      const { data, error: insertError } = await supabase
        .from("friendships")
        .insert({
          user_id: user.id,
          friend_id: friendUser.id,
          status: "pending",
        })
        .select()

      if (insertError) {
        console.log("[v0] Insert error:", insertError)
        throw insertError
      }

      console.log("[v0] Friend request sent:", data)
      setSuccess(`${friendUser.display_name}님에게 친구 요청을 보냈습니다!`)
      setFriendCode("")

      // Don't trigger parent reload to avoid duplicate API calls
      // The real-time subscription or manual refresh will handle updates

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (error: unknown) {
      console.log("[v0] Add friend error:", error)
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleAddFriend} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="friendCode" className="text-foreground">
          친구 코드
        </Label>
        <Input
          id="friendCode"
          type="text"
          placeholder="8자리 코드를 입력하세요"
          value={friendCode}
          onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
          maxLength={8}
          className="bg-background border-border text-foreground font-mono"
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
      <Button
        type="submit"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        disabled={isLoading || friendCode.length !== 8}
      >
        {isLoading ? "전송 중..." : "친구 요청 보내기"}
      </Button>
    </form>
  )
}
