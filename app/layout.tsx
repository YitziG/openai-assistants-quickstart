import {Inter} from "next/font/google";
import "./globals.css";
import Warnings from "./components/warnings";
import {assistantId} from "./assistant-config";
import {UserProvider} from "@auth0/nextjs-auth0/client";
import Navigation from "@/app/Navigation";

const inter = Inter({subsets: ["latin"]});

export const metadata = {
    title: "Assistants API Quickstart",
    description: "A quickstart template using the Assistants API with OpenAI",
    icons: {
        icon: "/openai.svg",
    },
};

export default function RootLayout({children}) {
    return (
        <html lang="en">
        <UserProvider>
            <body className={inter.className}>
                <header>
                    <Navigation/>
                </header>
                {assistantId ? children : <Warnings/>}
            </body>
        </UserProvider>
        </html>
    );
}
