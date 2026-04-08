import React from 'react';
import { Facebook, Instagram, MessageCircle } from 'lucide-react';
import { useTranslation } from "@/lib/i18n/use-translation";

interface GlassCard3DProps {
    title?: string;
    companyName?: string;
    socialFacebook?: string;
    socialInstagram?: string;
    socialWhatsapp?: string;
}

export default function GlassCard3D({
    title,
    companyName = "",
    socialFacebook = "https://www.facebook.com/pixyspaces",
    socialInstagram = "https://www.instagram.com/pixyspaces/",
    socialWhatsapp = "https://wa.me/573504076800",
}: GlassCard3DProps) {
    const { t } = useTranslation();

    const pixyIsotipo = (
        <svg width="28" height="28" viewBox="0 0 538 538" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M116.925 0C52.3493 0 0 52.3493 0 116.925V420.932C0 485.508 52.3493 537.857 116.925 537.857H420.932C485.508 537.857 537.857 485.508 537.857 420.932V116.925C537.857 52.3493 485.508 0 420.932 0H116.925ZM135.472 151.221C104.284 159.578 85.7754 191.635 94.1322 222.823C102.489 254.011 134.546 272.519 165.734 264.163C196.922 255.806 215.43 223.749 207.074 192.561C198.717 161.373 166.66 142.864 135.472 151.221ZM325.056 181.124C319.485 160.332 331.823 138.961 352.615 133.39C373.407 127.819 394.779 140.157 400.35 160.949C405.921 181.741 393.582 203.113 372.79 208.684C351.998 214.255 330.627 201.916 325.056 181.124ZM422.846 251.668C421.405 238.834 408.393 231.421 395.918 234.763L267.918 269.061L139.917 303.358C127.442 306.701 119.88 319.627 125.05 331.462C138.297 361.792 160.955 387.325 189.967 404.075C225.775 424.749 268.329 430.351 308.268 419.649C348.206 408.948 382.258 382.819 402.931 347.011C419.682 317.999 426.538 284.558 422.846 251.668Z" fill="var(--brand-pink, #F205E2)" />
        </svg>
    );

    return (
        <div className="w-[290px] h-[250px] [perspective:1000px] group">
            <div className="h-full rounded-[30px] bg-white dark:bg-brand-dark transition-all duration-500 ease-in-out [transform-style:preserve-3d] shadow-[0_25px_25px_-5px_#0000001A,0_40px_50px_-20px_#0000000D,inset_0_0_24px_#00000033] dark:shadow-[0_25px_25px_-5px_#00000080,40px_50px_25px_-40px_#ffffff1A,inset_0_0_24px_#ffffff0D] group-hover:shadow-[0_25px_25px_-5px_#0000001A,0_40px_50px_-20px_#0000000D,inset_0_0_24px_#00000033] dark:group-hover:shadow-[0_25px_25px_-5px_#00000080,40px_50px_25px_-40px_#ffffff1A,inset_0_0_24px_#ffffff0D] group-hover:[transform:rotate3d(1,1,0,30deg)] relative">
                {/* Glass effect with pink/cyan gradient border */}
                <div className="[transform-style:preserve-3d] absolute inset-2 rounded-[35px] rounded-tr-[100%] bg-gradient-to-b from-gray-100/[0.15] to-gray-100/[0.05] dark:from-white/[0.15] dark:to-white/[0.05] [transform:translate3d(0px,0px,25px)] border-l border-b border-gray-200 dark:border-white/30 transition-all duration-500 ease-in-out" />

                {/* Content */}
                <div className="pt-[32px] pl-[30px] pr-[60px] [transform:translate3d(0,0,26px)] relative z-10 flex flex-col gap-4">
                    <span className="block text-gray-900 dark:text-white font-black text-lg leading-tight uppercase font-outfit">
                        {title || t('dashboard.spaces.title')}
                    </span>
                    <span className="block text-gray-600 dark:text-white/90 text-[14px] pr-4 leading-snug">
                        {t('dashboard.spaces.description', { companyName })}
                    </span>
                    {/* Footer */}
                    <span className="block text-gray-500 dark:text-white/60 text-[9px] uppercase font-bold tracking-widest leading-none mt-2">
                        {t('dashboard.spaces.powered_by')} <a href="https://www.pixy.com.co" target="_blank" rel="noopener noreferrer" className="hover:text-brand-pink transition-colors"></a>
                    </span>
                </div>

                {/* Bottom section */}
                <div className="[transform-style:preserve-3d] absolute bottom-5 left-5 right-5 px-3 py-2.5 flex items-center justify-between [transform:translate3d(0,0,26px)] z-20">
                    {/* Social buttons */}
                    <div className="flex gap-2.5 [transform-style:preserve-3d]">
                        {/* Facebook */}
                        <a
                            href={socialFacebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-[30px] aspect-square p-1.5 bg-gray-50 dark:bg-white rounded-full border border-gray-200 dark:border-0 grid place-content-center shadow-[rgba(0,0,0,0.1)_0px_7px_5px_-5px] dark:shadow-[rgba(0,0,0,0.3)_0px_7px_5px_-5px] hover:bg-brand-pink transition-transform duration-200 ease-in-out delay-[0.4s] group-hover:[transform:translate3d(0,0,50px)] group/btn"
                            style={{ transitionProperty: 'transform, box-shadow' }}
                        >
                            <Facebook className="w-[15px] h-[15px] text-gray-700 dark:text-gray-900 group-hover/btn:text-white" strokeWidth={2} />
                        </a>

                        {/* Instagram */}
                        <a
                            href={socialInstagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-[30px] aspect-square p-1.5 bg-gray-50 dark:bg-white rounded-full border border-gray-200 dark:border-0 grid place-content-center shadow-[rgba(0,0,0,0.1)_0px_7px_5px_-5px] dark:shadow-[rgba(0,0,0,0.3)_0px_7px_5px_-5px] hover:bg-brand-pink transition-transform duration-200 ease-in-out delay-[0.6s] group-hover:[transform:translate3d(0,0,50px)] group/btn"
                            style={{ transitionProperty: 'transform, box-shadow' }}
                        >
                            <Instagram className="w-[15px] h-[15px] text-gray-700 dark:text-gray-900 group-hover/btn:text-white" strokeWidth={2} />
                        </a>

                        {/* WhatsApp */}
                        <a
                            href={socialWhatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-[30px] aspect-square p-1.5 bg-gray-50 dark:bg-white rounded-full border border-gray-200 dark:border-0 grid place-content-center shadow-[rgba(0,0,0,0.1)_0_7px_5px_-5px] dark:shadow-[rgba(0,0,0,0.3)_0_7px_5px_-5px] hover:bg-brand-pink transition-transform duration-200 ease-in-out delay-[0.8s] group-hover:[transform:translate3d(0,0,50px)] group/btn"
                            style={{ transitionProperty: 'transform, box-shadow' }}
                        >
                            <MessageCircle className="w-[15px] h-[15px] text-gray-700 dark:text-gray-900 group-hover/btn:text-white" strokeWidth={2} />
                        </a>
                    </div>
                </div>

                {/* Logo circles with pink/cyan glow */}
                <div className="absolute right-0 top-0 [transform-style:preserve-3d]">
                    <span className="block absolute aspect-square rounded-full shadow-[rgba(0,0,0,0.05)_-10px_10px_20px_0px] dark:shadow-[rgba(255,255,255,0.1)_-10px_10px_20px_0px] backdrop-blur-[5px] bg-gradient-to-br from-gray-900/5 to-gray-500/5 dark:from-white/10 dark:to-gray-500/10 transition-all duration-500 ease-in-out w-[170px] [transform:translate3d(0,0,20px)] top-2 right-2" />
                    <span className="block absolute aspect-square rounded-full shadow-[rgba(0,0,0,0.05)_-10px_10px_20px_0px] dark:shadow-[rgba(255,255,255,0.05)_-10px_10px_20px_0px] backdrop-blur-[1px] bg-gradient-to-br from-gray-900/5 to-white/0 dark:from-gray-500/10 dark:to-white/5 transition-all duration-500 ease-in-out delay-[0.4s] w-[140px] [transform:translate3d(0,0,40px)] group-hover:[transform:translate3d(0,0,60px)] top-2.5 right-2.5" />
                    <span className="block absolute aspect-square rounded-full shadow-[rgba(0,0,0,0.05)_-10px_10px_20px_0px] dark:shadow-[rgba(255,255,255,0.1)_-10px_10px_20px_0px] backdrop-blur-[5px] bg-gradient-to-br from-gray-900/5 to-gray-500/5 dark:from-white/10 dark:to-gray-500/10 transition-all duration-500 ease-in-out delay-[0.8s] w-[110px] [transform:translate3d(0,0,60px)] group-hover:[transform:translate3d(0,0,80px)] top-[17px] right-[17px]" />
                    <span className="block absolute aspect-square rounded-full shadow-[rgba(0,0,0,0.05)_-10px_10px_20px_0px] dark:shadow-[rgba(255,255,255,0.05)_-10px_10px_20px_0px] backdrop-blur-[5px] bg-gradient-to-br from-gray-900/5 to-white/0 dark:from-gray-500/10 dark:to-white/5 transition-all duration-500 ease-in-out delay-[1.2s] w-[80px] [transform:translate3d(0,0,80px)] group-hover:[transform:translate3d(0,0,100px)] top-[23px] right-[23px]" />
                    <span className="block absolute aspect-square rounded-full shadow-[rgba(0,0,0,0.05)_-10px_10px_20px_0px] dark:shadow-[rgba(255,255,255,0.1)_-10px_10px_20px_0px] backdrop-blur-[5px] bg-gradient-to-br from-gray-900/5 to-gray-500/5 dark:from-white/15 dark:to-gray-500/10 transition-all duration-500 ease-in-out delay-[1.6s] w-[50px] [transform:translate3d(0,0,100px)] group-hover:[transform:translate3d(0,0,120px)] top-[30px] right-[30px] grid place-content-center">
                        {pixyIsotipo}
                    </span>
                </div>
            </div>
        </div>
    );
}
