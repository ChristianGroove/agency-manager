import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-')    // Replace multiple - with single -
    .replace(/^-+/, '')      // Trim - from start of text
    .replace(/-+$/, '')      // Trim - from end of text
}

/**
 * Get portal URL - Client-safe synchronous version
 * For server-side usage with dynamic domains, import from './domain-resolver'
 */
export function getPortalUrl(path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  // Client-side: use current origin
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${cleanPath}`
  }

  // Server-side development
  if (process.env.NODE_ENV === 'development') {
    return `http://localhost:3000${cleanPath}`
  }

  // Server-side production: use environment variables or fallback
  // For dynamic resolution, use getPortalUrl from domain-resolver directly
  const baseUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'mi.pixy.com.co'
  return `https://${baseUrl}${cleanPath}`
}

/**
 * Get admin URL - Client-safe synchronous version
 */
export function getAdminUrl(path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${cleanPath}`
  }

  if (process.env.NODE_ENV === 'development') {
    return `http://localhost:3000${cleanPath}`
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'control.pixy.com.co'
  return `https://${baseUrl}${cleanPath}`
}

// Export async versions for server actions and components that can await
export {
  getPortalUrl as getPortalUrlAsync,
  getAdminUrl as getAdminUrlAsync,
  getPlatformDomains,
  getOrganizationDomains,
  invalidateDomainCache
} from './domain-resolver'


export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
