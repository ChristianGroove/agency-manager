import React from 'react';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface BasePropertyLayoutProps {
    title: string;
    children: React.ReactNode;
    description?: string;
}

export function BasePropertyLayout({ title, children, description }: BasePropertyLayoutProps) {
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Separator className="bg-slate-100 dark:bg-slate-800" />
            <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {title}
                </Label>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
            <div className="space-y-4">
                {children}
            </div>
        </div>
    );
}
