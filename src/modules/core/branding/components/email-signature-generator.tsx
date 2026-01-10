"use client"

import { useState } from "react"
import { BrandingConfig } from "../actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Check } from "lucide-react"

interface EmailSignatureGeneratorProps {
    settings: BrandingConfig
    trigger?: React.ReactNode
}

export function EmailSignatureGenerator({ settings, trigger }: EmailSignatureGeneratorProps) {
    const [name, setName] = useState("Jane Doe")
    const [title, setTitle] = useState("Account Manager")
    const [email, setEmail] = useState("jane@agency.com")
    const [phone, setPhone] = useState("+1 234 567 890")
    const [copied, setCopied] = useState(false)

    // Derived branding
    const logoUrl = settings.logos.main || "https://placehold.co/100x40"
    const color = settings.colors.primary || "#000000"
    const agencyName = settings.name || "Agency"
    const website = settings.website || "www.agency.com"

    const generateHtml = () => {
        return `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.4; color: #333;">
    <tr>
        <td style="padding-right: 20px; border-right: 2px solid ${color};">
            <img src="${logoUrl}" alt="${agencyName}" style="display: block; max-height: 50px; width: auto;" />
        </td>
        <td style="padding-left: 20px;">
            <div style="font-weight: bold; color: ${color}; font-size: 16px;">${name}</div>
            <div style="font-style: italic; margin-bottom: 8px;">${title}</div>
            <div>
                <a href="mailto:${email}" style="color: #666; text-decoration: none;">${email}</a>
            </div>
            <div>
                <a href="tel:${phone}" style="color: #666; text-decoration: none;">${phone}</a>
            </div>
            <div style="margin-top: 8px;">
                <a href="${website}" style="color: ${color}; text-decoration: none; font-weight: bold;">${website}</a>
            </div>
        </td>
    </tr>
</table>
        `.trim()
    }

    const handleCopy = () => {
        const html = generateHtml()
        // Copy as rich text (HTML) is tricky, usually we copy source code OR render it and copy selection
        // For simplicity, we copy the source code for standard inputs, or try to use Clipboard API for text/html

        const blob = new Blob([html], { type: "text/html" });
        const textBlob = new Blob([html], { type: "text/plain" });

        const item = new ClipboardItem({
            "text/html": blob,
            "text/plain": textBlob
        });

        navigator.clipboard.write([item]).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }).catch(err => {
            console.error(err)
            // Fallback
            navigator.clipboard.writeText(html)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline">Generate Email Signature</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Email Signature Generator</DialogTitle>
                    <DialogDescription>
                        Create a consistent email signature for you and your team.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Job Title</Label>
                            <Input value={title} onChange={e => setTitle(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label>Preview</Label>
                        <div className="p-6 border rounded-lg bg-white shadow-sm flex items-center justify-center min-h-[200px]">
                            <div dangerouslySetInnerHTML={{ __html: generateHtml() }} />
                        </div>
                        <Button className="w-full" onClick={handleCopy}>
                            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                            {copied ? "Copied to Clipboard" : "Copy Signature"}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                            Paste directly into Gmail, Outlook, or Apple Mail settings.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
