import { dash } from "@better-auth/infra";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { generateUsername } from "./generateUsername.js";
import { prisma } from "./prisma.js";

export const auth = betterAuth({
  baseURL: process.env["BETTER_AUTH_URL"],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env["GOOGLE_CLIENT_ID"] as string,
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"] as string,
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  plugins: [dash()],
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://tennis.henriquesf.me",
    "https://api.tennis.henriquesf.me",
  ],
  experimental: {
    joins: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await prisma.userProfile.create({
            data: {
              userId: user.id,
              username: generateUsername(user.id, user.name),
            },
          });
        },
      },
    },
  },
});
