import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: React.ReactNode;
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leadingIcon, error = false, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint">
            {leadingIcon}
          </span>
        ) : null}
        <input
          type={type}
          ref={ref}
          className={cn(
            'hc-focus flex h-10 w-full rounded-md border bg-[#0f1115] px-3 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
            'placeholder:text-text-faint',
            'hover:border-[#313538]',
            'focus-visible:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            leadingIcon ? 'pl-10' : '',
            error ? 'border-destructive/80 focus-visible:border-destructive' : 'border-border',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };


