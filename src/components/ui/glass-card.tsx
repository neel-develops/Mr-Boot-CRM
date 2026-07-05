import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper to merge Tailwind classes safely
const cn = (...inputs: any[]) => twMerge(clsx(inputs));

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
  active?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hoverable = false,
  active = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        "glass-card rounded-xl p-6 relative overflow-hidden transition-all duration-300",
        hoverable && "glass-card-hover cursor-pointer",
        active && "border-primary/50 shadow-[0_12px_48px_rgba(0,0,0,0.08)] bg-white/75 dark:bg-primary/55",
        className
      )}
      {...props}
    >
      {/* Top light reflection gradient overlay */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
      {children}
    </div>
  );
};
