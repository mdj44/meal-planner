import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChefHat, ShoppingCart, MapPin, Users, Upload, Smartphone } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="h-8 w-8 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">Aisle</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4">
            MVP Launch
          </Badge>
          <h2 className="text-5xl font-bold text-gray-900 mb-6 text-balance">Streamlined Meals & Groceries</h2>
          <p className="text-xl text-gray-600 mb-8 text-pretty">
            Upload recipes, generate smart grocery lists, and navigate stores with crowdsourced item locations. Make
            meal planning and grocery shopping effortless.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/sign-up">
              <Button size="lg" className="text-lg px-8">
                Start Planning Meals
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent">
                View Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Everything You Need</h3>
          <p className="text-lg text-gray-600">From recipe upload to store navigation, we've got you covered</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Upload className="h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Smart Recipe Upload</CardTitle>
              <CardDescription>
                Upload photos, PDFs, or paste URLs. Our AI automatically extracts ingredients and instructions.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <ShoppingCart className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Auto Grocery Lists</CardTitle>
              <CardDescription>
                Generate organized grocery lists from your recipes. Items are automatically categorized by aisle.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <MapPin className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Store Mapping</CardTitle>
              <CardDescription>
                Find items faster with crowdsourced store maps. Tag locations to help other shoppers.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Users className="h-12 w-12 text-orange-600 mb-4" />
              <CardTitle>Community Powered</CardTitle>
              <CardDescription>
                Benefit from community contributions. The more people use it, the smarter it gets.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <Smartphone className="h-12 w-12 text-red-600 mb-4" />
              <CardTitle>Mobile Friendly</CardTitle>
              <CardDescription>
                Works perfectly on your phone. Take your grocery lists and store maps shopping with you.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <ChefHat className="h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Meal Planning</CardTitle>
              <CardDescription>
                Plan your weekly meals and generate comprehensive shopping lists for multiple recipes at once.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h3>
            <p className="text-lg text-gray-600">Simple steps to streamline your meal planning</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">1</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Upload Recipes</h4>
              <p className="text-gray-600">
                Take a photo, upload a PDF, or paste a URL. Our AI extracts all the details automatically.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Generate Lists</h4>
              <p className="text-gray-600">
                Select recipes for the week and automatically generate organized grocery lists by category.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h4 className="text-xl font-semibold mb-2">Shop Efficiently</h4>
              <p className="text-gray-600">
                Use store maps to find items quickly and contribute location data to help other shoppers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h3>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of users who have streamlined their meal planning and grocery shopping with Aisle.
          </p>
          <Link href="/auth/sign-up">
            <Button size="lg" className="text-lg px-8">
              Create Your Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ChefHat className="h-6 w-6" />
            <span className="text-xl font-bold">Aisle</span>
          </div>
          <p className="text-gray-400">Streamlined meals and groceries for everyone.</p>
        </div>
      </footer>
    </div>
  )
}
