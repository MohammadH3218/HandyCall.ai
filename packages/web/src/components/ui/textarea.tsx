import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error = false, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'hc-focus flex min-h-[112px] w-full rounded-md border bg-[#0f1115] px-3 py-2 text-sm text-foreground',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] placeholder:text-text-faint',
          'hover:border-[#313538] focus-visible:border-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-destructive/80 focus-visible:border-destructive' : 'border-border',
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };


