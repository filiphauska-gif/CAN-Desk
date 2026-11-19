import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CAN Desk — Interní nástroj agentury",
  description: "Projektový nástroj pro Can Agency",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.fontSize=localStorage.getItem('can-font-size')||'medium'}catch(e){}" }} />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
