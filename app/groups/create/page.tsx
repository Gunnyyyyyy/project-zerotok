"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { ArrowLeft, Users } from "lucide-react"

interface Friend {
  id: string
  display_name: string
  user_code: string
}

export default function CreateGroupPage() {
  const [groupName, setGroupName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadFriends()
  }, [])

  const loadFriends = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: friendships } = await supabase
      .from("friendships")
      .select(`
        friend:users!friendships_friend_id_fkey(id, display_name, user_code)
      `)
      .eq("user_id", user.id)
      .eq("status", "accepted")

    if (friendships) {
      setFriends(friendships.map((f) => f.friend).filter(Boolean))
    }
  }

  const handleFriendToggle = (friendId: string) => {
    setSelectedFriends((prev) => (prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]))
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!groupName.trim()) {
      setError("단톡방 이름을 입력해주세요")
      setIsLoading(false)
      return
    }

    if (selectedFriends.length === 0) {
      setError("최소 1명의 친구를 선택해주세요")
      setIsLoading(false)
      return
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("로그인이 필요합니다")

      // Create group
      const { data: group, error: groupError } = await supabase
        .from("group_chats")
        .insert({
          name: groupName.trim(),
          description: description.trim() || null,
          created_by: user.id,
        })
        .select()
        .single()

      if (groupError) throw groupError

      // Add creator as admin member
      const { error: creatorError } = await supabase.from("group_members").insert({
        group_id: group.id,
        user_id: user.id,
        is_admin: true,
      })

      if (creatorError) throw creatorError

      // Add selected friends as members
      const memberInserts = selectedFriends.map((friendId) => ({
        group_id: group.id,
        user_id: friendId,
        is_admin: false,
      }))

      const { error: membersError } = await supabase.from("group_members").insert(memberInserts)

      if (membersError) throw membersError

      router.push(`/groups/${group.id}`)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "단톡방 생성 중 오류가 발생했습니다")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/groups">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-sans text-foreground">단톡방 만들기</h1>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <Users className="w-5 h-5 mr-2" />새 단톡방
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              친구들과 함께 대화할 단톡방을 만들어보세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="groupName" className="text-foreground">
                  단톡방 이름 *
                </Label>
                <Input
                  id="groupName"
                  type="text"
                  placeholder="예: 친구들과 함께"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-foreground">
                  설명 (선택사항)
                </Label>
                <Textarea
                  id="description"
                  placeholder="단톡방에 대한 간단한 설명을 입력하세요"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-background border-border text-foreground resize-none"
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-foreground">초대할 친구 선택 *</Label>
                {friends.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center space-x-3 p-2 rounded border border-border">
                        <Checkbox
                          id={friend.id}
                          checked={selectedFriends.includes(friend.id)}
                          onCheckedChange={() => handleFriendToggle(friend.id)}
                        />
                        <label htmlFor={friend.id} className="flex-1 cursor-pointer">
                          <div className="text-foreground">{friend.display_name}</div>
                          <div className="text-xs text-muted-foreground">{friend.user_code}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>친구가 없습니다</p>
                    <p className="text-xs">먼저 친구를 추가해보세요</p>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-border text-foreground hover:bg-accent bg-transparent"
                  asChild
                >
                  <Link href="/groups">취소</Link>
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isLoading || friends.length === 0}
                >
                  {isLoading ? "생성 중..." : "단톡방 만들기"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
