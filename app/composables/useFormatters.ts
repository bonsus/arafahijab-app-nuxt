export function formatCurrency(val: number | string): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(val) || 0)
}

export function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.startsWith('0001') || dateStr.startsWith('1970')) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr || dateStr.startsWith('0001') || dateStr.startsWith('1970')) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
export function formatDateTimeDay(dateStr: string): string {
  if (!dateStr || dateStr.startsWith('0001') || dateStr.startsWith('1970')) return '-'

  const date = new Date(dateStr)

  const tanggal = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)

  const jam = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)

  return `${tanggal} ${jam}`
}

/**
 * Convert an ISO 8601 datetime string to the value format used by <input type="datetime-local">
 * Input:  "2026-05-02T14:30:00+07:00"
 * Output: "2026-05-02T14:30"
 */
export function convertIsoToDatetimeLocal(isoString: string): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export function formatDateTimeWithTZ(datetimeLocal: string): string {
  if (!datetimeLocal) return ''
  const dt = new Date(datetimeLocal)
  const pad = (n: number) => String(n).padStart(2, '0')
  const Y = dt.getFullYear(), M = pad(dt.getMonth() + 1), D = pad(dt.getDate())
  const h = pad(dt.getHours()), m = pad(dt.getMinutes())
  const offset = -dt.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const oh = pad(Math.floor(Math.abs(offset) / 60))
  const om = pad(Math.abs(offset) % 60)
  return `${Y}-${M}-${D}T${h}:${m}:00${sign}${oh}:${om}`
}
/**
 * Format a datetime-local value to ISO 8601 with local timezone offset for API submission.
 * Input:  "2026-05-02T14:30"  (from <input type="datetime-local">)
 * Output: "2026-05-02T14:30:00+07:00"
 */
export function formatDateTimeForApi(dateTimeLocal: string): string {
  if (!dateTimeLocal) return ''
  const date = new Date(dateTimeLocal)
  const offset = -date.getTimezoneOffset()
  const offsetSign = offset >= 0 ? '+' : '-'
  const offsetHH = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0')
  const offsetMM = (Math.abs(offset) % 60).toString().padStart(2, '0')
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:00${offsetSign}${offsetHH}:${offsetMM}`
}

/**
 * Build an RFC3339 string with the local timezone offset for a plain date + time.
 * Input:  dateStr "2026-07-01", time "00:00:00"
 * Output: "2026-07-01T00:00:00+07:00"
 */
function dateWithLocalTZ(dateStr: string, time: string): string {
  const date = new Date(`${dateStr}T${time}`)
  const offset = -date.getTimezoneOffset()
  const offsetSign = offset >= 0 ? '+' : '-'
  const offsetHH = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0')
  const offsetMM = (Math.abs(offset) % 60).toString().padStart(2, '0')
  return `${dateStr}T${time}${offsetSign}${offsetHH}:${offsetMM}`
}

/**
 * Convert a plain date string (YYYY-MM-DD) into the API `date_from` value:
 * start of day with local timezone offset, e.g. "2026-07-01T00:00:00+07:00".
 */
export function formatDateFromForApi(dateStr: string): string {
  if (!dateStr) return ''
  return dateWithLocalTZ(dateStr, '00:00:00')
}

/**
 * Convert a plain date string (YYYY-MM-DD) into the API `date_to` value:
 * end of day with local timezone offset, e.g. "2026-07-09T23:59:59+07:00".
 */
export function formatDateToForApi(dateStr: string): string {
  if (!dateStr) return ''
  return dateWithLocalTZ(dateStr, '23:59:59')
}
