'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';

type Locale = 'en' | 'es';

export default function LanguageSwitcher() {
    const [locale, setLocale] = useState<Locale>('en');

    useEffect(() => {
        // Load saved locale from localStorage
        const saved = localStorage.getItem('pixy_locale') as Locale;
        if (saved) {
            setLocale(saved);
            document.documentElement.lang = saved;
        }
    }, []);

    const changeLanguage = (newLocale: Locale) => {
        setLocale(newLocale);
        localStorage.setItem('pixy_locale', newLocale);
        document.documentElement.lang = newLocale;

        // Trigger page refresh to apply translations
        // In a real app, this would update context/state
        window.location.reload();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                    <Languages className="h-4 w-4" />
                    <span className="text-sm font-medium uppercase">{locale}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => changeLanguage('en')}>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🇺🇸</span>
                        <div>
                            <p className="font-medium">English</p>
                            <p className="text-xs text-muted-foreground">US</p>
                        </div>
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLanguage('es')}>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🇪🇸</span>
                        <div>
                            <p className="font-medium">Español</p>
                            <p className="text-xs text-muted-foreground">ES</p>
                        </div>
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
