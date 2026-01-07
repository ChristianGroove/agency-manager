
import { Separator } from "@/components/ui/separator";
import { NotificationsCard } from "@/modules/core/preferences/components/notifications-card";
import { ProductivityCard } from "@/modules/core/preferences/components/productivity-card";
import { DisplayCard } from "@/modules/core/preferences/components/display-card";

export default function InboxSettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Inbox Configuration</h3>
                <p className="text-sm text-muted-foreground">
                    Customize your messaging experience, notifications, and workflow.
                </p>
            </div>
            <Separator />

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                    <NotificationsCard />
                    <DisplayCard />
                </div>
                <div className="space-y-6">
                    <ProductivityCard />
                    {/* Placeholder for future shortcuts customizer */}
                </div>
            </div>
        </div>
    );
}
