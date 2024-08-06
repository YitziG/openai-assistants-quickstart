// app/Navigation.jsx
"use client";

import AuthButton from "@/app/AuthButton";
import Link from "next/link"; // Import Link from next/link

export default function Navigation() {


    return (
        <nav>
            <AuthButton />
            <Link href="/profile-server">Server Profile</Link>
        </nav>
    );
}
