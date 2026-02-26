'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/portal/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Phone, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';

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
  const [addons, setAddons] = useState<AddonPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [successPack, setSuccessPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient.getAddonCatalog();
        setAddons(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err?.message || 'Failed to load add-on packs');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handlePurchase = async (packId: string) => {
    setPurchasing(packId);
    setError(null);
    setSuccessPack(null);
    try {
      await apiClient.purchaseAddonPack(packId);
      setSuccessPack(packId);
      setTimeout(() => setSuccessPack(null), 4000);
    } catch (err: any) {
      setError(err?.message || 'Purchase failed. Please check your payment method.');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Add-on Packs" description="Purchase extra minutes or SMS to top up your plan" />
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="h-5 w-32 rounded bg-slate-200 mb-3" />
              <div className="h-4 w-48 rounded bg-slate-100 mb-4" />
              <div className="h-8 w-20 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Add-on Packs" description="Purchase extra minutes or SMS to top up your current plan limit" />

      {error && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {successPack && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Purchase successful! Your credits have been applied.</p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {addons.map((pack) => {
          const isMinutes = pack.minutes > 0;
          const isPurchasing = purchasing === pack.id;
          const isSuccess = successPack === pack.id;

          return (
            <div
              key={pack.id}
              className="relative rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isMinutes ? 'bg-blue-50' : 'bg-violet-50'}`}>
                    {isMinutes ? (
                      <Phone className={`h-5 w-5 text-blue-600`} />
                    ) : (
                      <MessageSquare className={`h-5 w-5 text-violet-600`} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{pack.name}</h3>
                    <Badge variant="secondary" className="mt-0.5 text-xs">
                      {isMinutes ? 'Call Minutes' : 'SMS Messages'}
                    </Badge>
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{pack.price_display}</p>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">{pack.description}</p>

              <div className="mt-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-slate-700">
                  {isMinutes ? `${pack.minutes} minutes` : `${pack.sms} messages`} added instantly
                </span>
              </div>

              <Button
                className="mt-5 w-full"
                onClick={() => handlePurchase(pack.id)}
                disabled={isPurchasing || !!purchasing}
                variant={isSuccess ? 'secondary' : 'default'}
              >
                {isPurchasing
                  ? 'Processing...'
                  : isSuccess
                  ? 'Purchased!'
                  : `Buy for ${pack.price_display}`}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-5">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Add-on packs are charged immediately to your saved payment method and
          credits are applied to your current billing period. Credits carry through the remainder of
          your current billing cycle.
        </p>
      </div>
    </div>
  );
}
