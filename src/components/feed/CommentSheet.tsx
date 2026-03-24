'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/components/auth/AuthProvider'

interface Comment {
  id: string
  text: string
  createdAt: string
  user: { id: string; username: string }
}

interface CommentSheetProps {
  postId: string
  open: boolean
  onClose: () => void
  onCountChange: (count: number) => void
}

export default function CommentSheet({ postId, open, onClose, onCountChange }: CommentSheetProps) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchComments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/posts/${postId}/comments`)
      const data = await res.json()
      setComments(data)
      onCountChange(data.length)
    } catch {
      // ignore fetch errors
    } finally {
      setLoading(false)
    }
  }, [postId, onCountChange])

  useEffect(() => {
    if (!open) return
    fetchComments()
  }, [open, fetchComments])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || submitting) return
    setError('')
    setSubmitting(true)

    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim() }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      setError(data.error)
      return
    }

    setComments((prev) => {
      const updated = [data, ...prev]
      onCountChange(updated.length)
      return updated
    })
    setText('')
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[70dvh] flex-col rounded-t-2xl border-t border-white/10 bg-zinc-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="text-sm font-semibold text-white">
                {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </span>
              <button onClick={onClose} className="text-white/50 hover:text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                </div>
              ) : comments.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/40">No comments yet. Be the first!</p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
                        {comment.user.username[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-white">
                            @{comment.user.username}
                          </span>
                          <span className="text-xs text-white/30">
                            {formatTimeAgo(comment.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-white/80">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-white/10 px-4 py-3">
              {user ? (
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Add a comment..."
                    maxLength={500}
                    className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-white/30 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!text.trim() || submitting}
                    className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
                  >
                    Post
                  </button>
                </form>
              ) : (
                <p className="text-center text-sm text-white/40">
                  <a href="/login" className="text-indigo-400 hover:text-indigo-300">Log in</a> to comment
                </p>
              )}
              {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function formatTimeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}
