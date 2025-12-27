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
            <div className="border-b pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                        <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">Platform Administration</h1>
                        <p className="text-muted-foreground">
                            Manage all organizations, users, and platform settings
                        </p>
                    </div>
                </div>
            </div>
            {children}
        </div>
    )
}
