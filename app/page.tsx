import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-sans text-foreground">제로톡</h1>
        <p className="text-muted-foreground text-lg">Simple. Fast. Secure messaging.</p>
        <div className="space-x-4">
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/auth/login">Sign In</Link>
          </Button>
          <Button asChild variant="outline" className="border-border text-foreground hover:bg-accent bg-transparent">
            <Link href="/auth/signup">Sign Up</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
