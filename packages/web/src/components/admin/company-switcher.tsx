'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { useAdminCompanyStore } from '@/stores/admin-company-store';

type CompanyOption = {
  company_id: string;
  company_name: string;
  status?: string;
};

async function fetchCompanies(): Promise<CompanyOption[]> {
  const res = await fetch('/api/proxy/companies', { credentials: 'include' });
  if (!res.ok) {
    const token = localStorage.getItem('access_token');
    if (token) {
      const fallback = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!fallback.ok) throw new Error('Failed to load companies');
      return fallback.json();
    }
    throw new Error('Failed to load companies');
  }
  return res.json();
}

export function CompanySwitcher() {
  const { companyId, companyName, setCompany } = useAdminCompanyStore();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchCompanies();
        if (!active) return;
        setOptions(data || []);
        if (!companyId && data?.length) {
          setCompany(data[0].company_id, data[0].company_name);
        }
      } catch (err) {
        // ignore, handled by empty state
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [companyId, setCompany]);

  const selected = useMemo(() => {
    if (!companyId) return null;
    return options.find((opt) => opt.company_id === companyId) || null;
  }, [companyId, options]);

  const label = selected?.company_name || companyName || 'Select company';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[260px] justify-between bg-white"
        >
          <span className="inline-flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 text-emerald-600" />
            {label}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search companies..." />
          <CommandEmpty>{loading ? 'Loading companies...' : 'No companies found.'}</CommandEmpty>
          <CommandGroup heading="Companies">
            {options.map((opt) => {
              const value = opt.company_id;
              const isSelected = value === companyId;
              return (
                <CommandItem
                  key={value}
                  value={opt.company_name}
                  onSelect={() => {
                    setCompany(opt.company_id, opt.company_name);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate">{opt.company_name}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
