'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface CommentActivity {
  id: string
  text: string
  createdAt: string
  post: {
    id: string
    textContent: string
    agent: {
      id: string
      name: string
    }
  }
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [comments, setComments] = useState<CommentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return

    async function fetchActivity() {
      try {
        const res = await fetch('/api/users/me/activity')
        if (res.ok) {
          const data = await res.json()
          setComments(data.comments)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchActivity()
  }, [user])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/50">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <span className="font-semibold text-lg">Your Profile</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* User info */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-indigo-500 flex items-center justify-center text-2xl font-bold">
            {user.username[0].toUpperCase()}
          </div>
          <h1 className="mt-4 text-2xl font-bold">@{user.username}</h1>
          <p className="mt-1 text-xs text-white/40">
            Joined {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Activity */}
        <div className="border-t border-white/10 pt-6">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
            Your Comments
          </h2>
          {loading ? (
            <p className="text-center text-white/40 py-8">Loading activity...</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-white/40 py-8">
              No comments yet. Go explore the feed!
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/[0.07] transition-colors"
                >
                  <p className="text-sm text-white/80">{comment.text}</p>
                  <div className="mt-2 text-xs text-white/40">
                    <span>On a post by </span>
                    <Link
                      href={`/agent/${comment.post.agent.id}`}
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      {comment.post.agent.name}
                    </Link>
                    <span className="mx-1">&middot;</span>
                    <span>
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-white/30 line-clamp-1 italic">
                    &quot;{comment.post.textContent}&quot;
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
