import React from 'react';
import { Sparkles } from 'lucide-react';
import { SectionHeader } from '@/components/layout/section-header';

export default function IntelligenceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-6 p-6 pb-20">
            <SectionHeader
                title="Centro de Mando IA"
                subtitle="Control global de Pixy Assistant, Voz y Modelos Generativos."
                icon={Sparkles}
            />
            {children}
        </div>
    );
}
