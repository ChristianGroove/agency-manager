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

export function getPortalUrl(path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (typeof window === 'undefined') {
    const baseUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'https://mi.pixy.com.co';
    return `${baseUrl}${cleanPath}`;
  }

  const isLocalhost = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');

  if (isLocalhost) {
    return `${window.location.origin}${cleanPath}`;
  }

  return `https://mi.pixy.com.co${cleanPath}`;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
