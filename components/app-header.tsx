"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChefHat,
  User,
  Settings,
  LogOut,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface Profile {
  id: string
  full_name?: string
  avatar_url?: string
}

interface AppHeaderProps {
  user?: SupabaseUser | null
  profile?: Profile | null
}

export function AppHeader({ user: initialUser, profile: initialProfile }: AppHeaderProps) {
  const [user, setUser] = useState<SupabaseUser | null>(initialUser || null)
  const [profile, setProfile] = useState<Profile | null>(initialProfile || null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    // Get initial user if not provided
    if (!initialUser) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setUser(user)
        if (user) {
          // Load profile
          supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()
            .then(({ data: profile }) => {
              setProfile(profile)
            })
        }
      })
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        // Load profile for new user
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()
          .then(({ data: profile }) => {
            setProfile(profile)
          })
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [initialUser, supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const userName = profile?.full_name || user?.email?.split("@")[0] || "User"
  const userInitials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U"

  const isActive = (path: string) => pathname === path

  if (!user) {
    // Show public header
    return (
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">Aisle</h1>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/demo">
              <Button variant="ghost">Demo</Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>
    )
  }

  // Show authenticated header
  return (
    <header className="bg-white border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <ChefHat className="h-8 w-8 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">Aisle</h1>
        </Link>

        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href="/dashboard" 
              className={`text-gray-700 hover:text-gray-900 ${isActive('/dashboard') ? 'font-semibold text-green-600' : ''}`}
            >
              Dashboard
            </Link>
            <Link 
              href="/recipes" 
              className={`text-gray-700 hover:text-gray-900 ${isActive('/recipes') ? 'font-semibold text-green-600' : ''}`}
            >
              Recipes
            </Link>
            <Link 
              href="/grocery-lists" 
              className={`text-gray-700 hover:text-gray-900 ${isActive('/grocery-lists') ? 'font-semibold text-green-600' : ''}`}
            >
              Grocery Lists
            </Link>
            <Link 
              href="/stores" 
              className={`text-gray-700 hover:text-gray-900 ${isActive('/stores') ? 'font-semibold text-green-600' : ''}`}
            >
              Store Maps
            </Link>
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{userName}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

