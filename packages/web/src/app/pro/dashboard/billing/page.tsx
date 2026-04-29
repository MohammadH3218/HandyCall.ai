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
type CardBrandKey = 'mada' | 'visa' | 'mastercard' | 'amex' | 'unknown';

const MOYASAR_FORM_JS = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js';
const MOYASAR_FORM_CSS = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.css';
const MOYASAR_FORM_ID = 'moyasar-credit-top-up-form';
const TOP_UP_OPTIONS = [100, 250, 500, 20, 50];
const NEW_PAYMENT_METHOD_ID = 'new';
const MOYASAR_TOKENS_URL = 'https://api.moyasar.com/v1/tokens';
const METHOD_LABELS: Record<PaymentMethodKey, string> = {
  creditcard: 'Card',
  applepay: 'Apple Pay',
  samsungpay: 'Samsung Pay',
  stcpay: 'STC Pay',
};
const CARD_NUMBER_MAX_LENGTH = 19;
const CARDHOLDER_MAX_LENGTH = 64;

const MADA_PREFIXES = [
  '588845',
  '440647',
  '440795',
  '446404',
  '457865',
  '417633',
  '468540',
  '468541',
  '468542',
  '468543',
  '968201',
  '968202',
  '968203',
  '968204',
  '968205',
  '968206',
  '968207',
  '968208',
  '968209',
  '968210',
  '968211',
];

const CARD_BRANDS: Record<CardBrandKey, { label: string; shortLabel: string; className: string }> = {
  mada: {
    label: 'mada',
    shortLabel: 'mada',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  visa: {
    label: 'Visa',
    shortLabel: 'VISA',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  mastercard: {
    label: 'Mastercard',
    shortLabel: 'MC',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  amex: {
    label: 'American Express',
    shortLabel: 'AMEX',
    className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  },
  unknown: {
    label: 'Card',
    shortLabel: 'CARD',
    className: 'border-slate-200 bg-slate-50 text-slate-500',
  },
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

function onlyDigits(value: string, maxLength = Number.MAX_SAFE_INTEGER) {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

function formatCardNumber(value: string) {
  return onlyDigits(value, CARD_NUMBER_MAX_LENGTH)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function detectCardBrand(value: string): CardBrandKey {
  const digits = onlyDigits(value, CARD_NUMBER_MAX_LENGTH);
  if (MADA_PREFIXES.some((prefix) => digits.startsWith(prefix))) return 'mada';
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  return 'unknown';
}

function cardNumberMaxForBrand(brand: CardBrandKey) {
  return brand === 'amex' ? 15 : CARD_NUMBER_MAX_LENGTH;
}

function cardCvcMaxForBrand(brand: CardBrandKey) {
  return brand === 'amex' ? 4 : 3;
}

function normalizeCardBrandName(value?: string): CardBrandKey {
  const brand = String(value || '').toLowerCase();
  if (brand.includes('mada')) return 'mada';
  if (brand.includes('visa')) return 'visa';
  if (brand.includes('master')) return 'mastercard';
  if (brand.includes('amex') || brand.includes('american')) return 'amex';
  return 'unknown';
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
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [topUpSar, setTopUpSar] = useState(100);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodKey>('creditcard');
  const [selectedSavedMethodId, setSelectedSavedMethodId] = useState<string>(NEW_PAYMENT_METHOD_ID);
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
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        if (window.Moyasar || Date.now() - startedAt > 8000) {
          window.clearInterval(timer);
          setMoyasarReady(Boolean(window.Moyasar));
        }
      }, 100);
      existing.addEventListener('load', () => setMoyasarReady(true), { once: true });
      return () => window.clearInterval(timer);
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

  useEffect(() => {
    if (paymentMethods.length === 0) {
      setSelectedSavedMethodId(NEW_PAYMENT_METHOD_ID);
      return;
    }

    if (selectedSavedMethodId === NEW_PAYMENT_METHOD_ID) return;

    const selectedExists = paymentMethods.some((method) => (method.method_id || method.id) === selectedSavedMethodId);
    if (!selectedExists) {
      const preferred = paymentMethods.find((method) => method.is_default || method.is_preferred) || paymentMethods[0];
      setSelectedSavedMethodId(preferred.method_id || preferred.id || NEW_PAYMENT_METHOD_ID);
    }
  }, [paymentMethods, selectedSavedMethodId]);

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

  async function prepareTopUp() {
    try {
      setActionLoading(true);
      setError(null);
      setNotice(null);
      const amountHalalas = Math.round(Number(topUpSar || 0) * 100);
      if (selectedSavedMethodId !== NEW_PAYMENT_METHOD_ID) {
        const result = await apiClient.rechargeCreditsWithDefaultMethod(amountHalalas, selectedSavedMethodId);
        if (result?.action_url) {
          window.location.href = result.action_url;
          return;
        }
        if (result?.payment_status !== 'PAID') {
          setNotice('Payment started. Your credits will update after Moyasar confirms the charge.');
        } else {
          setNotice('Credits added to your balance.');
        }
        setShowTopUp(false);
        setActiveInvoice(null);
        await load();
        return;
      }

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

  async function savePaymentMethod(token: string) {
    try {
      setActionLoading(true);
      setError(null);
      setNotice(null);
      await apiClient.savePaymentMethodToken(token);
      setNotice('Payment method saved.');
      setShowAddMethod(false);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Unable to save payment method.');
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

  function openTopUp() {
    const preferred = paymentMethods.find((method) => method.is_default || method.is_preferred) || paymentMethods[0];
    setTopUpSar(100);
    setSelectedSavedMethodId(preferred?.method_id || preferred?.id || NEW_PAYMENT_METHOD_ID);
    setSelectedMethod('creditcard');
    setActiveInvoice(null);
    setShowTopUp(true);
  }

  return (
    <div className="min-h-screen bg-slate-50/70 p-6 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm shadow-emerald-950/5">
          <div className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-600">Pro wallet</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-950">Billing</h1>
              </div>
              <div className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                SAR credits
              </div>
            </div>
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
                      ? 'border-emerald-600 text-emerald-700'
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
                    onTopUp={openTopUp}
                    onView={(tab) => setActiveTab(tab)}
                  />
                ) : null}

                {activeTab === 'payment-methods' ? (
                  <PaymentMethodsTab
                    methods={paymentMethods}
                    onAdd={() => setShowAddMethod(true)}
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
          onRenderForm={renderMoyasarForm}
          onSelectedMethod={(method) => {
            setSelectedMethod(method);
            setActiveInvoice(null);
          }}
          onSavedMethod={(methodId) => {
            setSelectedSavedMethodId(methodId);
            setActiveInvoice(null);
          }}
          paymentMethods={paymentMethods}
          selectedMethod={selectedMethod}
          selectedSavedMethodId={selectedSavedMethodId}
          publishableKey={publishableKey}
        />
      ) : null}

      {showAddMethod ? (
        <AddPaymentMethodDialog
          actionLoading={actionLoading}
          publishableKey={publishableKey}
          onClose={() => setShowAddMethod(false)}
          onSave={(token) => void savePaymentMethod(token)}
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
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/60 to-teal-50 p-5 shadow-sm shadow-emerald-950/5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Pay as you go</h2>
              <p className="mt-1 text-sm text-slate-500">Use credits to buy marketplace leads across Riyadh.</p>
            </div>
            <div className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
              Active wallet
            </div>
          </div>
          <div className="mt-5">
            <p className="text-sm font-medium text-slate-700">Credit balance</p>
            <p className="mt-2 text-4xl font-bold text-emerald-700">{formatSarHalalas(creditBalance)}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-700" onClick={onTopUp}>
              Add to credit balance
            </button>
            <button className="rounded-xl border border-emerald-100 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-emerald-200 hover:bg-emerald-50" onClick={onAutoRecharge}>
              Auto recharge settings
            </button>
          </div>
        </div>

        <div
          className={`mt-5 flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 ${
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
          <button className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200" onClick={onAutoRecharge}>
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
  onRenderForm,
  onSelectedMethod,
  onSavedMethod,
  paymentMethods,
  selectedMethod,
  selectedSavedMethodId,
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
  onRenderForm: (invoice: any) => void;
  onSelectedMethod: (method: PaymentMethodKey) => void;
  onSavedMethod: (methodId: string) => void;
  paymentMethods: any[];
  selectedMethod: PaymentMethodKey;
  selectedSavedMethodId: string;
  publishableKey: string | null;
}) {
  const usingSavedMethod = selectedSavedMethodId !== NEW_PAYMENT_METHOD_ID;

  useEffect(() => {
    if (!activeInvoice || !moyasarReady || !publishableKey || usingSavedMethod) return;
    onRenderForm(activeInvoice);
  }, [activeInvoice, moyasarReady, onRenderForm, publishableKey, usingSavedMethod]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 px-4 py-10 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-950/15">
        <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Wallet top-up</p>
            <h2 className="mt-1 text-base font-semibold text-slate-950">Add credits</h2>
          </div>
          <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Close">
            <IconX className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-5 p-5">
          <div>
            <label className="text-sm font-medium text-slate-700">Amount</label>
            <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100">
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
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium ring-1 transition ${
                    amountSar === amount ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
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
            {paymentMethods.length > 0 ? (
              <div className="mt-2 space-y-2">
                {paymentMethods.map((method) => {
                  const methodId = method.method_id || method.id;
                  return (
                    <label
                      key={methodId}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 transition ${
                        selectedSavedMethodId === methodId
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:bg-emerald-50/60'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <input
                          type="radio"
                          name="top-up-payment-method"
                          checked={selectedSavedMethodId === methodId}
                          onChange={() => {
                            onSavedMethod(methodId);
                          }}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-950">
                            {method.card?.brand || 'Card'} ending {method.card?.last4 || '----'}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {method.is_default || method.is_preferred ? 'Preferred for auto recharge' : 'Saved card'}
                          </span>
                        </span>
                      </span>
                    </label>
                  );
                })}
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition ${
                    selectedSavedMethodId === NEW_PAYMENT_METHOD_ID
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-200 bg-white hover:bg-emerald-50/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="top-up-payment-method"
                    checked={selectedSavedMethodId === NEW_PAYMENT_METHOD_ID}
                    onChange={() => onSavedMethod(NEW_PAYMENT_METHOD_ID)}
                  />
                  <span className="text-sm font-semibold text-slate-950">Use a new payment method</span>
                </label>
              </div>
            ) : null}
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(METHOD_LABELS) as PaymentMethodKey[]).map((method) => {
                const enabled = method === 'creditcard' || Boolean(methods?.[method]);
                return (
                  <button
                    key={method}
                    type="button"
                    disabled={!enabled || usingSavedMethod}
                    onClick={() => {
                      onSavedMethod(NEW_PAYMENT_METHOD_ID);
                      onSelectedMethod(method);
                    }}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      selectedMethod === method && !usingSavedMethod
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
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
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
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

function AddPaymentMethodDialog({
  actionLoading,
  publishableKey,
  onClose,
  onSave,
}: {
  actionLoading: boolean;
  publishableKey: string | null;
  onClose: () => void;
  onSave: (token: string) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    number: '',
    month: '',
    year: '',
    cvc: '',
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cardNumberRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);
  const cvcRef = useRef<HTMLInputElement>(null);
  const detectedBrand = detectCardBrand(form.number);
  const cardNumberMax = cardNumberMaxForBrand(detectedBrand);
  const cvcMax = cardCvcMaxForBrand(detectedBrand);

  function updateCardNumber(value: string) {
    const nextBrand = detectCardBrand(value);
    const nextMax = cardNumberMaxForBrand(nextBrand);
    const nextCvcMax = cardCvcMaxForBrand(nextBrand);
    const next = onlyDigits(value, nextMax);
    setForm((prev) => ({ ...prev, number: next, cvc: prev.cvc.slice(0, nextCvcMax) }));
    if (next.length >= nextMax) {
      monthRef.current?.focus();
    }
  }

  function updateMonth(value: string) {
    const next = onlyDigits(value, 2);
    setForm((prev) => ({ ...prev, month: next }));
    if (next.length === 2) {
      yearRef.current?.focus();
    }
  }

  function updateYear(value: string) {
    const next = onlyDigits(value, 4);
    setForm((prev) => ({ ...prev, year: next }));
    if (next.length === 4) {
      cvcRef.current?.focus();
    }
  }

  function updateCvc(value: string) {
    setForm((prev) => ({ ...prev, cvc: onlyDigits(value, cvcMax) }));
  }

  async function createToken() {
    if (!publishableKey) {
      setLocalError('Moyasar publishable key is not configured.');
      return;
    }

    try {
      setSubmitting(true);
      setLocalError(null);
      const response = await fetch(MOYASAR_TOKENS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publishable_api_key: publishableKey,
          save_only: true,
          name: form.name.trim(),
          number: form.number,
          month: form.month.padStart(2, '0'),
          year: form.year,
          cvc: form.cvc,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || data?.errors || 'Unable to tokenize this card.');
      }

      const token = data?.id || data?.token;
      if (!token) throw new Error('Moyasar did not return a card token.');
      onSave(token);
    } catch (err: any) {
      setLocalError(err?.message || 'Unable to save payment method.');
    } finally {
      setSubmitting(false);
    }
  }

  const disabled =
    actionLoading ||
    submitting ||
    !form.name.trim() ||
    form.number.length < 12 ||
    form.number.length > cardNumberMax ||
    form.month.length !== 2 ||
    Number(form.month) < 1 ||
    Number(form.month) > 12 ||
    form.year.length !== 4 ||
    form.cvc.length < 3;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 px-4 py-10 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-950/15">
        <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Secure card</p>
            <h2 className="mt-1 text-base font-semibold text-slate-950">Add payment method</h2>
          </div>
          <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Close">
            <IconX className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          {localError ? <Alert tone="red">{localError}</Alert> : null}
          <TextField
            label="Cardholder name"
            value={form.name}
            maxLength={CARDHOLDER_MAX_LENGTH}
            autoComplete="cc-name"
            onChange={(value) => setForm((prev) => ({ ...prev, name: value.slice(0, CARDHOLDER_MAX_LENGTH) }))}
          />
          <TextField
            label="Card number"
            value={formatCardNumber(form.number)}
            inputRef={cardNumberRef}
            inputMode="numeric"
            autoComplete="cc-number"
            maxLength={formatCardNumber('9'.repeat(cardNumberMax)).length}
            rightAdornment={<CardBrandBadge brand={detectedBrand} compact />}
            onChange={updateCardNumber}
          />
          <div className="grid grid-cols-3 gap-3">
            <TextField label="MM" value={form.month} inputRef={monthRef} inputMode="numeric" autoComplete="cc-exp-month" maxLength={2} onChange={updateMonth} />
            <TextField label="YYYY" value={form.year} inputRef={yearRef} inputMode="numeric" autoComplete="cc-exp-year" maxLength={4} onChange={updateYear} />
            <TextField label="CVC" value={form.cvc} inputRef={cvcRef} inputMode="numeric" autoComplete="cc-csc" maxLength={cvcMax} onChange={updateCvc} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-800">
            <span>Detected network</span>
            <CardBrandBadge brand={detectedBrand} />
          </div>
          <button
            className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            disabled={disabled}
            onClick={() => void createToken()}
          >
            {submitting || actionLoading ? 'Saving...' : 'Save payment method'}
          </button>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/40 px-4 py-10 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl shadow-slate-950/15">
        <div className="flex items-center justify-between border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Credit safety net</p>
            <h2 className="mt-1 text-base font-semibold text-slate-950">Auto recharge</h2>
          </div>
          <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Close">
            <IconX className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          {!hasDefaultMethod ? <Alert tone="red">Save a payment method before turning on auto recharge.</Alert> : null}
          <label className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
            <span className="text-sm font-medium text-slate-900">Enable auto recharge</span>
            <input className="h-4 w-4 accent-emerald-600" type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
          </label>
          <NumberField label="Recharge when balance reaches" value={thresholdSar} onChange={setThresholdSar} />
          <NumberField label="Recharge amount" value={rechargeSar} onChange={setRechargeSar} />
          <button
            className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-900/10 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
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
          <p className="mt-1 text-sm text-slate-500">Choose a preferred saved card for top-ups and auto recharge.</p>
        </div>
        <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700" onClick={onAdd}>
          Add method
        </button>
      </div>
      {methods.length === 0 ? (
        <EmptyState icon={<IconCreditCard />} title="No payment method" detail="Add a card to use it for top-ups and auto recharge." />
      ) : (
        <div className="divide-y divide-emerald-50 rounded-2xl border border-emerald-100 bg-white shadow-sm shadow-emerald-950/5">
          {methods.map((method: any) => {
            const methodId = method.method_id || method.id;
            return (
              <div key={methodId} className="flex items-center justify-between gap-4 px-4 py-4">
                <div className="flex items-center gap-3">
                  <CardIcon brand={normalizeCardBrandName(method.card?.brand)} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-950">
                        {method.card?.brand || 'Card'} ending {method.card?.last4 || '----'}
                      </p>
                      <CardBrandBadge brand={normalizeCardBrandName(method.card?.brand)} />
                    </div>
                    <p className="text-xs text-slate-500">{method.is_default || method.is_preferred ? 'Preferred for auto recharge' : `Added ${formatDate(method.created_at)}`}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!method.is_default && !method.is_preferred ? (
                    <button className="rounded-xl border border-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50" disabled={actionLoading} onClick={() => onDefault(methodId)}>
                      Make preferred
                    </button>
                  ) : null}
                  <button className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-50" disabled={actionLoading} onClick={() => onRemove(methodId)}>
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
    <button className="flex items-center gap-4 rounded-2xl border border-transparent p-3 text-left transition hover:border-emerald-100 hover:bg-emerald-50/60" onClick={onClick}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-slate-950">{title}</span>
        <span className="mt-0.5 block text-sm text-slate-500">{detail}</span>
      </span>
    </button>
  );
}

function CardBrandBadge({ brand, compact = false }: { brand: CardBrandKey; compact?: boolean }) {
  const config = CARD_BRANDS[brand];
  return (
    <span className={`inline-flex h-6 items-center rounded-md border px-2 text-[10px] font-black tracking-[0.12em] ${config.className}`}>
      {compact ? config.shortLabel : config.label}
    </span>
  );
}

function CardIcon({ brand }: { brand: CardBrandKey }) {
  const config = CARD_BRANDS[brand];
  return (
    <div className={`flex h-11 w-14 shrink-0 items-center justify-center rounded-xl border text-[10px] font-black tracking-[0.1em] ${config.className}`}>
      {config.shortLabel}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1 flex items-center rounded-xl border border-slate-200 px-3 py-2 transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100">
        <span className="text-sm font-semibold text-slate-500">SAR</span>
        <input className="ml-3 w-full border-0 text-sm font-semibold outline-none" min={20} max={5000} type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
      </div>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  inputMode,
  autoComplete,
  inputRef,
  maxLength,
  rightAdornment,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  autoComplete?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  maxLength?: number;
  rightAdornment?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1 flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100">
        <input
          ref={inputRef}
          className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
          value={value}
          inputMode={inputMode}
          autoComplete={autoComplete}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
        {rightAdornment ? <span className="ml-2 shrink-0">{rightAdornment}</span> : null}
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
