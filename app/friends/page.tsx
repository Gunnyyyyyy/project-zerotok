"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, UserPlus, Users } from "lucide-react"
import { AddFriendForm } from "@/components/add-friend-form"
import { FriendsList } from "@/components/friends-list"

interface Friend {
  id: string
  user_code: string
  display_name: string
}

interface Friendship {
  id: string
  status: string
  created_at: string
  user_id: string
  friend_id: string
  user?: Friend
  friend?: Friend
}

interface FriendRequest {
  id: string
  status: string
  created_at: string
  user?: Friend
}

export default function FriendsPage() {
  const [user, setUser] = useState<any>(null)
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const loadData = async () => {
    const supabase = createClient()

    try {
      // Get current user
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !currentUser) {
        router.push("/auth/login")
        return
      }

      setUser(currentUser)

      // Get friends list - both directions
      const { data: friendshipsData, error: friendshipsError } = await supabase
        .from("friendships")
        .select(`
          id,
          status,
          created_at,
          user_id,
          friend_id,
          user:user_id (
            id,
            user_code,
            display_name
          ),
          friend:friend_id (
            id,
            user_code,
            display_name
          )
        `)
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`)
        .eq("status", "accepted")

      if (friendshipsError) {
        console.error("Friendships error:", friendshipsError)
      } else {
        setFriendships(friendshipsData || [])
      }

      // Get pending friend requests (received)
      const { data: pendingData, error: pendingError } = await supabase
        .from("friendships")
        .select(`
          id,
          status,
          created_at,
          user:user_id (
            id,
            user_code,
            display_name
          )
        `)
        .eq("friend_id", currentUser.id)
        .eq("status", "pending")

      if (pendingError) {
        console.error("Pending requests error:", pendingError)
      } else {
        setPendingRequests(pendingData || [])
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Transform friendships to always show the other person
  const transformedFriendships = friendships.map((friendship) => {
    const isUserInitiator = friendship.user_id === user?.id
    return {
      id: friendship.id,
      status: friendship.status,
      created_at: friendship.created_at,
      friend: isUserInitiator ? friendship.friend : friendship.user,
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Link href="/profile">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-sans text-foreground">친구</h1>
        </div>

        {/* Add Friend */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <UserPlus className="w-5 h-5 mr-2" />
              친구 추가
            </CardTitle>
            <CardDescription className="text-muted-foreground">친구의 고유 코드를 입력해서 연결하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <AddFriendForm onFriendAdded={loadData} />
          </CardContent>
        </Card>

        {/* Pending Requests */}
        {pendingRequests && pendingRequests.length > 0 && (
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">친구 요청</CardTitle>
              <CardDescription className="text-muted-foreground">나와 연결하고 싶어하는 사람들</CardDescription>
            </CardHeader>
            <CardContent>
              <FriendsList requests={pendingRequests} type="pending" onUpdate={loadData} />
            </CardContent>
          </Card>
        )}

        {/* Friends List */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <Users className="w-5 h-5 mr-2" />내 친구들 ({transformedFriendships?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transformedFriendships && transformedFriendships.length > 0 ? (
              <FriendsList friends={transformedFriendships} type="friends" onUpdate={loadData} />
            ) : (
              <p className="text-muted-foreground text-center py-4">
                아직 친구가 없습니다. 고유 코드를 사용해서 친구를 추가해보세요!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
