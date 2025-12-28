import { redirect } from 'next/navigation'
import { isSuperAdmin } from '@/lib/auth/platform-roles'
import { createClient } from '@/lib/supabase-server'
import { Shield } from 'lucide-react'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const isAdmin = await isSuperAdmin(user.id)
    if (!isAdmin) {
        // Return 404 to hide admin routes existence from non-admins
        redirect('/404')
    }

    return (
        <div className="space-y-6">
            {children}
        </div>
    )
}
