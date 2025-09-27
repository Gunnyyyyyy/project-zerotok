"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다")
      setIsLoading(false)
      return
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      })

      if (authError) throw authError

      if (authData.user && authData.session) {
        const { error: profileError } = await supabase.from("user_profiles").upsert({
          id: authData.user.id,
          email: authData.user.email,
          display_name: displayName,
          user_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (profileError) {
          console.log("[v0] Profile creation error:", profileError)
        }

        router.push("/chat")
      } else if (authData.user && !authData.session) {
        router.push("/auth/signup-success")
      }
    } catch (error: unknown) {
      console.log("[v0] Signup error:", error)
      if (error instanceof Error) {
        if (error.message.includes("User already registered")) {
          setError("이미 등록된 이메일입니다")
        } else if (error.message.includes("Invalid email")) {
          setError("올바른 이메일 주소를 입력해주세요")
        } else {
          setError(error.message)
        }
      } else {
        setError("회원가입 중 오류가 발생했습니다")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Card className="border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-sans text-foreground">제로톡</CardTitle>
            <CardDescription className="text-muted-foreground">새 계정을 만드세요</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-foreground">
                  표시 이름
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="이름을 입력하세요"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  이메일
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  비밀번호
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground">
                  비밀번호 확인
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? "계정 생성 중..." : "회원가입"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              이미 계정이 있으신가요?{" "}
              <Link href="/auth/login" className="text-primary hover:underline">
                로그인
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
