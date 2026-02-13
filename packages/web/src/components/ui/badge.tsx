import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.03em] transition-colors',
  {
    variants: {
      variant: {
        default: 'border-primary/30 bg-primary/15 text-[#8ecbff]',
        secondary: 'border-border bg-[#13161b] text-muted-foreground',
        destructive: 'border-destructive/35 bg-destructive/10 text-destructive',
        outline: 'border-border bg-transparent text-foreground',
        success: 'border-success/35 bg-success/15 text-success',
        warning: 'border-warning/35 bg-warning/12 text-warning',
        info: 'border-primary/35 bg-primary/12 text-primary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

