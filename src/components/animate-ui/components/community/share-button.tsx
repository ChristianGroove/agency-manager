'use client';
import * as React from 'react';
import { Share2, MessageCircle, Mail, Download } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { HTMLMotionProps, motion, AnimatePresence } from 'framer-motion';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "relative overflow-hidden cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      size: {
        default: 'min-w-32 h-10 px-4 py-2',
        sm: 'min-w-24 h-9 rounded-md gap-1.5 px-3',
        md: 'min-w-32 h-10 px-4 py-2',
        lg: 'min-w-36 h-11 px-8',
      },
      icon: {
        suffix: 'pl-4',
        prefix: 'pr-4',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
);

const iconSizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
  default: 18,
};

type ShareButtonProps = HTMLMotionProps<'button'> & {
  children?: React.ReactNode; // Optional now
  className?: string;
  onIconClick?: (platform: 'whatsapp' | 'email' | 'download') => void;
  url?: string;
  title?: string;
  onShare?: () => void;
} & VariantProps<typeof buttonVariants>;

function ShareButton({
  children,
  className,
  size,
  icon,
  onIconClick,
  url,
  title,
  onShare,
  ...props
}: ShareButtonProps) {
  const [hovered, setHovered] = React.useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onShare) {
      onShare();
    }
    props.onClick?.(e);
  };

  return (
    <motion.button
      className={cn(
        'bg-primary text-primary-foreground hover:bg-primary/90',
        buttonVariants({ size, className, icon }),
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      {...props}
    >
      <div className="flex items-center gap-2">
        <Share2 className="size-4" />
        {children || "Compartir"}
      </div>
    </motion.button>
  );
}

const shareIconGroupVariants = cva('flex items-center justify-center gap-3', {
  variants: {
    size: {
      default: 'text-[16px]',
      sm: 'text-[16px]',
      md: 'text-[20px]',
      lg: 'text-[28px]',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

type ShareIconGroupProps = HTMLMotionProps<'div'> & {
  className?: string;
  onIconClick?: (
    platform: 'whatsapp' | 'email' | 'download',
    event: React.MouseEvent<HTMLDivElement>,
  ) => void;
} & VariantProps<typeof shareIconGroupVariants>;

function ShareIconGroup({
  size = 'default',
  className,
  onIconClick,
}: ShareIconGroupProps) {
  const iconSize = iconSizeMap[size as keyof typeof iconSizeMap];

  const handleIconClick = React.useCallback(
    (
      platform: 'whatsapp' | 'email' | 'download',
      event: React.MouseEvent<HTMLDivElement>,
    ) => {
      event.stopPropagation(); // Prevent button click
      onIconClick?.(platform, event);
    },
    [onIconClick],
  );

  return (
    <motion.div
      className={cn(shareIconGroupVariants({ size }), 'group', className)}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0, duration: 0.4, type: 'spring', bounce: 0.4 }}
        whileHover={{
          y: -4,
          scale: 1.1,
          transition: { duration: 0.2 },
        }}
        className="cursor-pointer p-1 text-green-400 hover:text-green-300"
        onClick={(event) => handleIconClick('whatsapp', event)}
        title="WhatsApp"
      >
        <MessageCircle size={iconSize} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.4, type: 'spring', bounce: 0.4 }}
        whileHover={{
          y: -4,
          scale: 1.1,
          transition: { duration: 0.2 },
        }}
        className="cursor-pointer p-1 text-blue-400 hover:text-blue-300"
        onClick={(event) => handleIconClick('email', event)}
        title="Email"
      >
        <Mail size={iconSize} />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4, type: 'spring', bounce: 0.4 }}
        whileHover={{
          y: -4,
          scale: 1.1,
          transition: { duration: 0.2 },
        }}
        className="cursor-pointer p-1 text-white hover:text-gray-200"
        onClick={(event) => handleIconClick('download', event)}
        title="Descargar PDF"
      >
        <Download size={iconSize} />
      </motion.div>
    </motion.div>
  );
}

export { ShareButton, type ShareButtonProps };
