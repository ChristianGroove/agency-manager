import React from 'react';
import { cn } from '@/lib/utils';
import { Wifi, Signal, Battery } from 'lucide-react';

interface DeviceMockupProps {
    children: React.ReactNode;
    className?: string;
}

export function DeviceMockup({ children, className }: DeviceMockupProps) {
    return (
        <div className={cn(
            "relative mx-auto border-gray-900 bg-gray-900 border-[14px] rounded-[3rem] shadow-2xl overflow-hidden",
            // iPhone 14 Pro Dimensions (Scaled or near actual)
            "h-[700px] w-[390px]",
            className
        )}>
            {/* Dynamic Island */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[35px] w-[120px] bg-black rounded-b-[18px] z-20 transition-all duration-300"></div>

            {/* Side Buttons */}
            <div className="h-[32px] w-[3px] bg-gray-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
            <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
            <div className="h-[46px] w-[3px] bg-gray-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
            <div className="h-[64px] w-[3px] bg-gray-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>

            {/* Screen */}
            <div className="w-full h-full bg-slate-50 dark:bg-slate-950 flex flex-col relative overflow-hidden rounded-[2rem]">

                {/* Status Bar */}
                <div className="h-12 w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-between px-7 pt-3 z-10 shrink-0 select-none">
                    <span className="text-[15px] font-semibold text-slate-900 dark:text-white pl-2">9:41</span>
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white pr-2">
                        <Signal size={16} />
                        <Wifi size={16} />
                        <Battery size={20} />
                    </div>
                </div>

                {/* Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden relative scrollbar-hide">
                    {children}
                </div>

                {/* Home Indicator */}
                <div className="h-6 w-full bg-transparent shrink-0 flex items-end justify-center pb-2">
                    <div className="w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                </div>
            </div>
        </div>
    );
}
