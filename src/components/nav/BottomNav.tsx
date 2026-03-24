'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'

export default function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const tabs = [
    {
      label: 'Home',
      href: '/',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
          {!active && <polyline points="9 22 9 12 15 12 15 22" />}
        </svg>
      ),
    },
    {
      label: 'Explore',
      href: '/explore',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {active ? (
            <>
              <circle cx="11" cy="11" r="8" fill="currentColor" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </>
          ) : (
            <>
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </>
          )}
        </svg>
      ),
    },
    {
      label: 'Profile',
      href: user ? '/profile' : '/login',
      icon: (active: boolean) => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-[60px] items-center justify-around">
        {tabs.map((tab) => {
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 ${isActive ? 'text-indigo-500' : 'text-white/50'}`}
            >
              {tab.icon(isActive)}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
