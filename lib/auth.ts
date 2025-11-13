import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { atSelect } from '@/utils/airtable'
import bcrypt from 'bcryptjs'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@store.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('🔐 Login attempt for:', credentials?.email)

        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials')
          return null
        }

        try {
          // Query Airtable Users table
          console.log('📋 Querying Airtable Users table...')
          const users = await atSelect('Users', {
            filterByFormula: `({email}='${String(credentials.email).replace(/'/g, "\\'")}')`,
          })

          if (!users.length) {
            console.log('❌ No user found with email:', credentials.email)
            return null
          }

          const user = users[0]
          console.log('✅ User found:', user.fields.email)
          console.log('   Active:', user.fields.active)
          console.log('   Has password_hash:', !!user.fields.password_hash)
          console.log('   Tenant ID:', user.fields.tenant_id)

          // Check if user is active
          if (!user.fields.active) {
            console.log('❌ User is not active')
            return null
          }

          // Verify password
          console.log('🔑 Verifying password...')
          const passwordMatch = await bcrypt.compare(
            String(credentials.password),
            user.fields.password_hash as string
          )

          if (!passwordMatch) {
            console.log('❌ Password does not match')
            return null
          }

          console.log('✅ Password match! Login successful')

          // Return user object (will be stored in JWT)
          return {
            id: user.id,
            email: user.fields.email as string,
            name: user.fields.name as string,
            tenantId: user.fields.tenant_id?.[0] || null,
            role: user.fields.role as string,
          }
        } catch (error) {
          console.error('❌ Auth error:', error)
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
