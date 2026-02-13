import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-faint">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">{title}</h1>
          {subtitle ? <p className="max-w-2xl text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {meta ? <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">{meta}</div> : null}
    </div>
  );
}

