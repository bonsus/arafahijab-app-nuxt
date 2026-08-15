import { reactive } from 'vue'

/**
 * Privacy masking for order customer & address data.
 * Only applies to orders from Shopee (store.source === 'shopee').
 * A single `revealAll` toggle per page reveals the real data.
 */

function maskName(name: string): string {
  const trimmed = (name || '').trim()
  if (!trimmed) return ''
  if (trimmed.length <= 2) return `${trimmed[0] || ''}**`
  const first = trimmed[0]
  const last = trimmed[trimmed.length - 1]
  return first + '*'.repeat(Math.min(4, trimmed.length - 2)) + last
}

function maskPhone(phone: string): string {
  if (!phone) return ''
  const digits = phone.replace(/\D+/g, '')
  if (digits.length < 6) {
    const head = (phone[0] || '')
    return head + '****' + (phone.length > 1 ? phone.slice(-1) : '')
  }
  return digits.slice(0, 4) + '****' + digits.slice(-2)
}

function maskWord(word: string): string {
  const w = (word || '').trim()
  if (!w) return ''
  if (w.length <= 2) return `${w[0] || ''}**`
  return w[0] + '*'.repeat(w.length - 2) + w[w.length - 1]
}

function maskText(text: string): string {
  if (!text) return ''
  // Mask full street-like text: keep first 2 and last 2 chars
  const t = text.trim()
  if (t.length <= 4) return '*****'
  return t.slice(0, 2) + '*'.repeat(Math.min(6, t.length - 4)) + t.slice(-2)
}

export function useOrderPrivacy() {
  const state = reactive({ revealAll: false })

  function toggleReveal() {
    state.revealAll = !state.revealAll
  }

  function isRevealed() {
    return state.revealAll
  }

  function isProtected(source?: string | null): boolean {
    return source === 'shopee'
  }

  function customerName(name: string | undefined | null, source?: string | null): string {
    if (!name) return name || ''
    return isProtected(source) && !state.revealAll ? maskName(name) : name
  }

  function customerPhone(phone: string | undefined | null, source?: string | null): string {
    if (!phone) return phone || ''
    return isProtected(source) && !state.revealAll ? maskPhone(phone) : phone
  }

  function text(value: string | undefined | null, source?: string | null): string {
    if (!value) return value || ''
    return isProtected(source) && !state.revealAll ? maskText(value) : value
  }

  // For structured address: keep first+last of each field
  function addressField(value: string | undefined | null, source?: string | null): string {
    if (!value) return value || ''
    return isProtected(source) && !state.revealAll ? maskWord(value) : value
  }

  return {
    revealAll: state.revealAll,
    toggleReveal,
    isRevealed,
    isProtected,
    customerName,
    customerPhone,
    text,
    addressField,
  }
}