import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RolePicker } from "@/modules/core/iam/components/role-picker"
import { createUserManually } from "./actions/team-actions"
import { toast } from "sonner"
import { Eye, EyeOff, Lock, User, Mail, CheckCircle, Loader2 } from "lucide-react"

export function ManualCreationForm({ onSuccess }: { onSuccess: () => void }) {
    const [email, setEmail] = useState("")
    const [name, setName] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async () => {
        if (!email || !password || !name) {
            toast.error("Todos los campos son obligatorios")
            return
        }
        if (password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres")
            return
        }

        setIsLoading(true)
        try {
            const result = await createUserManually({
                email,
                password,
                fullName: name,
                role
            })

            if (result.success) {
                toast.success("Usuario creado exitosamente")
                onSuccess()
            } else {
                toast.error("Error: " + result.error)
            }
        } catch (error) {
            toast.error("Error inesperado al crear usuario")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="create-name">Nombre Completo</Label>
                <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                        id="create-name"
                        placeholder="Nombre del miembro"
                        className="pl-9"
                        autoComplete="off"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="create-email">Correo Electrónico</Label>
                <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                        id="create-email"
                        type="email"
                        placeholder="correo@empresa.com"
                        className="pl-9"
                        autoComplete="new-password"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="create-password">Contraseña</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                        id="create-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Contraseña segura"
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
                            <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                        )}
                    </Button>
                </div>
                <p className="text-xs text-gray-500">Mínimo 6 caracteres.</p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="create-role">Rol</Label>
                <RolePicker
                    value={role}
                    onValueChange={setRole}
                />
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-md text-xs">
                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                    <strong>Nota Importante:</strong> El usuario será creado y confirmado inmediatamente.
                    Tú eres responsable de comunicarle sus credenciales de acceso de forma segura.
                </p>
            </div>

            <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Usuario
            </Button>
        </div>
    )
}
