'use client'

import { useState, useEffect } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatRelative } from '@/lib/utils'
import type { UserRole } from '@prisma/client'

interface Comment {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  createdBy: { id: string; name: string; avatarUrl?: string | null }
}

interface Props {
  dailyLogId: string
  status: string
  currentUserId: string
  currentUserRole: UserRole
}

export function CommentSection({ dailyLogId, status, currentUserId, currentUserRole }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  const canComment = !(currentUserRole === 'CLIENTE_SINDICO' && status !== 'APROVADO')
  const isAdmin = ['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(currentUserRole)

  useEffect(() => {
    fetch(`/api/daily-logs/${dailyLogId}/comments`)
      .then(r => r.json())
      .then(d => setComments(d.data ?? []))
      .finally(() => setLoading(false))
  }, [dailyLogId])

  async function postComment() {
    if (!content.trim()) return
    setPosting(true)
    const res = await fetch(`/api/daily-logs/${dailyLogId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim() }),
    })
    if (res.ok) {
      const json = await res.json()
      setComments(prev => [...prev, json.data])
      setContent('')
    }
    setPosting(false)
  }

  async function deleteComment(id: string) {
    await fetch(`/api/daily-logs/${dailyLogId}/comments/${id}`, { method: 'DELETE' })
    setComments(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <div className="py-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>

  return (
    <div className="space-y-4">
      {comments.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">Nenhum comentário ainda.</p>
      )}

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {comments.map(c => (
          <div key={c.id} className="flex items-start gap-3">
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-blue-700">
              {c.createdBy.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-900">{c.createdBy.name}</span>
                <span className="text-xs text-gray-400">{formatRelative(c.createdAt)}</span>
                {c.updatedAt !== c.createdAt && <span className="text-xs text-gray-400">(editado)</span>}
              </div>
              <p className="text-sm text-gray-700 mt-0.5 break-words">{c.content}</p>
            </div>
            {(c.createdBy.id === currentUserId || isAdmin) && (
              <button onClick={() => deleteComment(c.id)} className="text-gray-300 hover:text-red-500 text-xs flex-shrink-0 transition-colors" aria-label="Remover comentário">✕</button>
            )}
          </div>
        ))}
      </div>

      {canComment && (
        <div className="flex items-end gap-2 pt-2 border-t border-gray-100">
          <textarea
            className="flex-1 border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
            placeholder="Adicione um comentário..."
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment() } }}
            disabled={posting}
            aria-label="Comentário"
          />
          <Button size="icon" onClick={postComment} disabled={posting || !content.trim()} aria-label="Enviar">
            {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
  )
}
