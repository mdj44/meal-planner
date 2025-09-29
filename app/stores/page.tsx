import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StoresPageContent } from "@/components/stores-page-content"

export default async function StoresPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  return <StoresPageContent />
}
