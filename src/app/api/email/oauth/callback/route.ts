import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exchangeCode, getProfileEmail } from "@/lib/gmail";
import { syncAccount } from "@/server/actions/email";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return NextResponse.redirect(new URL("/mail?error=oauth", process.env.APP_URL));

  try {
    const tokens = await exchangeCode(code);
    const profile = await getProfileEmail(tokens.access_token);
    const email = profile?.emailAddress || "unknown";

    const account = await prisma.emailAccount.upsert({
      where: { userId: state },
      update: {
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
      },
      create: {
        userId: state,
        provider: "gmail",
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || "",
        expiresAt: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
      },
    });

    // first sync in background of the request (30 days)
    await syncAccount(account.id, 30);

    return NextResponse.redirect(new URL("/mail?connected=1", process.env.APP_URL));
  } catch (e: any) {
    return NextResponse.redirect(
      new URL(`/mail?error=${encodeURIComponent(e?.message || "oauth")}`, process.env.APP_URL)
    );
  }
}
