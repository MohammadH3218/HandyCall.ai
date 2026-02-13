import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-[#0f1115] px-6 py-10 text-center',
        className
      )}
    >
      {icon ? <div className="mb-3 text-text-faint">{icon}</div> : null}
      <p className="text-lg font-semibold text-foreground">{title}</p>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

