"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Mail, 
  Calendar, 
  MapPin, 
  ChefHat, 
  ShoppingCart, 
  Settings,
  Edit,
  Save,
  X
} from "lucide-react"

interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  bio?: string
  location?: string
  dietary_preferences?: string[]
  created_at: string
  updated_at: string
}

interface ProfileStats {
  total_recipes: number
  total_grocery_lists: number
  favorite_cuisines: string[]
  most_used_ingredients: string[]
}

export function UserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: "",
    bio: "",
    location: "",
    dietary_preferences: [] as string[]
  })

  const supabase = createClient()

  useEffect(() => {
    loadProfile()
    loadStats()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error)
        return
      }

      if (profile) {
        setProfile(profile)
        setEditForm({
          full_name: profile.full_name || "",
          bio: profile.bio || "",
          location: profile.location || "",
          dietary_preferences: profile.dietary_preferences || []
        })
      } else {
        // Create profile if it doesn't exist
        const newProfile = {
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
          avatar_url: user.user_metadata?.avatar_url || "",
          bio: "",
          location: "",
          dietary_preferences: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        const { data: insertedProfile, error: insertError } = await supabase
          .from("profiles")
          .insert(newProfile)
          .select()
          .single()

        if (!insertError && insertedProfile) {
          setProfile(insertedProfile)
          setEditForm({
            full_name: insertedProfile.full_name || "",
            bio: insertedProfile.bio || "",
            location: insertedProfile.location || "",
            dietary_preferences: insertedProfile.dietary_preferences || []
          })
        } else {
          // Fallback to the new profile data
          setProfile(newProfile)
          setEditForm({
            full_name: newProfile.full_name || "",
            bio: newProfile.bio || "",
            location: newProfile.location || "",
            dietary_preferences: newProfile.dietary_preferences || []
          })
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get recipe count
      const { count: recipeCount } = await supabase
        .from("recipes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      // Get grocery list count
      const { count: listCount } = await supabase
        .from("grocery_lists")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      // Get favorite cuisines from recipes
      const { data: recipes } = await supabase
        .from("recipes")
        .select("cuisine")
        .eq("user_id", user.id)
        .not("cuisine", "is", null)

      const cuisineCounts = recipes?.reduce((acc, recipe) => {
        if (recipe.cuisine) {
          acc[recipe.cuisine] = (acc[recipe.cuisine] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>) || {}

      const favoriteCuisines = Object.entries(cuisineCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([cuisine]) => cuisine)

      // Get most used ingredients
      const { data: ingredients } = await supabase
        .from("recipes")
        .select("ingredients")
        .eq("user_id", user.id)

      const ingredientCounts = ingredients?.reduce((acc, recipe) => {
        recipe.ingredients?.forEach((ing: any) => {
          const name = ing.name?.toLowerCase()
          if (name) {
            acc[name] = (acc[name] || 0) + 1
          }
        })
        return acc
      }, {} as Record<string, number>) || {}

      const mostUsedIngredients = Object.entries(ingredientCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([ingredient]) => ingredient)

      setStats({
        total_recipes: recipeCount || 0,
        total_grocery_lists: listCount || 0,
        favorite_cuisines: favoriteCuisines,
        most_used_ingredients: mostUsedIngredients
      })
    } catch (error) {
      console.error("Error loading stats:", error)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          bio: editForm.bio,
          location: editForm.location,
          dietary_preferences: editForm.dietary_preferences,
          updated_at: new Date().toISOString()
        })
        .eq("id", profile.id)

      if (error) {
        console.error("Error updating profile:", error)
        return
      }

      setProfile({
        ...profile,
        ...editForm,
        updated_at: new Date().toISOString()
      })
      setIsEditing(false)
    } catch (error) {
      console.error("Error saving profile:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditForm({
      full_name: profile?.full_name || "",
      bio: profile?.bio || "",
      location: profile?.location || "",
      dietary_preferences: profile?.dietary_preferences || []
    })
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Unable to load profile</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback>
                  {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : profile.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">
                  {profile.full_name || "User"}
                </h1>
                <p className="text-muted-foreground">{profile.email}</p>
                {profile.location && (
                  <div className="flex items-center text-sm text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4 mr-1" />
                    {profile.location}
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? <X className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              {isEditing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editForm.location}
                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                    placeholder="City, Country"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={editForm.bio}
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {profile.bio && (
                <p className="text-muted-foreground mb-4">{profile.bio}</p>
              )}
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-1" />
                Member since {new Date(profile.created_at).toLocaleDateString()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <ChefHat className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_recipes}</p>
                  <p className="text-sm text-muted-foreground">Recipes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total_grocery_lists}</p>
                  <p className="text-sm text-muted-foreground">Grocery Lists</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.favorite_cuisines.length}</p>
                  <p className="text-sm text-muted-foreground">Cuisines</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Favorite Cuisines */}
      {stats?.favorite_cuisines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Favorite Cuisines</CardTitle>
            <CardDescription>Based on your recipe collection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.favorite_cuisines.map((cuisine) => (
                <Badge key={cuisine} variant="secondary">
                  {cuisine}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Most Used Ingredients */}
      {stats?.most_used_ingredients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Used Ingredients</CardTitle>
            <CardDescription>Your cooking staples</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.most_used_ingredients.map((ingredient) => (
                <Badge key={ingredient} variant="outline">
                  {ingredient}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
