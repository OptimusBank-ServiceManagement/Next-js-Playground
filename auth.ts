import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { getUserByEmail } from "./app/lib/prisma-data";
import bcryptjs from 'bcryptjs';

async function getUser(email: string) {
    try {
        const user = await getUserByEmail(email);
        return user;
    } catch (e) {
        throw new Error('Unable to fetch user with given email');
    }
}

export const { auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [Credentials({
        async authorize(credentials) {
            const parsedCredentials = z.object({
                email: z.string().email(),
                password: z.string().min(6)
            }).safeParse(credentials);

            if (parsedCredentials.success) {
                const {email, password} = parsedCredentials.data;
                const user = await getUser(email);
                if (!user) return null;

                const passwordsMatch = await bcryptjs.compare(password, user.password);

                if (passwordsMatch) return user;
            }

            return null;
        }
    })]
});