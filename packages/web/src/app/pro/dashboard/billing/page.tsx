'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  IconCheck,
  IconCreditCard,
  IconFileInvoice,
  IconReceipt,
  IconRefresh,
  IconSettings,
  IconX,
} from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';

declare global {
  interface Window {
    Moyasar?: {
      init: (config: Record<string, any>) => void;
    };
  }
}

type BillingTab = 'overview' | 'payment-methods' | 'history' | 'lead-fees';
type PaymentMethodKey = 'creditcard' | 'applepay' | 'samsungpay' | 'stcpay';

const MOYASAR_FORM_JS = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js';
const MOYASAR_FORM_CSS = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.css';
const MOYASAR_FORM_ID = 'moyasar-credit-top-up-form';
const TOP_UP_OPTIONS = [20, 50, 100, 250, 500];
const METHOD_LABELS: Record<PaymentMethodKey, string> = {
  creditcard: 'Card',
  applepay: 'Apple Pay',
  samsungpay: 'Samsung Pay',
  stcpay: 'STC Pay',
};

function formatSarHalalas(amount?: number) {
  return `SAR ${(Number(amount || 0) / 100).toFixed(2)}`;
}

function formatDate(ts?: number) {
  if (!ts) return 'Not available';
  return new Date(ts).toLocaleDateString('en-SA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function normalizeTab(raw: string | null): BillingTab {
  if (raw === 'payment-methods' || raw === 'history' || raw === 'lead-fees') return raw;
  return 'overview';
}

export default function ProBillingPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<BillingTab>(normalizeTab(searchParams.get('tab')));
  const [overview, setOverview] = useState<any | null>(null);
  const [config, setConfig] = useState<any | null>(null);
  const [credits, setCredits] = useState<any | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [leadFees, setLeadFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showAutoRecharge, setShowAutoRecharge] = useState(false);
  const [topUpSar, setTopUpSar] = useState(20);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodKey>('creditcard');
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);
  const [moyasarReady, setMoyasarReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const verifiedPaymentRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [overviewResult, configResult, creditsResult, methodsResult, invoicesResult, leadFeesResult] =
        await Promise.allSettled([
          apiClient.getMySubscription(),
          apiClient.getBillingConfig(),
          apiClient.getBillingCredits(),
          apiClient.getPaymentMethods(),
          apiClient.getBillingInvoices(),
          apiClient.getProLeadFees(),
        ]);

      if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value);
      if (configResult.status === 'fulfilled') setConfig(configResult.value);
      if (creditsResult.status === 'fulfilled') setCredits(creditsResult.value);
      if (methodsResult.status === 'fulfilled') {
        const raw = methodsResult.value;
        setPaymentMethods(Array.isArray(raw) ? raw : raw?.payment_methods || raw?.methods || []);
      }
      if (invoicesResult.status === 'fulfilled') {
        setInvoices(Array.isArray(invoicesResult.value) ? invoicesResult.value : []);
      }
      if (leadFeesResult.status === 'fulfilled') {
        setLeadFees(Array.isArray(leadFeesResult.value?.transactions) ? leadFeesResult.value.transactions : []);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load billing.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setActiveTab(normalizeTab(searchParams.get('tab')));
  }, [searchParams]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const paymentId = searchParams.get('id') || searchParams.get('payment_id');
    if (!paymentId || verifiedPaymentRef.current === paymentId) return;
    verifiedPaymentRef.current = paymentId;

    apiClient
      .verifyBillingPayment(paymentId)
      .then(() => {
        setNotice('Payment received. Your credit balance has been updated.');
        setShowTopUp(false);
        setActiveInvoice(null);
        void load();
        window.history.replaceState({}, '', '/pro/dashboard/billing');
      })
      .catch((err: any) => setError(err?.message || 'Unable to verify payment.'));
  }, [load, searchParams]);

  useEffect(() => {
    if (!document.querySelector(`link[href="${MOYASAR_FORM_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MOYASAR_FORM_CSS;
      document.head.appendChild(link);
    }

    if (window.Moyasar) {
      setMoyasarReady(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${MOYASAR_FORM_JS}"]`);
    if (existing) {
      existing.addEventListener('load', () => setMoyasarReady(true), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = MOYASAR_FORM_JS;
    script.async = true;
    script.onload = () => setMoyasarReady(true);
    script.onerror = () => setError('Unable to load the secure Moyasar payment form.');
    document.body.appendChild(script);
  }, []);

  const defaultMethod = useMemo(
    () => paymentMethods.find((method) => method.is_default) || paymentMethods[0],
    [paymentMethods],
  );

  const autoRecharge = overview?.auto_recharge || {
    enabled: false,
    threshold_halalas: 2000,
    recharge_amount_halalas: 2000,
  };
  const creditBalance = Number(overview?.credit_balance_halalas ?? credits?.balance_halalas ?? 0);
  const publishableKey = config?.publishable_key || null;
  const supportedMethods = config?.supported_methods || {};
  const creditTransactions = Array.isArray(credits?.transactions) ? credits.transactions : [];
  const creditInvoices = invoices.filter((invoice) =>
    ['CREDIT_TOP_UP', 'AUTO_RECHARGE'].includes(String(invoice.billing_purpose || '')),
  );

  const renderMoyasarForm = useCallback(
    (invoice: any) => {
      const mount = document.getElementById(MOYASAR_FORM_ID);
      if (!mount || !window.Moyasar || !publishableKey) return;
      mount.innerHTML = '';

      const methodConfig: Record<string, any> = {};
      if (selectedMethod === 'applepay' && config?.wallet_config?.apple_pay) {
        methodConfig.apple_pay = config.wallet_config.apple_pay;
      }
      if (selectedMethod === 'samsungpay' && config?.wallet_config?.samsung_pay) {
        methodConfig.samsung_pay = {
          ...config.wallet_config.samsung_pay,
          order_number: invoice.invoice_id,
        };
      }

      window.Moyasar.init({
        element: `#${MOYASAR_FORM_ID}`,
        amount: invoice.amount_due || invoice.amount_halalas,
        currency: invoice.currency || 'SAR',
        description: invoice.description || 'HandyCall credit top-up',
        publishable_api_key: publishableKey,
        callback_url: `${window.location.origin}/pro/dashboard/billing`,
        methods: [selectedMethod],
        fixed_width: false,
        metadata: {
          pro_billing_invoice_id: invoice.invoice_id,
          purpose: 'pro_credit_top_up',
        },
        credit_card: {
          save_card: true,
        },
        ...methodConfig,
      });
    },
    [config, publishableKey, selectedMethod],
  );

  useEffect(() => {
    if (!activeInvoice || !moyasarReady || !publishableKey) return;
    renderMoyasarForm(activeInvoice);
  }, [activeInvoice, moyasarReady, publishableKey, renderMoyasarForm]);

  async function prepareTopUp() {
    try {
      setActionLoading(true);
      setError(null);
      setNotice(null);
      const amountHalalas = Math.round(Number(topUpSar || 0) * 100);
      const result = await apiClient.prepareCreditTopUp(amountHalalas);
      setActiveInvoice(result?.invoice || result);
    } catch (err: any) {
      setError(err?.message || 'Unable to prepare credit purchase.');
    } finally {
      setActionLoading(false);
    }
  }

  async function saveAutoRecharge(enabled: boolean, thresholdSar: number, rechargeSar: number) {
    try {
      setActionLoading(true);
      setError(null);
      await apiClient.updateAutoRecharge({
        enabled,
        threshold_halalas: Math.round(thresholdSar * 100),
        recharge_amount_halalas: Math.round(rechargeSar * 100),
      });
      setNotice(enabled ? 'Auto recharge is on.' : 'Auto recharge is off.');
      setShowAutoRecharge(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Unable to update auto recharge.');
    } finally {
      setActionLoading(false);
    }
  }

  async function setDefault(methodId: string) {
    try {
      setActionLoading(true);
      await apiClient.setDefaultPaymentMethod(methodId);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Unable to update payment method.');
    } finally {
      setActionLoading(false);
    }
  }

  async function removeMethod(methodId: string) {
    try {
      setActionLoading(true);
      await apiClient.deletePaymentMethod(methodId);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Unable to remove payment method.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h1 className="text-xl font-semibold text-slate-950">Billing</h1>
            <div className="mt-5 flex gap-6 overflow-x-auto">
              {[
                ['overview', 'Overview'],
                ['payment-methods', 'Payment methods'],
                ['history', 'Billing history'],
                ['lead-fees', 'Lead fees'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key as BillingTab)}
                  className={`border-b-2 pb-3 text-sm font-medium transition ${
                    activeTab === key
                      ? 'border-slate-950 text-slate-950'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-6">
            {error ? <Alert tone="red">{error}</Alert> : null}
            {notice ? <Alert tone="green">{notice}</Alert> : null}

            {loading ? (
              <div className="space-y-4">
                <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
                <div className="h-56 animate-pulse rounded-lg bg-slate-100" />
              </div>
            ) : (
              <>
                {activeTab === 'overview' ? (
                  <OverviewTab
                    autoRecharge={autoRecharge}
                    creditBalance={creditBalance}
                    defaultMethod={defaultMethod}
                    onAutoRecharge={() => setShowAutoRecharge(true)}
                    onTopUp={() => setShowTopUp(true)}
                    onView={(tab) => setActiveTab(tab)}
                  />
                ) : null}

                {activeTab === 'payment-methods' ? (
                  <PaymentMethodsTab
                    methods={paymentMethods}
                    onAdd={() => {
                      setTopUpSar(20);
                      setShowTopUp(true);
                    }}
                    onDefault={setDefault}
                    onRemove={removeMethod}
                    actionLoading={actionLoading}
                  />
                ) : null}

                {activeTab === 'history' ? (
                  <HistoryTab invoices={creditInvoices} transactions={creditTransactions} />
                ) : null}

                {activeTab === 'lead-fees' ? <LeadFeesTab leadFees={leadFees} /> : null}
              </>
            )}
          </div>
        </div>
      </div>

      {showTopUp ? (
        <TopUpDialog
          activeInvoice={activeInvoice}
          actionLoading={actionLoading}
          amountSar={topUpSar}
          methods={supportedMethods}
          moyasarReady={moyasarReady}
          onAmount={setTopUpSar}
          onClose={() => {
            setShowTopUp(false);
            setActiveInvoice(null);
          }}
          onPrepare={() => void prepareTopUp()}
          onSelectedMethod={setSelectedMethod}
          selectedMethod={selectedMethod}
          publishableKey={publishableKey}
        />
      ) : null}

      {showAutoRecharge ? (
        <AutoRechargeDialog
          actionLoading={actionLoading}
          defaultValues={autoRecharge}
          hasDefaultMethod={Boolean(defaultMethod)}
          onClose={() => setShowAutoRecharge(false)}
          onSave={saveAutoRecharge}
        />
      ) : null}

      <style jsx global>{`
        .moyasar-embedded-form .mysr-form {
          width: 100% !important;
          max-width: none !important;
          padding: 0 !important;
          box-shadow: none !important;
          border: 0 !important;
          background: transparent !important;
        }

        .moyasar-embedded-form .mysr-form input,
        .moyasar-embedded-form .mysr-form button {
          border-radius: 8px !important;
          font-family: inherit !important;
        }

        .moyasar-embedded-form .mysr-form button[type='submit'],
        .moyasar-embedded-form .mysr-form .mysr-submit {
          background: #059669 !important;
          border-color: #059669 !important;
          box-shadow: none !important;
          min-height: 42px !important;
          font-weight: 700 !important;
        }
      `}</style>
    </div>
  );
}

function OverviewTab({
  autoRecharge,
  creditBalance,
  defaultMethod,
  onAutoRecharge,
  onTopUp,
  onView,
}: {
  autoRecharge: any;
  creditBalance: number;
  defaultMethod: any;
  onAutoRecharge: () => void;
  onTopUp: () => void;
  onView: (tab: BillingTab) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-slate-950">Pay as you go</h2>
        <div className="mt-5">
          <p className="text-sm font-medium text-slate-700">Credit balance</p>
          <p className="mt-2 text-4xl font-semibold text-slate-950">{formatSarHalalas(creditBalance)}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" onClick={onTopUp}>
            Add to credit balance
          </button>
          <button className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200" onClick={onAutoRecharge}>
            Auto recharge settings
          </button>
        </div>

        <div
          className={`mt-5 flex items-center justify-between gap-4 rounded-lg border px-4 py-3 ${
            autoRecharge?.enabled
              ? 'border-emerald-600/30 bg-emerald-50 text-emerald-800'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            {autoRecharge?.enabled ? <IconCheck className="h-5 w-5 shrink-0" /> : <IconRefresh className="h-5 w-5 shrink-0" />}
            <p className="text-sm">
              {autoRecharge?.enabled
                ? `Auto recharge is on. At ${formatSarHalalas(autoRecharge.threshold_halalas)}, HandyCall adds ${formatSarHalalas(autoRecharge.recharge_amount_halalas)}.`
                : 'Auto recharge is off.'}
            </p>
          </div>
          <button className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200" onClick={onAutoRecharge}>
            Modify
          </button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <QuickLink icon={<IconCreditCard />} title="Payment methods" detail={defaultMethod ? `${defaultMethod.card?.brand || 'Card'} ${defaultMethod.card?.last4 || ''}` : 'Add or change payment method'} onClick={() => onView('payment-methods')} />
        <QuickLink icon={<IconFileInvoice />} title="Billing history" detail="View credit purchases and auto recharges" onClick={() => onView('history')} />
        <QuickLink icon={<IconReceipt />} title="Lead fees" detail="View credits spent on marketplace leads" onClick={() => onView('lead-fees')} />
        <QuickLink icon={<IconSettings />} title="Credit settings" detail="Manage automatic recharge rules" onClick={onAutoRecharge} />
      </div>
    </div>
  );
}

function TopUpDialog({
  activeInvoice,
  actionLoading,
  amountSar,
  methods,
  moyasarReady,
  onAmount,
  onClose,
  onPrepare,
  onSelectedMethod,
  selectedMethod,
  publishableKey,
}: {
  activeInvoice: any;
  actionLoading: boolean;
  amountSar: number;
  methods: Record<string, boolean>;
  moyasarReady: boolean;
  onAmount: (amount: number) => void;
  onClose: () => void;
  onPrepare: () => void;
  onSelectedMethod: (method: PaymentMethodKey) => void;
  selectedMethod: PaymentMethodKey;
  publishableKey: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/30 px-4 py-10">
      <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">Add credits</h2>
          <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Close">
            <IconX className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-5 p-5">
          <div>
            <label className="text-sm font-medium text-slate-700">Amount</label>
            <div className="mt-2 flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2">
              <span className="text-sm font-semibold text-slate-500">SAR</span>
              <input
                className="ml-3 w-full border-0 text-lg font-semibold text-slate-950 outline-none"
                min={20}
                max={5000}
                type="number"
                value={amountSar}
                onChange={(event) => onAmount(Number(event.target.value))}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {TOP_UP_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ${
                    amountSar === amount ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => onAmount(amount)}
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700">Payment method</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(METHOD_LABELS) as PaymentMethodKey[]).map((method) => {
                const enabled = method === 'creditcard' || Boolean(methods?.[method]);
                return (
                  <button
                    key={method}
                    type="button"
                    disabled={!enabled}
                    onClick={() => onSelectedMethod(method)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      selectedMethod === method
                        ? 'border-slate-950 bg-slate-950 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    } disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300`}
                  >
                    {METHOD_LABELS[method]}
                  </button>
                );
              })}
            </div>
          </div>

          {!activeInvoice ? (
            <button
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={actionLoading || amountSar < 20 || amountSar > 5000}
              onClick={onPrepare}
            >
              {actionLoading ? 'Preparing...' : `Continue with ${formatSarHalalas(amountSar * 100)}`}
            </button>
          ) : !publishableKey ? (
            <Alert tone="red">Moyasar publishable key is not configured.</Alert>
          ) : !moyasarReady ? (
            <div className="h-56 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <div id={MOYASAR_FORM_ID} className="moyasar-embedded-form min-h-[260px]" />
          )}
        </div>
      </div>
    </div>
  );
}

function AutoRechargeDialog({
  actionLoading,
  defaultValues,
  hasDefaultMethod,
  onClose,
  onSave,
}: {
  actionLoading: boolean;
  defaultValues: any;
  hasDefaultMethod: boolean;
  onClose: () => void;
  onSave: (enabled: boolean, thresholdSar: number, rechargeSar: number) => void;
}) {
  const [enabled, setEnabled] = useState(Boolean(defaultValues?.enabled));
  const [thresholdSar, setThresholdSar] = useState(Number(defaultValues?.threshold_halalas || 2000) / 100);
  const [rechargeSar, setRechargeSar] = useState(Number(defaultValues?.recharge_amount_halalas || 2000) / 100);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/30 px-4 py-10">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">Auto recharge</h2>
          <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Close">
            <IconX className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          {!hasDefaultMethod ? <Alert tone="red">Save a payment method before turning on auto recharge.</Alert> : null}
          <label className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
            <span className="text-sm font-medium text-slate-900">Enable auto recharge</span>
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          </label>
          <NumberField label="Recharge when balance reaches" value={thresholdSar} onChange={setThresholdSar} />
          <NumberField label="Recharge amount" value={rechargeSar} onChange={setRechargeSar} />
          <button
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={actionLoading || (enabled && !hasDefaultMethod) || thresholdSar < 20 || rechargeSar < 20 || rechargeSar > 5000}
            onClick={() => onSave(enabled, thresholdSar, rechargeSar)}
          >
            {actionLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentMethodsTab({ methods, onAdd, onDefault, onRemove, actionLoading }: any) {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Payment methods</h2>
          <p className="mt-1 text-sm text-slate-500">Saved Moyasar tokens are used for auto recharge.</p>
        </div>
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" onClick={onAdd}>
          Add method
        </button>
      </div>
      {methods.length === 0 ? (
        <EmptyState icon={<IconCreditCard />} title="No payment method" detail="Top up with card and Moyasar will return a saved token when available." />
      ) : (
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {methods.map((method: any) => {
            const methodId = method.method_id || method.id;
            return (
              <div key={methodId} className="flex items-center justify-between gap-4 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <IconCreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {method.card?.brand || 'Card'} ending {method.card?.last4 || '----'}
                    </p>
                    <p className="text-xs text-slate-500">{method.is_default ? 'Default' : `Added ${formatDate(method.created_at)}`}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!method.is_default ? (
                    <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700" disabled={actionLoading} onClick={() => onDefault(methodId)}>
                      Set default
                    </button>
                  ) : null}
                  <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-500" disabled={actionLoading} onClick={() => onRemove(methodId)}>
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HistoryTab({ invoices, transactions }: { invoices: any[]; transactions: any[] }) {
  const rows = [...invoices, ...transactions]
    .sort((a, b) => Number(b.created_at || 0) - Number(a.created_at || 0))
    .slice(0, 100);

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-lg font-semibold text-slate-950">Billing history</h2>
      <div className="mt-5">
        {rows.length === 0 ? (
          <EmptyState icon={<IconFileInvoice />} title="No billing history" detail="Credit purchases and automatic recharges will appear here." />
        ) : (
          <Table rows={rows.map((row) => ({
            id: row.invoice_id || row.transaction_id,
            title: row.description || (row.billing_purpose === 'AUTO_RECHARGE' ? 'Auto recharge' : 'Credit purchase'),
            detail: row.status || row.transaction_type || 'Payment',
            date: formatDate(row.created_at),
            amount: formatSarHalalas(row.amount_paid || row.amount_halalas),
          }))} />
        )}
      </div>
    </div>
  );
}

function LeadFeesTab({ leadFees }: { leadFees: any[] }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-lg font-semibold text-slate-950">Lead fees</h2>
      <div className="mt-5">
        {leadFees.length === 0 ? (
          <EmptyState icon={<IconReceipt />} title="No lead fees" detail="Leads you buy from jobs and direct requests will appear here." />
        ) : (
          <Table rows={leadFees.map((fee) => ({
            id: fee.transaction_id,
            title: fee.description || 'Lead fee',
            detail: fee.billing_status || fee.transaction_type,
            date: formatDate(fee.created_at),
            amount: formatSarHalalas(fee.amount_halalas),
          }))} />
        )}
      </div>
    </div>
  );
}

function Table({ rows }: { rows: Array<{ id: string; title: string; detail: string; date: string; amount: string }> }) {
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
      {rows.map((row) => (
        <div key={row.id} className="grid grid-cols-[1fr_auto] gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-950">{row.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">{row.date} - {row.detail}</p>
          </div>
          <p className="text-sm font-semibold text-slate-950">{row.amount}</p>
        </div>
      ))}
    </div>
  );
}

function QuickLink({ icon, title, detail, onClick }: any) {
  return (
    <button className="flex items-center gap-4 rounded-lg p-2 text-left hover:bg-slate-50" onClick={onClick}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-950">{title}</span>
        <span className="mt-0.5 block text-sm text-slate-500">{detail}</span>
      </span>
    </button>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-slate-300 px-3 py-2">
        <span className="text-sm font-semibold text-slate-500">SAR</span>
        <input className="ml-3 w-full border-0 text-sm font-semibold outline-none" min={20} max={5000} type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      </div>
    </label>
  );
}

function Alert({ children, tone }: { children: React.ReactNode; tone: 'green' | 'red' }) {
  const color = tone === 'green' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700';
  return <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${color}`}>{children}</div>;
}

function EmptyState({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 py-14 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-400">{icon}</div>
      <p className="mt-3 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}
