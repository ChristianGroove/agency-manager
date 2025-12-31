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
  try {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    if (typeof window === 'undefined') {
      // Server-side generation
      if (process.env.NODE_ENV === 'development') {
        return `http://localhost:3000${cleanPath}`;
      }
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_PORTAL_URL || 'https://mi.pixy.com.co';
      return `${baseUrl}${cleanPath}`;
    }

    // Client-side generation
    return `${window.location.origin}${cleanPath}`;
  } catch (e) {
    // Fail safe fallback to prevent partial rendering crashes
    console.error("getPortalUrl crash:", e);
    return `https://mi.pixy.com.co/${path}`;
  }
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
