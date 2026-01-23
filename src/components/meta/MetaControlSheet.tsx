'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
    Rocket,
    Bot,
    Smartphone,
    Phone,
    TrendingUp,
    CheckCircle,
    X
} from 'lucide-react';

// Import tab content components
// Import tab content components
import CallingTab from './tabs/CallingTab';
import AppReviewTab from './tabs/AppReviewTab';
import MarketingTab from './tabs/MarketingTab';
import FlowsTab from './tabs/FlowsTab';
import InfraTab from './tabs/InfraTab';
import AiTab from './tabs/AiTab';

export default function MetaControlSheet() {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('calling'); // Default to calling (P0)

    return (
        <>
            {/* Meta Control Trigger - Centered Bottom Floating Button */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999]">
                <Button
                    onClick={() => setOpen(true)}
                    variant="outline"
                    size="icon"
                    className="rounded-full w-8 h-8 shadow-xl backdrop-blur-md bg-background/50 border-input transition-all duration-300 hover:scale-110 hover:bg-background/80"
                    title="Meta Control Center"
                >
                    <Rocket className="w-4 h-4 text-primary animate-pulse" />
                    <span className="sr-only">Open Meta Control</span>
                </Button>
            </div>

            {/* Meta Control Sheet */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-2xl overflow-y-auto p-0"
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <SheetTitle className="text-2xl">Meta Control Center</SheetTitle>
                                <SheetDescription>
                                    Manage WhatsApp Business Platform features
                                </SheetDescription>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setOpen(false)}
                                className="h-8 w-8"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-0">
                        <div className="sticky top-[73px] z-10 bg-background border-b px-6 py-2">
                            <TabsList className="grid grid-cols-6 w-full h-auto">
                                <TabsTrigger
                                    value="infrastructure"
                                    className="flex flex-col gap-1 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                >
                                    <Rocket className="w-4 h-4" />
                                    <span className="text-xs">Infra</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="ai"
                                    className="flex flex-col gap-1 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                >
                                    <Bot className="w-4 h-4" />
                                    <span className="text-xs">AI</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="flows"
                                    className="flex flex-col gap-1 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                >
                                    <Smartphone className="w-4 h-4" />
                                    <span className="text-xs">Flows</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="calling"
                                    className="flex flex-col gap-1 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                >
                                    <Phone className="w-4 h-4" />
                                    <span className="text-xs">Calling</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="marketing"
                                    className="flex flex-col gap-1 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                >
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-xs">Marketing</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="review"
                                    className="flex flex-col gap-1 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-xs">Review</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Tab Content */}
                        <div className="px-6 py-6">
                            <TabsContent value="infrastructure" className="mt-0">
                                <InfraTab />
                            </TabsContent>

                            <TabsContent value="ai" className="mt-0">
                                <AiTab />
                            </TabsContent>

                            <TabsContent value="flows" className="mt-0">
                                <FlowsTab />
                            </TabsContent>

                            <TabsContent value="calling" className="mt-0">
                                <CallingTab />
                            </TabsContent>

                            <TabsContent value="marketing" className="mt-0">
                                <MarketingTab />
                            </TabsContent>

                            <TabsContent value="review" className="mt-0">
                                <AppReviewTab />
                            </TabsContent>
                        </div>
                    </Tabs>
                </SheetContent>
            </Sheet>
        </>
    );
}
