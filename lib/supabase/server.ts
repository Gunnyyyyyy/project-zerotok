import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The "setAll" method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}

/**
 * Get user from middleware headers to avoid duplicate auth calls
 */
export async function getUserFromHeaders() {
  const { headers } = await import('next/headers')
  const headersList = await headers()
  
  const userId = headersList.get('x-user-id')
  const userEmail = headersList.get('x-user-email')
  
  if (!userId || !userEmail) {
    return null
  }
  
  return {
    id: userId,
    email: userEmail,
  }
}
