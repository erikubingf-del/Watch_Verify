import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { atSelect } from '@/utils/airtable'
import bcrypt from 'bcryptjs'
import { logInfo, logError } from './logger'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@store.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Query Airtable Users table
          const users = await atSelect('Users', {
            filterByFormula: `({email}='${String(credentials.email).replace(/'/g, "\\'")}')`,
          })

          if (!users.length) {
            logInfo('auth', 'Login attempt failed - user not found', { email: credentials.email })
            return null
          }

          const user = users[0]

          // Check if user is active
          if (!user.fields.active) {
            logInfo('auth', 'Login attempt failed - user not active', { email: user.fields.email })
            return null
          }

          // Verify password
          const passwordMatch = await bcrypt.compare(
            String(credentials.password),
            user.fields.password_hash as string
          )

          if (!passwordMatch) {
            logInfo('auth', 'Login attempt failed - invalid password', { email: user.fields.email })
            return null
          }

          logInfo('auth', 'Login successful', {
            email: user.fields.email,
            role: user.fields.role,
            tenantId: user.fields.tenant_id?.[0]
          })

          // Return user object (will be stored in JWT)
          return {
            id: user.id,
            email: user.fields.email as string,
            name: user.fields.name as string,
            tenantId: user.fields.tenant_id?.[0] || null,
            role: user.fields.role as string,
          }
        } catch (error) {
          logError('auth', error as Error, { email: credentials.email })
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Add custom fields to JWT on sign in
      if (user) {
        token.tenantId = user.tenantId
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      // Add custom fields to session from JWT
      if (session.user) {
        session.user.tenantId = token.tenantId as string
        session.user.role = token.role as string
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Always redirect to dashboard after login
      // Avoid redirecting back to login page
      if (url.includes('/login') || url === baseUrl) {
        return `${baseUrl}/dashboard`
      }

      // If the url is relative (starts with /), append to baseUrl
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      // If url is on the same origin as baseUrl, allow it
      else if (new URL(url).origin === baseUrl) {
        return url
      }
      // Default to dashboard
      return `${baseUrl}/dashboard`
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
})

// Type augmentation for NextAuth
declare module 'next-auth' {
  interface User {
    tenantId?: string | null
    role?: string
  }
  interface Session {
    user: {
      tenantId?: string
      role?: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    tenantId?: string
    role?: string
  }
}
