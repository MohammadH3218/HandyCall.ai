import React from 'react';
import { cn } from '@/lib/utils';

export interface LogoProps {
  variant?: 'words' | 'icon';
  className?: string;
  width?: number;
  height?: number;
}

export function Logo({ variant = 'words', className, width, height }: LogoProps) {
  const iconSize = variant === 'icon' ? (width ?? 32) : 26;
  const style = width || height ? { width, height } : undefined;

  return (
    <div className={cn('inline-flex items-center', className)} style={style} aria-label="HandyCall">
      <span
        className="relative inline-flex items-center justify-center rounded-md border border-border bg-[#13161b]"
        style={{ width: iconSize, height: height ?? iconSize }}
      >
        <span className="absolute h-2 w-2 rounded-full bg-primary" />
        <span className="h-4 w-4 rounded-sm border border-border" />
      </span>
      {variant === 'words' ? (
        <span className="ml-2 text-sm font-semibold tracking-tight text-foreground">HandyCall</span>
      ) : null}
    </div>
  );
}


