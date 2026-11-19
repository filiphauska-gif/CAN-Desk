import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gmailAuthUrl } from "@/lib/gmail";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", process.env.APP_URL));
  const res = NextResponse.redirect(gmailAuthUrl((session.user as any).id));
  return res;
}
