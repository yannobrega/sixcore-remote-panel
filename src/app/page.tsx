import { currentUser } from "@/server/auth/session";
import { redirect } from "next/navigation";
export default async function Home(){redirect((await currentUser())?"/dashboard":"/login")}
