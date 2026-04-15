'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/portal/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { IconBolt, IconPhone, IconMessage, IconInfoCircle } from '@tabler/icons-react';

interface AddonPack {
  id: string;
  name: string;
  description: string;
  price_display: string;
  price_cents: number;
  minutes: number;
  sms: number;
}

export default function AddonsPage() {
  const { toast } = useToast();
  const [addons, setAddons] = useState<AddonPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [confirmPack, setConfirmPack] = useState<AddonPack | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient.getAddonCatalog();
        setAddons(Array.isArray(data) ? data : []);
      } catch (err: any) {
        toast({
          title: 'Failed to load add-ons',
          description: err?.message || 'Could not load add-on packs. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handlePurchase = async () => {
    if (!confirmPack) return;
    const pack = confirmPack;
    setConfirmPack(null);
    setPurchasing(pack.id);
    try {
      await apiClient.purchaseAddonPack(pack.id);
      toast({
        title: 'Purchase successful!',
        description: `${pack.name} credits have been applied to your account.`,
      });
    } catch (err: any) {
      toast({
        title: 'Purchase failed',
        description: err?.message || 'Please check your payment method and try again.',
        variant: 'destructive',
      });
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          eyebrow="BILLING"
          title="Add-on Packs"
          subtitle="Purchase extra minutes or SMS to top up your plan"
        />
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="h-5 w-32 rounded bg-muted mb-3" />
              <div className="h-4 w-48 rounded bg-muted mb-4" />
              <div className="h-8 w-20 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="BILLING"
        title="Add-on Packs"
        subtitle="Purchase extra minutes or SMS to top up your current plan limit"
      />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {addons.map((pack) => {
          const isMinutes = pack.minutes > 0;
          const isPurchasing = purchasing === pack.id;

          return (
            <div
              key={pack.id}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600 dark:hover:shadow-slate-900"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      isMinutes
                        ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900'
                        : 'bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950 dark:to-violet-900'
                    }`}
                  >
                    {isMinutes ? (
                      <IconPhone stroke={1.5} className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <IconMessage stroke={1.5} className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{pack.name}</h3>
                    <Badge variant="secondary" className="mt-0.5 text-xs">
                      {isMinutes ? 'Call Minutes' : 'SMS Messages'}
                    </Badge>
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{pack.price_display}</p>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">{pack.description}</p>

              <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 px-3 py-2">
                <IconBolt className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {isMinutes ? `${pack.minutes} minutes` : `${pack.sms} messages`} added instantly
                </span>
              </div>

              <Button
                className="mt-5 w-full"
                onClick={() => setConfirmPack(pack)}
                disabled={isPurchasing || !!purchasing}
              >
                {isPurchasing ? 'Processing...' : `Buy for ${pack.price_display}`}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-muted/50 p-4">
        <div className="flex items-start gap-3">
          <IconInfoCircle stroke={1.5} className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Note:</strong> Add-on packs are charged immediately to your saved payment method and
            credits are applied to your current billing period. Credits carry through the remainder of
            your current billing cycle.
          </p>
        </div>
      </div>

      {/* Purchase confirmation dialog */}
      <Dialog open={!!confirmPack} onOpenChange={(open) => { if (!open) setConfirmPack(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You are about to purchase{' '}
              <strong>{confirmPack?.name}</strong> for{' '}
              <strong>{confirmPack?.price_display}</strong>. This will be charged immediately to your saved payment method.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPack(null)}>
              Cancel
            </Button>
            <Button onClick={handlePurchase} disabled={!!purchasing}>
              Confirm Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
