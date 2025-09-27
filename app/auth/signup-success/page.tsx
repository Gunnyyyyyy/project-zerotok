import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function SignupSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Card className="border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-sans text-foreground">회원가입 완료!</CardTitle>
            <CardDescription className="text-muted-foreground">이메일을 확인해주세요</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              회원가입이 성공적으로 완료되었습니다. 이메일을 확인하여 계정을 활성화한 후 로그인해주세요.
            </p>
            <Link href="/auth/login" className="inline-block text-primary hover:underline text-sm">
              로그인 페이지로 이동
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
