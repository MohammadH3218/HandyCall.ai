import * as React from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const tooltipId = React.useId();

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {React.cloneElement(children, {
        'aria-describedby': open ? tooltipId : undefined,
      } as Record<string, string | undefined>)}
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-max max-w-[240px] -translate-x-1/2 rounded-md border border-[#313538] bg-[#13161b] px-2 py-1 text-xs text-foreground shadow-2"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}

