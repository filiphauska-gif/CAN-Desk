import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Auto-seed on first run
async function autoSeed() {
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      const hash = await bcrypt.hash("admin123", 12);
      await prisma.user.createMany({
        data: [
          { email: "admin@canagency.cz", passwordHash: hash, name: "Adam Admin", role: "ADMIN", hourlyRate: 1500 },
          { email: "account@canagency.cz", passwordHash: hash, name: "Filip Account", role: "ACCOUNT_MANAGER", hourlyRate: 1300 },
          { email: "kreativec@canagency.cz", passwordHash: hash, name: "Karel Kreativní", role: "KREATIVEC", hourlyRate: 900 },
          { email: "finance@canagency.cz", passwordHash: hash, name: "František Finance", role: "FINANCE", hourlyRate: 1200 },
          { email: "produkcni@canagency.cz", passwordHash: hash, name: "Petr Produkční", role: "PRODUKCNI", hourlyRate: 800 },
          { email: "pm@canagency.cz", passwordHash: hash, name: "Petra Projektová", role: "PROJECT_MANAGER", hourlyRate: 1100 },
        ],
      });
    }
  } catch (e) {}
}
autoSeed();

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Heslo", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email);
        const password = String(credentials.password);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
