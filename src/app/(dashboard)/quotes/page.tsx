import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Download } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

export default function QuotesPage() {
    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Cotizaciones</h2>
                <Link href="/quotes/new">
                    <Button className="bg-brand-pink hover:bg-brand-pink/90 text-white shadow-md border-0">
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Cotización
                    </Button>
                </Link>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Número</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Placeholder data */}
                        <TableRow>
                            <TableCell className="font-medium">COT-001</TableCell>
                            <TableCell>Cliente Potencial</TableCell>
                            <TableCell>20 Dic 2025</TableCell>
                            <TableCell>$2,000,000</TableCell>
                            <TableCell>
                                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-blue-100 text-blue-800 hover:bg-blue-100/80">
                                    Borrador
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="sm" className="mr-2">
                                    <Download className="w-4 h-4 mr-1" /> PDF
                                </Button>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
