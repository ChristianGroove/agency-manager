import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertCircle } from "lucide-react"

export default function AuthErrorPage({
    searchParams,
}: {
    searchParams: { error?: string; error_description?: string; error_code?: string }
}) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <div className="mx-auto flex w-full max-w-md flex-col items-center space-y-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
                    <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tighter">Authentication Error</h1>
                    <p className="text-gray-500">
                        {searchParams.error_description || "There was a problem signing you in."}
                    </p>
                    {searchParams.error_code && (
                        <code className="rounded bg-muted px-2 py-1 text-sm">
                            Code: {searchParams.error_code}
                        </code>
                    )}
                </div>
                <div className="flex gap-4">
                    <Button asChild variant="outline">
                        <Link href="/platform">Go to Dashboard</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/login">Back to Login</Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
