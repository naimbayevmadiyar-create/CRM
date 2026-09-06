import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// Корень сам разводит по ролям: админа — в заявки, мастера — в его список.
export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(session.role === "admin" ? "/orders" : "/my");
}
