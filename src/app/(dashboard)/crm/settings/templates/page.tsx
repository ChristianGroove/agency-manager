"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, FileText } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { getTemplates, createTemplate, deleteTemplate, MessageTemplate } from "@/modules/core/messaging/template-actions"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function TemplatesPage() {
    const [templates, setTemplates] = useState<MessageTemplate[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    // Create Form
    const [newName, setNewName] = useState("")
    const [newContent, setNewContent] = useState("")
    const [newCategory, setNewCategory] = useState<'text' | 'hsm'>('text')

    useEffect(() => {
        loadTemplates()
    }, [])

    const loadTemplates = async () => {
        try {
            const data = await getTemplates()
            setTemplates(data)
        } catch (error) {
            console.error(error)
            toast.error("Failed to load templates")
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreate = async () => {
        if (!newName || !newContent) return
        try {
            await createTemplate({
                name: newName,
                content: newContent,
                category: newCategory
            })
            toast.success("Template created")
            setIsCreateOpen(false)
            setNewName("")
            setNewContent("")
            loadTemplates()
        } catch (error) {
            toast.error("Failed to create template")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this template?")) return
        try {
            await deleteTemplate(id)
            setTemplates(templates.filter(t => t.id !== id))
            toast.success("Template deleted")
        } catch (error) {
            toast.error("Failed to delete")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Message Templates</h3>
                    <p className="text-sm text-muted-foreground">Manage quick replies and automated messages</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            New Template
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Template</DialogTitle>
                            <DialogDescription>Add a new message template to your library.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>Template Name</Label>
                                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Welcome Message" />
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={newCategory} onValueChange={(v: any) => setNewCategory(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">Text (Quick Reply)</SelectItem>
                                        <SelectItem value="hsm">HSM (WhatsApp Approved)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Content</Label>
                                <Textarea
                                    className="min-h-[100px]"
                                    value={newContent}
                                    onChange={e => setNewContent(e.target.value)}
                                    placeholder="Type your message here..."
                                />
                            </div>
                            <Button onClick={handleCreate} className="w-full">Create Template</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div>Loading...</div>
            ) : templates.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                        <FileText className="h-10 w-10 mb-4 opacity-20" />
                        <p>No templates found.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map(template => (
                        <Card key={template.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium truncate pr-4">
                                    {template.name}
                                </CardTitle>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => handleDelete(template.id)}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground mb-2 capitalize bg-secondary w-fit px-2 py-0.5 rounded">
                                    {template.category}
                                </p>
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    {template.content}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
