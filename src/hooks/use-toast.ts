'use client'

import { useState, useCallback } from 'react'

interface ToastOptions {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
  duration?: number
}

interface ToastItem extends ToastOptions {
  id: string
}

// Simple in-memory toast store
let listeners: Array<(toasts: ToastItem[]) => void> = []
let toasts: ToastItem[] = []

function notify() {
  listeners.forEach((l) => l([...toasts]))
}

export function toast(options: ToastOptions) {
  const id = Math.random().toString(36).slice(2)
  const item: ToastItem = { ...options, id }
  toasts = [...toasts, item]
  notify()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    notify()
  }, options.duration ?? 4000)
}

export function useToast() {
  const [items, setItems] = useState<ToastItem[]>([])

  const subscribe = useCallback(() => {
    const handler = (t: ToastItem[]) => setItems(t)
    listeners.push(handler)
    return () => { listeners = listeners.filter((l) => l !== handler) }
  }, [])

  return { toast, toasts: items, subscribe }
}
