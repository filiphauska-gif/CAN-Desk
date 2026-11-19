/* Minimal Gmail API client (OAuth + read/send). No SDK, just fetch. */
import { prisma } from "@/lib/db";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://gmail.googleapis.com/gmail/v1/users/me";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function gmailAuthUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: `${process.env.APP_URL}/api/email/oauth/callback`,
    response_type: "code",
    scope: GMAIL_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function exchangeCode(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirect_uri: `${process.env.APP_URL}/api/email/oauth/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}

export async function getProfileEmail(accessToken: string) {
  const res = await fetch(`${API}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as { emailAddress: string };
}

async function freshToken(account: { id: string; accessToken: string; refreshToken: string; expiresAt: Date }) {
  if (new Date(account.expiresAt).getTime() > Date.now() + 60_000) return account.accessToken;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("token refresh failed");
  const data = (await res.json()) as { access_token: string; expires_in: number };
  await prisma.emailAccount.update({
    where: { id: account.id },
    data: {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });
  return data.access_token;
}

async function gfetch(account: any, path: string, init?: RequestInit) {
  const token = await freshToken(account);
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`gmail ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export async function listMessageIds(account: any, query = "newer_than:30d -in:chats", max = 60) {
  const data: any = await gfetch(account, `/messages?maxResults=${max}&q=${encodeURIComponent(query)}`);
  return (data.messages || []) as { id: string; threadId: string }[];
}

const decode = (s?: string) => (s ? Buffer.from(s, "base64url").toString("utf-8") : "");

function collectBody(part: any, acc: { text: string; html: string }) {
  if (!part) return;
  const mime = part.mimeType || "";
  if (part.body?.data) {
    if (mime === "text/plain" && !acc.text) acc.text = decode(part.body.data);
    if (mime === "text/html" && !acc.html) acc.html = decode(part.body.data);
  }
  (part.parts || []).forEach((p: any) => collectBody(p, acc));
}

const stripHtml = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

export async function getMessage(account: any, id: string) {
  const msg: any = await gfetch(account, `/messages/${id}?format=full`);
  const headers: Record<string, string> = {};
  for (const h of msg.payload?.headers || []) headers[h.name.toLowerCase()] = h.value;

  const acc = { text: "", html: "" };
  collectBody(msg.payload, acc);
  const bodyText = (acc.text || stripHtml(acc.html)).slice(0, 50_000);

  const from = headers.from || "";
  const m = from.match(/^(?:"?([^"<]*)"?\s*)?<?([^>\s]+@[^>\s]+)>?$/);

  return {
    gmailId: msg.id as string,
    threadId: msg.threadId as string,
    fromAddress: (m?.[2] || from).trim().toLowerCase(),
    fromName: (m?.[1] || "").trim() || null,
    toAddress: headers.to || null,
    subject: headers.subject || "(bez předmětu)",
    snippet: msg.snippet || bodyText.slice(0, 200),
    bodyText,
    receivedAt: new Date(Number(msg.internalDate) || Date.now()),
    unread: (msg.labelIds || []).includes("UNREAD"),
    messageIdHeader: headers["message-id"] || null,
  };
}

export async function sendMail(
  account: any,
  opts: { to: string; subject: string; body: string; threadId?: string; inReplyTo?: string }
) {
  const headers = [
    `To: ${opts.to}`,
    `From: ${account.email}`,
    `Subject: ${opts.subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
  ];
  if (opts.inReplyTo) {
    headers.push(`In-Reply-To: ${opts.inReplyTo}`, `References: ${opts.inReplyTo}`);
  }
  const raw = Buffer.from(headers.join("\r\n") + "\r\n\r\n" + opts.body).toString("base64url");
  return gfetch(account, "/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw, ...(opts.threadId ? { threadId: opts.threadId } : {}) }),
  });
}
