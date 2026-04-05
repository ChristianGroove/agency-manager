import { SupabaseClient } from '@supabase/supabase-js'
import { Client } from '@/types'

export class ClientService {
    constructor(private supabase: SupabaseClient, private organizationId: string, private userId?: string) {}

    async getPaginated(params: {
        page?: number,
        pageSize?: number,
        search?: string,
        categoryId?: string,
    }): Promise<{ clients: any[], totalCount: number }> {
        const page = params.page || 1
        const pageSize = params.pageSize || 50
        const from = (page - 1) * pageSize
        const to = from + pageSize - 1

        let query = this.supabase
            .from('leads')
            .select(`
                *,
                active_services_count:services(count),
                hosting_accounts(*),
                subscriptions(*),
                invoices(*)
            `, { count: 'exact' })
            .eq('organization_id', this.organizationId)
            .eq('contact_type', 'client')
            .is('deleted_at', null)

        if (params.search) {
            query = query.or(`name.ilike.%${params.search}%,company_name.ilike.%${params.search}%,email.ilike.%${params.search}%,phone.ilike.%${params.search}%`)
        }

        if (params.categoryId && params.categoryId !== 'all') {
            query = query.eq('category_id', params.categoryId)
        }

        query = query.order('created_at', { ascending: false }).range(from, to)

        const { data, count, error } = await query
        
        if (error) {
            console.error("Error fetching clients:", error)
            return { clients: [], totalCount: 0 }
        }

        const now = new Date()
        now.setHours(0, 0, 0, 0)

        const clientsMapped = (data || []).map((client: any) => {
            let debt = 0
            let futureDebt = 0

            // Filter out ghost invoices (soft-deleted, archived, void, draft)
            const activeInvoices = (client.invoices || []).filter((inv: any) => 
                !inv.deleted_at && 
                !inv.archived && 
                inv.status !== 'void' && 
                inv.status !== 'draft'
            )

            activeInvoices.forEach((inv: any) => {
                if (inv.status === 'pending' || inv.status === 'overdue') {
                    const due = new Date(inv.due_date || new Date())
                    due.setHours(0, 0, 0, 0)
                    if (due < now) {
                        debt += inv.total || 0
                    } else {
                        futureDebt += inv.total || 0
                    }
                }
            })

            return {
                ...client,
                invoices: activeInvoices,
                debt,
                futureDebt
            }
        })

        return {
            clients: clientsMapped,
            totalCount: count || 0
        }
    }

    async getById(id: string): Promise<Client> {
        const { data, error } = await this.supabase
            .from('leads')
            .select('*')
            .eq('id', id)
            .eq('organization_id', this.organizationId)
            .eq('contact_type', 'client')
            .single()

        if (error) throw error
        return data as Client
    }

    async deleteClients(ids: string[]): Promise<void> {
        // Soft delete
        const { error } = await this.supabase
            .from('leads')
            .update({ deleted_at: new Date().toISOString() })
            .eq('organization_id', this.organizationId)
            .eq('contact_type', 'client')
            .in('id', ids)

        if (error) throw error
    }
}
