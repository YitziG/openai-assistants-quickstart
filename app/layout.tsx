import { Inter } from "next/font/google";
import "./globals.css";
import Warnings from "./components/warnings";
import { assistantId } from "./assistant-config";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import CanvasComponent from "@/app/components/CanvasComponent";
import { AI } from "./actions";  // Import the AI component

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Yafutzu - Empowering Intelligence",
  description: "Spreading light",
  icons: {
    icon: "/yafutzu-icon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
      <html lang="en">
      <UserProvider>
        <body className={inter.className}>
          {/* <CanvasComponent /> */}
          <div className="content">
            <AI>
              <main>{assistantId ? children : <Warnings />}</main>
            </AI>
          </div>
        </body>
      </UserProvider>
      </html>
  );
}