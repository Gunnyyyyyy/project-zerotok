"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Check, X, MessageCircle } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"

interface Friend {
  id: string
  user_code: string
  display_name: string
}

interface Friendship {
  id: string
  status: string
  created_at: string
  friend?: Friend
}

interface FriendRequest {
  id: string
  status: string
  created_at: string
  user?: Friend
}

interface FriendsListProps {
  friends?: Friendship[]
  requests?: FriendRequest[]
  type: "friends" | "pending"
}

export function FriendsList({ friends: initialFriends, requests: initialRequests, type }: FriendsListProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [friends, setFriends] = useState(initialFriends || [])
  const [requests, setRequests] = useState(initialRequests || [])

  // Remove real-time subscription to prevent duplicate API calls
  // The parent component will handle data updates

  // Update local state when props change
  useEffect(() => {
    setFriends(initialFriends || [])
  }, [initialFriends])

  useEffect(() => {
    setRequests(initialRequests || [])
  }, [initialRequests])

  const handleAcceptRequest = async (requestId: string) => {
    setLoading(requestId)
    const supabase = createClient()

    try {
      console.log("[v0] Accepting friend request:", requestId)

      const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", requestId)

      if (error) {
        console.log("[v0] Accept error:", error)
        throw error
      }

      console.log("[v0] Friend request accepted successfully")

      setRequests((prev) => prev.filter((req) => req.id !== requestId))

      // Don't trigger parent reload to avoid duplicate API calls
      // The UI will update locally
    } catch (error) {
      console.error("Error accepting request:", error)
      alert("친구 요청 수락에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setLoading(null)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    setLoading(requestId)
    const supabase = createClient()

    try {
      console.log("[v0] Rejecting friend request:", requestId)

      const { error } = await supabase.from("friendships").delete().eq("id", requestId)

      if (error) {
        console.log("[v0] Reject error:", error)
        throw error
      }

      console.log("[v0] Friend request rejected successfully")

      setRequests((prev) => prev.filter((req) => req.id !== requestId))

      // Don't trigger parent reload to avoid duplicate API calls
      // The UI will update locally
    } catch (error) {
      console.error("Error rejecting request:", error)
      alert("친구 요청 거절에 실패했습니다. 다시 시도해주세요.")
    } finally {
      setLoading(null)
    }
  }

  if (type === "pending" && requests) {
    return (
      <div className="space-y-3">
        {requests.map((request) => (
          <div key={request.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div>
              <p className="font-medium text-foreground">{request.user?.display_name}</p>
              <p className="text-sm text-muted-foreground font-mono">{request.user?.user_code}</p>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                onClick={() => handleAcceptRequest(request.id)}
                disabled={loading === request.id}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading === request.id ? "처리중..." : <Check className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRejectRequest(request.id)}
                disabled={loading === request.id}
                className="border-border text-foreground hover:bg-destructive hover:text-destructive-foreground"
              >
                {loading === request.id ? "처리중..." : <X className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === "friends" && friends) {
    return (
      <div className="space-y-3">
        {friends.map((friendship) => (
          <div key={friendship.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div>
              <p className="font-medium text-foreground">{friendship.friend?.display_name}</p>
              <p className="text-sm text-muted-foreground font-mono">{friendship.friend?.user_code}</p>
            </div>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href={`/chat/${friendship.friend?.id}`}>
                <MessageCircle className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        ))}
      </div>
    )
  }

  return null
}
