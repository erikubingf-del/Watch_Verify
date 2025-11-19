'use client'

import { signOut } from 'next-auth/react'

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      style={{
        width: '100%',
        padding: '8px 12px',
        background: '#1f2937',
        border: '1px solid #374151',
        borderRadius: 6,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#374151'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#1f2937'
      }}
    >
      Sair
    </button>
  )
}
