/**
 * Support Ticket Thread Read State Tracker
 * Tracks when a staff member last viewed/read comments in a support ticket thread.
 */

export interface SupportTicketReadInfo {
  readCount: number
  lastReadAt: string
}

export type SupportReadState = Record<string, SupportTicketReadInfo>

export function getTicketReadState(staffId: string): SupportReadState {
  if (typeof window === "undefined" || !staffId) return {}
  try {
    const raw = localStorage.getItem(`pixy_support_thread_read_${staffId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function markTicketThreadAsRead(
  staffId: string,
  ticketId: string,
  currentCommentCount: number
) {
  if (typeof window === "undefined" || !staffId || !ticketId) return
  try {
    const state = getTicketReadState(staffId)
    state[ticketId] = {
      readCount: currentCommentCount,
      lastReadAt: new Date().toISOString(),
    }
    localStorage.setItem(`pixy_support_thread_read_${staffId}`, JSON.stringify(state))
    window.dispatchEvent(
      new CustomEvent("support-thread-read-update", {
        detail: { ticketId, readCount: currentCommentCount, staffId },
      })
    )
  } catch (e) {
    console.error("Error saving support ticket read state:", e)
  }
}

export function getUnreadCommentCount(
  ticket: {
    id: string
    comments_count?: number
    last_comment_at?: string | null
    last_comment_author_id?: string | null
  },
  currentStaffId: string,
  readState: SupportReadState
): number {
  const total = ticket.comments_count || 0
  if (total === 0) return 0

  // If the current staff wrote the last comment, they already know about it
  if (ticket.last_comment_author_id && ticket.last_comment_author_id === currentStaffId) {
    return 0
  }

  const info = readState[ticket.id]
  if (!info) {
    // Has comments and was never read by this user
    return total
  }

  if (total > info.readCount) {
    return total - info.readCount
  }

  if (ticket.last_comment_at && new Date(ticket.last_comment_at).getTime() > new Date(info.lastReadAt).getTime()) {
    return Math.max(1, total - info.readCount)
  }

  return 0
}
