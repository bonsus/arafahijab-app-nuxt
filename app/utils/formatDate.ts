
import { DateTime } from 'luxon'

export function formatDate(date: Date | string): string {
  if (!date) return '';
  if (typeof date === 'string') {
    date = new Date(date);
  }
  if (isNaN(date.getTime())) {
    return '';
  }
  if (date.toString() === 'Invalid Date') {
    return '';
  }
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(date)).toLowerCase().replace('pukul ', '')
}

export function formatForDatetimeLocal(dateString: string) {
  const date = new Date(dateString)
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60 * 1000)
  return localDate.toISOString().slice(0, 16) // "YYYY-MM-DDTHH:mm"
}

export function formatDateToISOString(datetimeLocal: string) {
  const date = new Date(datetimeLocal)
  return date.toISOString() // UTC, contoh: "2025-07-23T10:40:00.000Z"
}

export function formatToAsiaJakarta(datetimeLocal: string) {
  return DateTime.fromISO(datetimeLocal, { zone: 'Asia/Jakarta' }).toISO()
}
