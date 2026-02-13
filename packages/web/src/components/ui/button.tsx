import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap select-none',
    'rounded-md border text-sm font-medium',
    'transition-[background-color,border-color,color,transform,box-shadow] duration-standard ease-standard',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
    'disabled:pointer-events-none disabled:opacity-55',
    'active:translate-y-[1px]'
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-[#369eff] hover:border-[#369eff] shadow-1',
        primary:
          'border-transparent bg-primary text-primary-foreground hover:bg-[#369eff] hover:border-[#369eff] shadow-1',
        secondary:
          'border-border bg-secondary text-foreground hover:border-[#313538] hover:bg-[#13161b]',
        outline:
          'border-border bg-transparent text-foreground hover:border-[#313538] hover:bg-[#13161b]',
        ghost:
          'border-transparent bg-transparent text-text-muted hover:border-border hover:bg-[#13161b] hover:text-foreground',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-[#ff6566]',
        danger:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-[#ff6566]',
        link: 'border-transparent bg-transparent px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-9 px-3 text-[13px]',
        lg: 'h-11 px-5 text-[15px]',
        icon: 'h-10 w-10',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, fullWidth, className }))} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        <span className={cn(loading ? 'opacity-90' : '')}>{children}</span>
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };


