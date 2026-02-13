import * as React from 'react';
import { cn } from '@/lib/utils';

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

function Tabs({ value, defaultValue, onValueChange, className, children }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');
  const currentValue = value ?? internalValue;

  const setValue = React.useCallback(
    (nextValue: string) => {
      if (value === undefined) {
        setInternalValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [onValueChange, value]
  );

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

function useTabsContext(component: string) {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error(`${component} must be used inside <Tabs>`);
  }
  return context;
}

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-border bg-[#0f1115] p-1',
        className
      )}
      {...props}
    />
  )
);
TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, onClick, onKeyDown, children, ...props }, ref) => {
    const { value: selectedValue, setValue } = useTabsContext('TabsTrigger');
    const selected = selectedValue === value;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={selected}
        data-state={selected ? 'active' : 'inactive'}
        className={cn(
          'inline-flex h-8 items-center justify-center rounded-sm px-3 text-xs font-medium transition-colors duration-standard ease-standard',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          selected
            ? 'border border-primary/40 bg-primary/15 text-[#cbe8ff]'
            : 'border border-transparent text-text-muted hover:text-foreground hover:bg-[#13161b]',
          className
        )}
        onClick={(event) => {
          setValue(value);
          onClick?.(event);
        }}
        onKeyDown={(event) => {
          const current = event.currentTarget;
          const list = current.closest('[role="tablist"]');
          if (!list) {
            onKeyDown?.(event);
            return;
          }
          const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
          const index = tabs.indexOf(current);

          if (event.key === 'ArrowRight') {
            event.preventDefault();
            const next = tabs[(index + 1) % tabs.length];
            next?.focus();
            next?.click();
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            const next = tabs[(index - 1 + tabs.length) % tabs.length];
            next?.focus();
            next?.click();
          }

          onKeyDown?.(event);
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, ...props }, ref) => {
    const { value: selectedValue } = useTabsContext('TabsContent');
    if (selectedValue !== value) {
      return null;
    }

    return <div ref={ref} role="tabpanel" className={cn('mt-4', className)} {...props} />;
  }
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };

