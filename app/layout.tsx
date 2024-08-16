import { ThemeProvider } from "@/app/components/theme-provider"
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Inter } from "next/font/google"
import "./globals.css"
import { cn } from '@/lib/utils'
import { UserProvider } from "@auth0/nextjs-auth0/client"
import { AI } from "./actions"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Yafutzu - Empowering Intelligence",
  description: "Spreading light",
  icons: {
    icon: "/yafutzu-icon.svg",
  },
}

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ]
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", GeistSans.className)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <UserProvider>
            <div className="relative flex min-h-screen flex-col">
              <div className="flex-1">
                <AI>{children}</AI>
              </div>
            </div>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}