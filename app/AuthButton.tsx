"use client";

import {useUser} from "@auth0/nextjs-auth0/client";
import Login from "./login";
import Logout from "./logout";
import ProfileClient from "@/app/profile-client/page";

export default function AuthButton() {
    const {user, isLoading} = useUser();

    if (isLoading) return <div>Loading...</div>;


    return user ? <>
        <ProfileClient/>
        <Logout/>
    </> : <Login/>;
}