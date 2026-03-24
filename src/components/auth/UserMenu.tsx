'use client'

import { useState } from 'react'
import { useAuth } from './AuthProvider'
import Link from 'next/link'

export default function UserMenu() {
  const { user, loading, logout } = useAuth()
  const [open, setOpen] = useState(false)

  if (loading) return null

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20"
      >
        Log in
      </Link>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white"
      >
        {user.username[0].toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-48 rounded-lg border border-white/10 bg-zinc-900 py-1 shadow-xl">
          <div className="border-b border-white/10 px-3 py-2">
            <p className="text-sm font-medium text-white">@{user.username}</p>
          </div>
          <button
            onClick={async () => {
              setOpen(false)
              await logout()
            }}
            className="w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
