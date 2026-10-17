import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RolePicker } from "@/modules/core/iam/components/role-picker"
import { Switch } from "@/components/ui/switch"
import { createUserManually } from "./actions/team"
import { toast } from "sonner"
import { Eye, EyeOff, Lock, User, Mail, CheckCircle, Loader2, Sparkles, MessageSquare } from "lucide-react"
import { useTranslation } from "@/modules/core/i18n/use-translation"

export function ManualCreationForm({ onSuccess }: { onSuccess: () => void }) {
    const { t } = useTranslation()
    const [email, setEmail] = useState("")
    const [name, setName] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] = useState("")
    const [inboxAccess, setInboxAccess] = useState(true)
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const generateSecurePassword = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*"
        let generated = ""
        for (let i = 0; i < 12; i++) {
            generated += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setPassword(generated)
        setShowPassword(true)
        navigator.clipboard?.writeText(generated).catch(() => {})
        toast.success(t('settings.team.manual_form.password_copied'))
    }

    const handleSubmit = async () => {
        const cleanName = name.trim()
        const cleanEmail = email.trim().toLowerCase()

        if (!cleanName || !cleanEmail || !password || !role) {
            toast.error(t('settings.team.manual_form.validation_all_fields'))
            return
        }
        if (cleanName.length < 2) {
            toast.error(t('settings.team.manual_form.validation_name_len'))
            return
        }
        if (password.length < 6) {
            toast.error(t('settings.team.manual_form.validation_pass_len'))
            return
        }

        setIsLoading(true)

        try {
            const result = await createUserManually({
                email: cleanEmail,
                password,
                fullName: cleanName,
                role,
                inboxAccess
            })

            if (result.success) {
                toast.success(t('settings.team.manual_form.created_success'))
                onSuccess()
            } else {
                toast.error(t('common.error') + ": " + result.error)
            }
        } catch (error) {
            toast.error(t('settings.team.toasts.unexpected_error'))
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="create-name">{t('settings.team.manual_form.name_label')}</Label>
                <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <Input
                        id="create-name"
                        placeholder={t('settings.team.manual_form.name_placeholder')}
                        className="pl-9"
                        autoComplete="off"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="create-email">{t('settings.team.manual_form.email_label')}</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <Input
                        id="create-email"
                        type="email"
                        placeholder={t('settings.team.manual_form.email_placeholder')}
                        className="pl-9"
                        autoComplete="new-password"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="create-password">{t('settings.team.manual_form.password_label')}</Label>
                    <button
                        type="button"
                        onClick={generateSecurePassword}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                        <Sparkles className="h-3 w-3" />
                        {t('settings.team.manual_form.generate_password')}
                    </button>
                </div>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                    <Input
                        id="create-password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t('settings.team.manual_form.password_placeholder')}
                        className="pl-9 pr-9"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4 text-zinc-400" />
                        ) : (
                            <Eye className="h-4 w-4 text-zinc-400" />
                        )}
                    </Button>
                </div>
                <p className="text-xs text-zinc-500">{t('settings.team.manual_form.password_min_length')}</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="create-role">{t('settings.team.manual_form.role_label')}</Label>
                <RolePicker
                    value={role}
                    onValueChange={setRole}
                />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="space-y-0.5 pr-2">
                    <Label htmlFor="create-inbox-access" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                        <MessageSquare className="h-4 w-4 text-indigo-500" />
                        {t('settings.team.manual_form.inbox_label')}
                    </Label>
                    <p className="text-xs text-zinc-500">
                        {inboxAccess
                            ? t('settings.team.manual_form.inbox_enabled_desc')
                            : t('settings.team.manual_form.inbox_disabled_desc')}
                    </p>
                </div>
                <Switch
                    id="create-inbox-access"
                    checked={inboxAccess}
                    onCheckedChange={setInboxAccess}
                />
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 rounded-xl text-xs border border-amber-200/70 dark:border-amber-500/20">
                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p>
                    {t('settings.team.manual_form.important_note')}
                </p>
            </div>

            <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.team.manual_form.submit_button')}
            </Button>
        </div>
    )
}

