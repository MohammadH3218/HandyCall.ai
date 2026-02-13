import * as React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  pulse?: boolean;
}

function Skeleton({ className, pulse = false, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        pulse ? 'animate-pulse rounded-md bg-[#1a1d1e]' : 'hc-skeleton',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };

