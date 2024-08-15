import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from '@/lib/utils'
import Warnings from "./components/warnings";
import { assistantId } from "./assistant-config";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import CanvasComponent from "@/app/components/CanvasComponent";
import { AI } from "./actions"; // Import the AI component
import { Dialog, DialogTrigger, DialogContent } from "@radix-ui/react-dialog";
import { ChatCircleDots } from "phosphor-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Yafutzu - Empowering Intelligence",
  description: "Spreading light",
  icons: {
    icon: "/yafutzu-icon.svg",
  },
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ]
}

export default function RootLayout({ children }) {
  return (
      <html lang="en" suppressHydrationWarning>
      <UserProvider>
        <body className={cn(
            'font-sans antialiased',
            GeistSans.variable,
            GeistMono.variable
        )}>
          {/* <CanvasComponent /> */}
          <div className="flex flex-col min-h-screen">
            <AI>
              <main className="flex flex-col flex-1 bg-muted/50">{assistantId ? children : <Warnings />}</main>
            </AI>
          </div>
        </body>
      </UserProvider>
      </html>
  );
}