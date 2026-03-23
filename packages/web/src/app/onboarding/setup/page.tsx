'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  IconSparkles,
  IconUser,
  IconCheck,
  IconX,
  IconArrowRight,
  IconLoader2,
  IconMapPin,
  IconCalendar,
  IconPhone,
  IconBrain,
  IconCreditCard,
  IconBrandGoogle,
  IconBrandWindows,
  IconBrandApple,
  IconSend,
  IconChevronRight,
  IconGlobe,
} from '@tabler/icons-react';
import { useOnboarding } from '@/components/onboarding/onboarding-context';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { SERVICE_TYPE_OPTIONS } from '@/constants/service-types';
import {
  COMPANY_TEMPLATE_OPTIONS,
  createDefaultCallFlowQuestions,
  getKnowledgeBasePromptSuggestions,
} from '@/constants/company-templates';
import { TIMEZONE_OPTIONS, DEFAULT_TIMEZONE } from '@/constants/timezones';
import { PLAN_CATALOG, getPlanPriceDisplay } from '@/constants/plans';
import { CompanyCallFlowQuestion, ServiceType, SubscriptionPlan } from '@handycall/shared';
import { CallFlowEditor } from '@/components/company/call-flow-editor';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase =
  | 'loading'
  | 'profile_name'
  | 'company_name'
  | 'service_type'
  | 'timezone'
  | 'service_area_choice'
  | 'service_area_input'
  | 'calendar_mode'
  | 'calendar_hours'
  | 'calendar_provider'
  | 'calendar_apple'
  | 'phone_choice'
  | 'phone_claim'
  | 'phone_forward'
  | 'knowledge_intro'
  | 'knowledge_chat'
  | 'call_flow_editor'
  | 'billing_plan'
  | 'billing_payment'
  | 'billing_payment_mode'
  | 'billing_connect'
  | 'complete';

type DayRow = { closed: boolean; open: string; close: string };
type CalendarHours = Record<string, DayRow>;

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS = [
  { key: 'MON', label: 'Mon' },
  { key: 'TUE', label: 'Tue' },
  { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' },
  { key: 'FRI', label: 'Fri' },
  { key: 'SAT', label: 'Sat' },
  { key: 'SUN', label: 'Sun' },
];

const PHASE_TO_GROUP: Record<Phase, number> = {
  loading: 0,
  profile_name: 1,
  company_name: 2,
  service_type: 2,
  timezone: 2,
  service_area_choice: 3,
  service_area_input: 3,
  calendar_mode: 4,
  calendar_hours: 4,
  calendar_provider: 4,
  calendar_apple: 4,
  phone_choice: 5,
  phone_claim: 5,
  phone_forward: 5,
  knowledge_intro: 6,
  knowledge_chat: 6,
  call_flow_editor: 7,
  billing_payment_mode: 8,
  billing_plan: 8,
  billing_payment: 8,
  billing_connect: 8,
  complete: 9,
};

const STEP_GROUPS = [
  { group: 1, label: 'Your profile' },
  { group: 2, label: 'Your business' },
  { group: 3, label: 'Service area' },
  { group: 4, label: 'Calendar' },
  { group: 5, label: 'Phone number' },
  { group: 6, label: 'Knowledge base' },
  { group: 7, label: 'AI call flow' },
  { group: 8, label: 'Billing & plan' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function defaultHours(): CalendarHours {
  return Object.fromEntries(
    WEEKDAYS.map((d) => [
      d.key,
      { closed: d.key === 'SAT' || d.key === 'SUN', open: '09:00', close: '17:00' },
    ])
  );
}

function compactHours(hours: CalendarHours) {
  const out: Record<string, { open: string; close: string }> = {};
  for (const [day, row] of Object.entries(hours)) {
    if (!row.closed) out[day] = { open: row.open, close: row.close };
  }
  return out;
}

function normalizeCallFlowQuestions(
  questions: CompanyCallFlowQuestion[] | undefined | null
): CompanyCallFlowQuestion[] {
  if (!Array.isArray(questions)) return [];
  return questions
    .map((question, index) => ({
      ...question,
      id: String(question?.id || `${question?.field_key || 'question'}-${index + 1}`),
      field_key: String(question?.field_key || '').trim(),
      label: String(question?.label || '').trim(),
      prompt: String(question?.prompt || '').trim(),
      required: question?.required !== false,
      enabled: question?.enabled !== false,
      order: Number.isFinite(Number(question?.order)) ? Number(question?.order) : index,
    }))
    .filter((question) => question.field_key && question.label && question.prompt)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((question, index) => ({ ...question, order: index }));
}

function sanitizeCallFlowQuestions(
  questions: CompanyCallFlowQuestion[]
): CompanyCallFlowQuestion[] {
  return normalizeCallFlowQuestions(questions)
    .filter((question) => question.enabled !== false)
    .map((question, index) => {
      const prompt = String(question.prompt || '').trim();
      const label =
        String(question.label || `Question ${index + 1}`).trim() || `Question ${index + 1}`;
      const fieldKey =
        String(question.field_key || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') || `custom_question_${index + 1}`;

      return {
        id: String(question.id || `${fieldKey}-${index + 1}`),
        field_key: fieldKey,
        label,
        prompt,
        helper_text: question.helper_text ? String(question.helper_text) : undefined,
        required: true,
        enabled: true,
        order: index,
      };
    })
    .filter((question) => question.prompt.length > 0);
}

function normalizeHours(source: any): CalendarHours {
  const base = defaultHours();
  if (!source || typeof source !== 'object') return base;
  for (const { key } of WEEKDAYS) {
    const raw = source[key];
    if (raw && !raw.closed && raw.open) {
      base[key] = { closed: false, open: raw.open, close: raw.close || '17:00' };
    }
  }
  return base;
}

function getStepMeta(phase: Phase): { title: string; description: string } {
  switch (phase) {
    case 'profile_name':
      return {
        title: "What's your name?",
        description: "We'll use this to personalize your HandyCall account.",
      };
    case 'company_name':
      return {
        title: "What's your business name?",
        description: 'This appears across your AI receptionist and booking links.',
      };
    case 'service_type':
      return {
        title: 'What type of service do you provide?',
        description: "Pick the closest template — you'll customize everything in the next step.",
      };
    case 'timezone':
      return {
        title: 'What timezone are you in?',
        description: 'Used for scheduling appointments and sending reminders accurately.',
      };
    case 'service_area_choice':
      return {
        title: 'Where do you provide service?',
        description: 'HandyCall uses this to qualify callers before accepting bookings.',
      };
    case 'service_area_input':
      return {
        title: 'Add your service ZIP codes',
        description: 'Only callers in these areas will be routed to the booking flow.',
      };
    case 'calendar_mode':
      return {
        title: 'How do you manage appointments?',
        description: 'HandyCall can run its own calendar or sync with an existing one.',
      };
    case 'calendar_hours':
      return {
        title: 'Set your business hours',
        description: 'Callers can only book time slots within these hours.',
      };
    case 'calendar_provider':
      return {
        title: 'Which calendar would you like to connect?',
        description: "We'll sync appointments in both directions.",
      };
    case 'calendar_apple':
      return {
        title: 'Connect your Apple Calendar',
        description: 'Use an app-specific password generated from appleid.apple.com.',
      };
    case 'phone_choice':
      return {
        title: 'How should customers reach you?',
        description: 'Set up the phone number your AI receptionist will answer.',
      };
    case 'phone_claim':
      return {
        title: 'Find your local number',
        description: 'Search by area code to claim a dedicated HandyCall line.',
      };
    case 'phone_forward':
      return {
        title: 'Enter your current number',
        description:
          'Customers keep calling the same number — HandyCall intercepts and handles it.',
      };
    case 'knowledge_intro':
      return {
        title: 'Build your AI knowledge base',
        description:
          'Teach your AI receptionist how to answer the questions customers actually ask.',
      };
    case 'knowledge_chat':
      return {
        title: 'Tell us about your business',
        description: 'Add services, pricing, policies — anything your receptionist should know.',
      };
    case 'call_flow_editor':
      return {
        title: 'Customize your AI call flow',
        description:
          'Control exactly which questions your AI asks before scheduling a job.',
      };
    case 'billing_payment_mode':
      return {
        title: 'How should customer payments work?',
        description: 'Choose how HandyCall handles money from your bookings.',
      };
    case 'billing_plan':
      return {
        title: 'Choose your plan',
        description: 'Start with a free trial — cancel anytime, no commitment.',
      };
    case 'billing_payment':
      return {
        title: 'Add a payment method',
        description: "You won't be charged until after your trial period ends.",
      };
    case 'billing_connect':
      return {
        title: 'Connect your bank account',
        description: 'HandyCall deposits customer payments directly to you via Stripe.',
      };
    case 'complete':
      return {
        title: "You're all set!",
        description:
          'Your AI receptionist is configured and ready to take calls.',
      };
    default:
      return { title: 'Setting up...', description: '' };
  }
}

// ─── UI Components ────────────────────────────────────────────────────────────

function PrimaryButton({
  onClick,
  type = 'button',
  disabled,
  loading,
  children,
  className,
}: {
  onClick?: () => void | Promise<void>;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick ? () => void onClick() : undefined}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {loading && <IconLoader2 className="h-4 w-4 animate-spin" stroke={1.5} />}
      {children}
    </button>
  );
}

function GhostButton({
  onClick,
  disabled,
  children,
  className,
}: {
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick ? () => void onClick() : undefined}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {children}
    </button>
  );
}

function OptionCard({
  onClick,
  disabled,
  selected,
  icon,
  label,
  description,
  recommended,
}: {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  selected?: boolean;
  icon?: React.ReactNode;
  label: string;
  description?: string;
  recommended?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={disabled}
      className={cn(
        'group relative w-full rounded-2xl border p-4 text-left transition-all duration-150',
        selected
          ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30'
          : 'border-border bg-card hover:border-emerald-400/60 hover:bg-accent/60',
        'disabled:cursor-not-allowed disabled:opacity-50'
      )}
    >
      {recommended && (
        <span className="absolute right-3 top-3 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          Recommended
        </span>
      )}
      <div className="flex items-start gap-3">
        {icon && (
          <div
            className={cn(
              'mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl',
              selected
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{label}</p>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <IconChevronRight
          className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
          stroke={1.5}
        />
      </div>
    </button>
  );
}

// ─── Stripe payment sub-component ────────────────────────────────────────────

function StripePaymentForm({
  selectedPlan,
  onSuccess,
}: {
  selectedPlan: SubscriptionPlan | null;
  onSuccess: () => Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !selectedPlan || done) return;
    setLoading(true);
    setError(null);
    try {
      const { error: stripeErr, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      });
      if (stripeErr) throw new Error(stripeErr.message);
      if (!setupIntent?.payment_method) throw new Error('No payment method returned.');
      await apiClient.createSubscription({
        plan: selectedPlan,
        payment_method_id: setupIntent.payment_method as string,
      });
      setDone(true);
      await onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {done && <p className="text-sm font-medium text-emerald-600">Subscription activated!</p>}
      <PrimaryButton
        type="submit"
        disabled={!stripe || loading || done || !selectedPlan}
        loading={loading}
        className="w-full justify-center"
      >
        <IconCreditCard className="h-4 w-4" stroke={1.5} />
        Activate {selectedPlan ? PLAN_CATALOG[selectedPlan].name : ''} plan
      </PrimaryButton>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function OnboardingSetupContent() {
  const {
    loading,
    company,
    status,
    refreshAll,
    refreshKnowledge,
    companyNumber,
    refreshCompanyNumber,
  } = useOnboarding();
  const { setCompany } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const [phase, setPhase] = useState<Phase>('loading');
  const [isSaving, setIsSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Form data
  const [nameInput, setNameInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [zipInput, setZipInput] = useState('');
  const [zipCodes, setZipCodes] = useState<string[]>([]);
  const [calendarHours, setCalendarHours] = useState<CalendarHours>(defaultHours());
  const [calendarTimezone, setCalendarTimezone] = useState(DEFAULT_TIMEZONE);
  const [appleEmail, setAppleEmail] = useState('');
  const [applePass, setApplePass] = useState('');
  const [areaCode, setAreaCode] = useState('832');
  const [numberSearch, setNumberSearch] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState<any[]>([]);
  const [searchingNums, setSearchingNums] = useState(false);
  const [forwardNumber, setForwardNumber] = useState('');

  // "Other / Not listed" service type
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherServiceInput, setOtherServiceInput] = useState('');
  const [callFlowQuestions, setCallFlowQuestions] = useState<CompanyCallFlowQuestion[]>([]);

  // Knowledge base state
  const [kbInput, setKbInput] = useState('');
  const [kbGenerating, setKbGenerating] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);

  // Billing state
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<
    'HANDYCALL_MANAGED' | 'SELF_MANAGED' | null
  >(null);
  const [paymentModeSaving, setPaymentModeSaving] = useState(false);
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectChecking, setConnectChecking] = useState(false);
  const [connectStatus, setConnectStatus] = useState<any>(null);
  const [setupClientSecret, setSetupClientSecret] = useState<string | null>(null);
  const [stripePublishableKey, setStripePublishableKey] = useState<string | null>(
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null
  );
  const stripePromise = useMemo(() => {
    const key = stripePublishableKey;
    const invalidPlaceholder =
      !key ||
      key === 'pk_test_xxx' ||
      key.includes('local_dev_placeholder') ||
      key.endsWith('_xxx');
    return invalidPlaceholder ? null : loadStripe(key);
  }, [stripePublishableKey]);

  useEffect(() => {
    if (
      stripePublishableKey &&
      !stripePublishableKey.includes('local_dev_placeholder') &&
      !stripePublishableKey.endsWith('_xxx')
    ) {
      return;
    }
    apiClient
      .getBillingConfig()
      .then((config) => {
        if (config?.publishable_key) setStripePublishableKey(config.publishable_key);
      })
      .catch(() => null);
  }, [stripePublishableKey]);

  // New setup steps should start at the top of the content area.
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: 0, behavior: 'auto' });
  }, [phase]);

  // ─── Simplified chat helpers ──────────────────────────────────────────────

  const botSay = useCallback(async (_text: string) => {}, []);

  const userSay = useCallback((_text: string, _onEdit?: () => void) => {}, []);

  const goTo = useCallback(async (next: Phase, ..._msgs: string[]) => {
    setErrMsg(null);
    setPhase(next);
  }, []);

  const clearConnectQueryParams = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const hadConnectParams =
      url.searchParams.has('payments') || url.searchParams.has('state');
    if (!hadConnectParams) return;
    url.searchParams.delete('payments');
    url.searchParams.delete('state');
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, []);

  const isConnectReady = useCallback(
    (statusOverride?: any) => {
      const currentStatus = statusOverride ?? connectStatus;
      return Boolean(
        currentStatus?.connected &&
          (currentStatus?.charges_enabled ||
            currentStatus?.details_submitted ||
            (company as any)?.stripe_connect_onboarding_complete)
      );
    },
    [company, connectStatus]
  );

  const hasActiveBilling = useCallback(() => {
    return Boolean(
      status.billing ||
        (company as any)?.subscription_plan ||
        (company as any)?.stripe_subscription_id ||
        (company as any)?.subscription_status === 'ACTIVE' ||
        (company as any)?.subscription_status === 'TRIALING'
    );
  }, [company, status.billing]);

  const continueAfterConnect = useCallback(async () => {
    await refreshAll();
    if (hasActiveBilling()) {
      await goTo('complete');
      return;
    }
    await goTo('billing_plan');
  }, [goTo, hasActiveBilling, refreshAll]);

  const refreshConnectStatus = useCallback(
    async (options?: { clearQuery?: boolean }) => {
      setConnectChecking(true);
      try {
        const latest = await apiClient.getConnectStatus();
        setConnectStatus(latest);
        if (options?.clearQuery) {
          clearConnectQueryParams();
        }
        return latest;
      } catch (err: any) {
        setErrMsg(err?.message || 'Could not verify Stripe Connect status.');
        return null;
      } finally {
        setConnectChecking(false);
      }
    },
    [clearConnectQueryParams]
  );

  const editStep = useCallback(
    (_prompt: string, targetPhase: Phase, prefill?: () => void) => {
      setErrMsg(null);
      if (prefill) prefill();
      setPhase(targetPhase);
    },
    []
  );

  // ─── Initialization ────────────────────────────────────────────────────────

  useEffect(() => {
    if (loading || initialized.current) return;
    initialized.current = true;

    // Pre-fill from existing data
    if (company?.company_name) setCompanyInput(company.company_name as string);
    if (company?.timezone) setCalendarTimezone(company.timezone as string);
    if ((company?.service_area_zipcodes as string[])?.length)
      setZipCodes(company.service_area_zipcodes as string[]);
    if (company?.business_hours) setCalendarHours(normalizeHours(company.business_hours));
    if (company?.phone_number) setForwardNumber(company.phone_number as string);
    if ((company as any)?.booking_payment_mode) {
      setSelectedPaymentMode((company as any).booking_payment_mode);
    }
    if (
      Array.isArray((company as any)?.call_flow_questions) &&
      (company as any).call_flow_questions.length > 0
    ) {
      setCallFlowQuestions(normalizeCallFlowQuestions((company as any).call_flow_questions));
    } else if (company?.service_type) {
      setCallFlowQuestions(createDefaultCallFlowQuestions(company.service_type as ServiceType));
    }

    void startChat(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const startChat = async (s: typeof status) => {
    const paymentsFlow = searchParams?.get('payments');
    const connectState = searchParams?.get('state');
    const bookingPaymentMode = (company as any)?.booking_payment_mode as
      | 'HANDYCALL_MANAGED'
      | 'SELF_MANAGED'
      | undefined;
    const needsManagedConnect =
      bookingPaymentMode === 'HANDYCALL_MANAGED' &&
      !(company as any)?.stripe_connect_onboarding_complete;

    if (paymentsFlow === 'connect' && (connectState === 'return' || connectState === 'refresh')) {
      await goTo('billing_connect');
      await refreshConnectStatus({ clearQuery: true });
      return;
    }

    if (!s.profile) {
      await goTo('profile_name');
    } else if (!s.companyProfile) {
      await goTo('company_name');
    } else if (!s.serviceArea) {
      await goTo('service_area_choice');
    } else if (!s.calendar) {
      await goTo('calendar_mode');
    } else if (!s.phone) {
      await goTo('phone_choice');
    } else if (!s.knowledge) {
      await goTo('knowledge_chat');
    } else if (!(company as any)?.call_flow_questions?.length) {
      await goTo('call_flow_editor');
    } else if (!(company as any)?.booking_payment_mode_confirmed) {
      await goTo('billing_payment_mode');
    } else if (needsManagedConnect) {
      await goTo('billing_connect');
      await refreshConnectStatus();
    } else if (!s.billing) {
      await goTo('billing_plan');
    } else {
      await goTo('complete');
      setTimeout(() => router.replace('/onboarding/marketplace-profile'), 2000);
    }
  };

  // ─── Step handlers ─────────────────────────────────────────────────────────

  const handleProfileName = async () => {
    const name = nameInput.trim();
    if (!name) return;
    const captured = name;
    const nameParts = captured.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || undefined;
    userSay(captured, () =>
      editStep('What name would you like to use?', 'profile_name', () => setNameInput(captured))
    );
    setNameInput('');
    setIsSaving(true);
    try {
      await Promise.all([
        apiClient.updateMyProfile({
          first_name: firstName || undefined,
          last_name: lastName,
        }),
        apiClient.updateMyCompany({ owner_name: captured }),
      ]);
      await refreshAll();
    } catch {
      // Non-blocking
    } finally {
      setIsSaving(false);
    }
    await goTo('company_name');
  };

  const handleCompanyName = async () => {
    const name = companyInput.trim();
    if (!name) return;
    userSay(name, () => editStep("What's the correct business name?", 'company_name'));
    await goTo('service_type');
  };

  const handleServiceType = async (value: string, label: string) => {
    setShowOtherInput(false);
    setOtherServiceInput('');
    const displayLabel = label;
    const defaultQuestions = createDefaultCallFlowQuestions(value as ServiceType);
    userSay(displayLabel, () =>
      editStep('Which service type best describes your business?', 'service_type', () => {
        setShowOtherInput(false);
        setOtherServiceInput('');
      })
    );
    setIsSaving(true);
    try {
      await apiClient.updateMyCompany({
        service_type: value,
        call_flow_questions: defaultQuestions,
      });
      setCallFlowQuestions(defaultQuestions);
      await refreshAll();
      await goTo('timezone');
    } catch {
      setErrMsg('Could not save service type. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTimezone = async (value: string, label: string) => {
    userSay(label, () => editStep('Which timezone are you in?', 'timezone'));
    setCalendarTimezone(value);
    setIsSaving(true);
    try {
      const updated = await apiClient.updateMyCompany({
        company_name: companyInput.trim(),
        timezone: value,
        company_profile_completed: true,
      });
      setCompany(updated);
      await refreshAll();
      await goTo('service_area_choice');
    } catch {
      setErrMsg('Could not save company profile. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleServiceAreaAll = async () => {
    userSay('Serve all areas');
    setIsSaving(true);
    try {
      const updated = await apiClient.updateMyCompany({
        service_area_zipcodes: [],
        service_area_cities: [],
        service_area_completed: true,
      });
      setCompany(updated);
      await refreshAll();
      await goTo('calendar_mode');
    } catch {
      setErrMsg('Could not save service area.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleServiceAreaSpecific = async () => {
    userSay('Specific ZIP codes');
    await goTo('service_area_input');
  };

  const addZip = () => {
    const v = zipInput.trim();
    if (!v || !/^\d{5}$/.test(v) || zipCodes.includes(v)) {
      setZipInput('');
      return;
    }
    setZipCodes((prev) => [...prev, v]);
    setZipInput('');
  };

  const handleSaveServiceArea = async () => {
    if (zipCodes.length === 0) {
      setErrMsg('Add at least one ZIP code.');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await apiClient.updateMyCompany({
        service_area_zipcodes: zipCodes,
        service_area_cities: [],
        service_area_completed: true,
      });
      setCompany(updated);
      await refreshAll();
      userSay(`${zipCodes.length} ZIP code${zipCodes.length !== 1 ? 's' : ''} saved`);
      await goTo('calendar_mode');
    } catch {
      setErrMsg('Could not save service area.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCalendarMode = async (mode: 'INTERNAL' | 'EXTERNAL') => {
    if (mode === 'INTERNAL') {
      userSay('Use HandyCall Calendar');
      await goTo('calendar_hours');
    } else {
      userSay('Connect my existing calendar');
      await goTo('calendar_provider');
    }
  };

  const handleSaveCalendarHours = async () => {
    const hasOpen = WEEKDAYS.some((d) => !calendarHours[d.key]?.closed);
    if (!hasOpen) {
      setErrMsg('Set at least one open day.');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await apiClient.updateMyCompany({
        calendar_mode: 'INTERNAL',
        timezone: calendarTimezone,
        business_hours: compactHours(calendarHours),
        schedule_setup_completed: true,
        calendar_setup_completed: true,
      });
      setCompany(updated);
      await refreshAll();
      userSay('Business hours saved');
      await goTo('phone_choice');
    } catch {
      setErrMsg('Could not save calendar settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCalendarProvider = async (provider: 'GOOGLE' | 'MICROSOFT' | 'APPLE') => {
    const label =
      provider === 'GOOGLE'
        ? 'Google Calendar'
        : provider === 'MICROSOFT'
          ? 'Outlook / Microsoft 365'
          : 'Apple iCloud';
    userSay(label);
    if (provider === 'APPLE') {
      await goTo('calendar_apple');
      return;
    }
    setIsSaving(true);
    try {
      await apiClient.updateMyCompany({
        calendar_mode: 'EXTERNAL',
        timezone: calendarTimezone,
        schedule_setup_completed: true,
        calendar_setup_completed: false,
      });
      const res =
        provider === 'GOOGLE'
          ? await apiClient.getGoogleCalendarAuthUrl()
          : await apiClient.getMicrosoftCalendarAuthUrl();
      if (res?.url) window.location.href = res.url;
    } catch {
      setErrMsg('Could not start calendar connection. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectApple = async () => {
    if (!appleEmail || !applePass) {
      setErrMsg('Enter your Apple ID and app-specific password.');
      return;
    }
    setIsSaving(true);
    try {
      await apiClient.updateMyCompany({
        calendar_mode: 'EXTERNAL',
        timezone: calendarTimezone,
        schedule_setup_completed: true,
        calendar_setup_completed: false,
      });
      await apiClient.connectAppleCalendar(appleEmail, applePass);
      await refreshAll();
      userSay('Apple Calendar connected');
      await goTo('phone_choice');
    } catch (err: any) {
      setErrMsg(err?.message || 'Could not connect Apple Calendar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhoneChoice = async (choice: 'claim' | 'forward' | 'demo') => {
    if (choice === 'claim') {
      userSay('Claim a new HandyCall number');
      await goTo('phone_claim');
    } else if (choice === 'forward') {
      userSay('Forward my existing number');
      await goTo('phone_forward');
    } else {
      userSay('Use a demo number for testing');
      setIsSaving(true);
      try {
        const res = await apiClient.claimDemoPhoneNumber();
        await refreshCompanyNumber();
        await refreshAll();
        const num = res?.phoneNumber ?? res?.phone_number ?? res?.data?.phoneNumber ?? '';
        userSay(`Demo number assigned${num ? `: ${num}` : ''}`);
        await goTo('knowledge_chat');
      } catch (err: any) {
        setErrMsg(err?.message || 'Could not assign demo number.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleSearchNumbers = async () => {
    setSearchingNums(true);
    setAvailableNumbers([]);
    setErrMsg(null);
    try {
      const results = await apiClient.getAvailablePhoneNumbers({
        areaCode: areaCode.trim() || undefined,
        contains: numberSearch.trim() || undefined,
        maxResults: 8,
      });
      setAvailableNumbers(results || []);
      if (!results?.length) setErrMsg('No numbers found. Try a different area code.');
    } catch {
      setErrMsg('Search failed. Try again.');
    } finally {
      setSearchingNums(false);
    }
  };

  const handleClaimNumber = async (phoneNumber: string) => {
    setIsSaving(true);
    try {
      await apiClient.claimPhoneNumber(phoneNumber, 'HandyCall onboarding');
      await refreshCompanyNumber();
      await refreshAll();
      userSay(`Claimed ${phoneNumber}`);
      await goTo('knowledge_chat');
    } catch (err: any) {
      setErrMsg(err?.message || 'Could not claim number. Try another.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveForwarding = async () => {
    if (!forwardNumber.trim()) {
      setErrMsg('Enter your current business number.');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await apiClient.updateMyCompany({ phone_number: forwardNumber.trim() });
      setCompany(updated);
      userSay(`Saved: ${forwardNumber.trim()}`);
      await goTo('knowledge_chat');
    } catch {
      setErrMsg('Could not save number.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateKnowledge = async () => {
    setKbGenerating(true);
    setKbError(null);
    const draft = kbInput.trim();
    if (!draft) {
      setKbError('Add some business details first so we can build your knowledge base.');
      setKbGenerating(false);
      return;
    }
    const msgs = [{ role: 'user' as const, content: draft }];
    try {
      const [kbRes, prodRes] = await Promise.all([
        apiClient.knowledgeAssistantGenerate(msgs, true),
        apiClient
          .knowledgeExtractProducts(msgs)
          .catch(() => ({ created_count: 0, skipped_count: 0 })),
      ]);
      const created = Number(kbRes?.created_count || 0);
      await refreshKnowledge();
      await refreshAll();
      userSay(`Knowledge base generated: ${created} entries created`);
      await goTo('call_flow_editor');
    } catch (err: any) {
      setKbError(err?.message || 'Could not generate knowledge base. Try again.');
    } finally {
      setKbGenerating(false);
    }
  };

  const handleSaveCallFlow = async () => {
    const normalized = sanitizeCallFlowQuestions(callFlowQuestions);
    if (normalized.length === 0) {
      setErrMsg('Keep at least one question before continuing.');
      return;
    }
    setIsSaving(true);
    try {
      await apiClient.updateMyCompany({
        call_flow_questions: normalized.map((question) => ({
          id: question.id,
          field_key: question.field_key,
          label: question.label,
          prompt: question.prompt,
          helper_text: question.helper_text,
          required: true,
          enabled: true,
          order: question.order,
        })),
      });
      await refreshAll();
      userSay(`Saved ${normalized.length} intake question${normalized.length === 1 ? '' : 's'}`);
      await goTo('billing_payment_mode');
    } catch (err: any) {
      setErrMsg(err?.message || 'Could not save your AI call flow.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePlanSelect = async (plan: SubscriptionPlan) => {
    const effectiveMode =
      selectedPaymentMode ||
      ((company as any)?.booking_payment_mode as 'HANDYCALL_MANAGED' | 'SELF_MANAGED' | undefined);

    if (effectiveMode === 'HANDYCALL_MANAGED' && !isConnectReady()) {
      setErrMsg('Connect your bank account before starting your subscription.');
      await goTo('billing_connect');
      return;
    }

    setSelectedPlan(plan);
    userSay(`${PLAN_CATALOG[plan].name} — $${PLAN_CATALOG[plan].price}/month`);
    setIsSaving(true);
    setErrMsg(null);
    try {
      const { client_secret } = await apiClient.createSetupIntent();
      setSetupClientSecret(client_secret);
      await goTo('billing_payment');
    } catch (err: any) {
      setErrMsg(err?.message || 'Could not initialize payment. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBillingSuccess = async () => {
    await refreshAll();
    await goTo('complete');
  };

  const handleContinueAfterConnect = async () => {
    const latest = await refreshConnectStatus();
    if (!isConnectReady(latest)) {
      setErrMsg('Finish Stripe onboarding first, then come back here and continue.');
      return;
    }
    await continueAfterConnect();
  };

  const handlePaymentModeChoice = async (mode: 'HANDYCALL_MANAGED' | 'SELF_MANAGED') => {
    setPaymentModeSaving(true);
    setErrMsg(null);
    try {
      setSelectedPaymentMode(mode);
      await apiClient.updateMyCompany({
        booking_payment_mode: mode,
        booking_payment_enabled: mode === 'HANDYCALL_MANAGED',
        booking_payment_mode_confirmed: true,
      });
      await refreshAll();

      if (mode === 'SELF_MANAGED') {
        userSay('I handle payments myself');
        if (hasActiveBilling()) {
          await goTo('complete');
        } else {
          await goTo('billing_plan');
        }
      } else {
        userSay('Managed in HandyCall');
        await goTo('billing_connect');
        await refreshConnectStatus();
      }
    } catch (err: any) {
      setErrMsg(err?.message || 'Could not save payment mode.');
    } finally {
      setPaymentModeSaving(false);
    }
  };

  const handleStartConnectOnboarding = async () => {
    setConnectBusy(true);
    setErrMsg(null);
    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
      const link = await apiClient.setupConnectAccount({
        return_url: `${origin}/onboarding/setup?payments=connect&state=return`,
        refresh_url: `${origin}/onboarding/setup?payments=connect&state=refresh`,
      });
      if (!link?.url) {
        throw new Error('Stripe Connect onboarding URL was not returned.');
      }
      window.location.href = link.url;
    } catch (err: any) {
      const msg = err?.message || 'Could not start Stripe Connect onboarding.';
      setErrMsg(msg);
      // Fall back to manual phase so user can retry or skip
      await goTo('billing_connect');
    } finally {
      setConnectBusy(false);
    }
  };

  useEffect(() => {
    if (phase !== 'billing_connect') return;
    void refreshConnectStatus();
  }, [phase, refreshConnectStatus]);

  // ─── Step content renderer ─────────────────────────────────────────────────

  const renderStepContent = () => {
    switch (phase) {
      case 'loading':
        return null;

      case 'profile_name':
        return (
          <div className="space-y-4">
            <input
              autoFocus
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleProfileName()}
              placeholder="e.g. Alex Johnson"
              disabled={isSaving}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            />
            <PrimaryButton
              onClick={handleProfileName}
              disabled={!nameInput.trim() || isSaving}
              loading={isSaving}
            >
              Continue
              <IconArrowRight className="h-4 w-4" stroke={2} />
            </PrimaryButton>
          </div>
        );

      case 'company_name':
        return (
          <div className="space-y-4">
            <input
              autoFocus
              type="text"
              value={companyInput}
              onChange={(e) => setCompanyInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && companyInput.trim() && void handleCompanyName()
              }
              placeholder="e.g. Apex Plumbing & Heating"
              disabled={isSaving}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            />
            <PrimaryButton
              onClick={handleCompanyName}
              disabled={!companyInput.trim() || isSaving}
              loading={isSaving}
            >
              Continue
              <IconArrowRight className="h-4 w-4" stroke={2} />
            </PrimaryButton>
          </div>
        );

      case 'service_type':
        return (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              {COMPANY_TEMPLATE_OPTIONS.map((option) => (
                <button
                  key={option.serviceType}
                  type="button"
                  onClick={() => void handleServiceType(option.serviceType, option.title)}
                  disabled={isSaving}
                  className="rounded-2xl border border-border bg-card p-4 text-left transition hover:border-emerald-400/60 hover:bg-accent/60 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                        {option.category}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-foreground">
                        {option.title}
                      </h3>
                    </div>
                    <IconArrowRight className="h-5 w-5 flex-shrink-0 text-muted-foreground/40" stroke={1.5} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{option.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {option.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-dashed border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Need something custom?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick the closest template. You can edit every intake question and its order in the
                next step.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SERVICE_TYPE_OPTIONS.filter((opt) => (opt.value as string) === 'OTHER').map(
                  (opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setShowOtherInput(true);
                        setOtherServiceInput('');
                      }}
                      disabled={isSaving || showOtherInput}
                      className="rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-emerald-400/60 hover:bg-accent disabled:opacity-50"
                    >
                      {opt.label}
                    </button>
                  )
                )}
              </div>
            </div>
            {showOtherInput && (
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={otherServiceInput}
                  onChange={(e) => setOtherServiceInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    otherServiceInput.trim() &&
                    void handleServiceType('OTHER', otherServiceInput.trim())
                  }
                  placeholder="e.g. Septic tank cleaning, foundation repair..."
                  disabled={isSaving}
                  className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />
                <PrimaryButton
                  onClick={() => void handleServiceType('OTHER', otherServiceInput.trim())}
                  disabled={!otherServiceInput.trim() || isSaving}
                  loading={isSaving}
                >
                  <IconSend className="h-4 w-4" stroke={1.5} />
                </PrimaryButton>
              </div>
            )}
          </div>
        );

      case 'timezone':
        return (
          <div className="flex flex-wrap gap-2">
            {TIMEZONE_OPTIONS.map((tz) => (
              <button
                key={tz.value}
                type="button"
                onClick={() => void handleTimezone(tz.value, tz.label)}
                disabled={isSaving}
                className="rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-emerald-400/60 hover:bg-accent disabled:opacity-50"
              >
                {tz.label}
              </button>
            ))}
          </div>
        );

      case 'service_area_choice':
        return (
          <div className="space-y-3">
            <OptionCard
              onClick={handleServiceAreaAll}
              disabled={isSaving}
              icon={<IconGlobe className="h-5 w-5" stroke={1.5} />}
              label="Serve all areas"
              description="No location restrictions — accept bookings from anywhere."
            />
            <OptionCard
              onClick={handleServiceAreaSpecific}
              disabled={isSaving}
              icon={<IconMapPin className="h-5 w-5" stroke={1.5} />}
              label="Specific ZIP codes"
              description="Only accept bookings from callers in your service area."
            />
          </div>
        );

      case 'service_area_input':
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">
                Add the ZIP codes you actually serve
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                HandyCall uses this to qualify calls before booking, so keep it limited to the
                areas you want appointments from.
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                ZIP codes
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={zipInput}
                  onChange={(e) => setZipInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addZip();
                      e.preventDefault();
                    }
                  }}
                  placeholder="e.g. 77002"
                  maxLength={5}
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <GhostButton onClick={addZip}>Add</GhostButton>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {zipCodes.map((z) => (
                  <span
                    key={z}
                    className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  >
                    {z}
                    <button
                      type="button"
                      onClick={() => setZipCodes((p) => p.filter((x) => x !== z))}
                      className="text-emerald-600 hover:text-red-500"
                    >
                      <IconX className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <PrimaryButton
              onClick={handleSaveServiceArea}
              disabled={isSaving || zipCodes.length === 0}
              loading={isSaving}
            >
              <IconCheck className="h-4 w-4" stroke={2} />
              Save service area
            </PrimaryButton>
          </div>
        );

      case 'calendar_mode':
        return (
          <div className="space-y-3">
            <OptionCard
              onClick={() => void handleCalendarMode('INTERNAL')}
              disabled={isSaving}
              icon={<IconCalendar className="h-5 w-5" stroke={1.5} />}
              label="Use HandyCall Calendar"
              description="Built-in scheduling — no setup needed. HandyCall manages your availability."
            />
            <OptionCard
              onClick={() => void handleCalendarMode('EXTERNAL')}
              disabled={isSaving}
              icon={<IconCalendar className="h-5 w-5" stroke={1.5} />}
              label="Connect my existing calendar"
              description="Sync with Google, Outlook, or Apple Calendar for two-way appointment management."
            />
          </div>
        );

      case 'calendar_hours':
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              {WEEKDAYS.map((day) => {
                const row = calendarHours[day.key] ?? {
                  closed: true,
                  open: '09:00',
                  close: '17:00',
                };
                return (
                  <div
                    key={day.key}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
                  >
                    <span className="w-8 text-xs font-bold text-muted-foreground">{day.label}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarHours((prev) => ({
                          ...prev,
                          [day.key]: { ...row, closed: !row.closed },
                        }))
                      }
                      className={cn(
                        'rounded-lg px-2.5 py-0.5 text-xs font-semibold transition',
                        row.closed
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      )}
                    >
                      {row.closed ? 'Closed' : 'Open'}
                    </button>
                    {!row.closed && (
                      <>
                        <input
                          type="time"
                          value={row.open}
                          onChange={(e) =>
                            setCalendarHours((prev) => ({
                              ...prev,
                              [day.key]: { ...row, open: e.target.value },
                            }))
                          }
                          className="rounded-lg border border-border bg-background px-2 py-0.5 text-xs text-foreground"
                        />
                        <span className="text-xs text-muted-foreground">-</span>
                        <input
                          type="time"
                          value={row.close}
                          onChange={(e) =>
                            setCalendarHours((prev) => ({
                              ...prev,
                              [day.key]: { ...row, close: e.target.value },
                            }))
                          }
                          className="rounded-lg border border-border bg-background px-2 py-0.5 text-xs text-foreground"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <PrimaryButton
              onClick={handleSaveCalendarHours}
              disabled={isSaving}
              loading={isSaving}
            >
              <IconCheck className="h-4 w-4" stroke={2} />
              Save hours & continue
            </PrimaryButton>
          </div>
        );

      case 'calendar_provider':
        return (
          <div className="space-y-3">
            {[
              {
                id: 'GOOGLE',
                label: 'Google Calendar',
                description: 'Sync appointments with your Google account.',
                icon: <IconBrandGoogle className="h-5 w-5" stroke={1.5} />,
              },
              {
                id: 'MICROSOFT',
                label: 'Outlook / Microsoft 365',
                description: 'Connect your Microsoft calendar for two-way sync.',
                icon: <IconBrandWindows className="h-5 w-5" stroke={1.5} />,
              },
              {
                id: 'APPLE',
                label: 'Apple iCloud',
                description: 'Use an app-specific password to connect iCloud Calendar.',
                icon: <IconBrandApple className="h-5 w-5" stroke={1.5} />,
              },
            ].map((opt) => (
              <OptionCard
                key={opt.id}
                onClick={() =>
                  void handleCalendarProvider(opt.id as 'GOOGLE' | 'MICROSOFT' | 'APPLE')
                }
                disabled={isSaving}
                icon={opt.icon}
                label={opt.label}
                description={opt.description}
              />
            ))}
          </div>
        );

      case 'calendar_apple':
        return (
          <div className="space-y-3">
            <input
              type="email"
              value={appleEmail}
              onChange={(e) => setAppleEmail(e.target.value)}
              placeholder="Apple ID email"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <input
              type="password"
              value={applePass}
              onChange={(e) => setApplePass(e.target.value)}
              placeholder="App-specific password"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <a
              href="https://support.apple.com/en-us/102654"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-emerald-600 hover:underline dark:text-emerald-400"
            >
              How to generate an app-specific password
            </a>
            <PrimaryButton
              onClick={handleConnectApple}
              disabled={isSaving || !appleEmail || !applePass}
              loading={isSaving}
            >
              <IconCheck className="h-4 w-4" stroke={2} />
              Connect Apple Calendar
            </PrimaryButton>
          </div>
        );

      case 'phone_choice':
        return (
          <div className="space-y-3">
            <OptionCard
              onClick={() => void handlePhoneChoice('claim')}
              disabled={isSaving}
              icon={<IconPhone className="h-5 w-5" stroke={1.5} />}
              label="Claim a new HandyCall number"
              description="Get a dedicated local number that your AI receptionist answers."
              recommended
            />
            <OptionCard
              onClick={() => void handlePhoneChoice('forward')}
              disabled={isSaving}
              icon={<IconPhone className="h-5 w-5" stroke={1.5} />}
              label="Forward my existing number"
              description="Keep your current number and route calls through HandyCall."
            />
            <OptionCard
              onClick={() => void handlePhoneChoice('demo')}
              disabled={isSaving}
              icon={<IconPhone className="h-5 w-5" stroke={1.5} />}
              label="Use a demo number for testing"
              description="Try out HandyCall before committing to a phone number."
            />
          </div>
        );

      case 'phone_claim':
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                placeholder="Area code"
                maxLength={3}
                className="w-24 rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <input
                type="text"
                value={numberSearch}
                onChange={(e) => setNumberSearch(e.target.value)}
                placeholder="Contains (optional)"
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="button"
                onClick={() => void handleSearchNumbers()}
                disabled={searchingNums || isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent disabled:opacity-50"
              >
                {searchingNums ? (
                  <IconLoader2 className="h-4 w-4 animate-spin" stroke={1.5} />
                ) : (
                  'Search'
                )}
              </button>
            </div>
            {availableNumbers.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {availableNumbers.map((num) => (
                  <button
                    type="button"
                    key={num.phoneNumber}
                    onClick={() => void handleClaimNumber(num.phoneNumber)}
                    disabled={isSaving}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5 text-sm transition hover:border-emerald-400/60 hover:bg-accent/60 disabled:opacity-50"
                  >
                    <span className="font-semibold text-foreground">{num.phoneNumber}</span>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Claim
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'phone_forward':
        return (
          <div className="space-y-4">
            <input
              autoFocus
              type="tel"
              value={forwardNumber}
              onChange={(e) => setForwardNumber(e.target.value)}
              placeholder="+15551234567"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <PrimaryButton
              onClick={handleSaveForwarding}
              disabled={isSaving || !forwardNumber.trim()}
              loading={isSaving}
            >
              <IconCheck className="h-4 w-4" stroke={2} />
              Save number
            </PrimaryButton>
          </div>
        );

      case 'knowledge_intro':
      case 'knowledge_chat':
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <p className="text-sm font-semibold text-foreground">What to include here</p>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                Put in the business-specific answers customers ask before they book: services,
                pricing rules, what is included, service area details, deposits, cancellation
                policy, warranties, timing expectations, and anything else your receptionist should
                answer consistently.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {getKnowledgeBasePromptSuggestions(
                  (company?.service_type as ServiceType | undefined) || undefined
                ).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setKbInput((prev) => (prev ? `${prev}\n- ${item}` : item))}
                    className="rounded-full border border-emerald-200 bg-card px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800/50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <textarea
                value={kbInput}
                onChange={(e) => setKbInput(e.target.value)}
                placeholder="Example: We offer one-time and monthly pest plans. Our one-time treatment starts at $149. Monthly plans start at $39/month. We service Fulshear, Katy, and Richmond. Customers often ask if pets need to stay outside during treatment..."
                rows={5}
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {kbError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                  {kbError}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <PrimaryButton
                  onClick={() => void handleGenerateKnowledge()}
                  disabled={kbGenerating || !kbInput.trim()}
                  loading={kbGenerating}
                >
                  <IconBrain className="h-4 w-4" stroke={1.5} />
                  {kbGenerating ? 'Building knowledge base...' : 'Build knowledge base'}
                </PrimaryButton>
              </div>
            </div>
          </div>
        );

      case 'call_flow_editor':
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-foreground">
                Control the questions your AI asks before scheduling
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Reword the questions, remove anything unnecessary, add your own, and set the order.
                The scheduling question stays automatic and always comes last.
              </p>
            </div>
            <CallFlowEditor questions={callFlowQuestions} onChange={setCallFlowQuestions} />
            <PrimaryButton
              onClick={handleSaveCallFlow}
              disabled={isSaving}
              loading={isSaving}
            >
              <IconCheck className="h-4 w-4" stroke={1.5} />
              Save call flow
            </PrimaryButton>
          </div>
        );

      case 'billing_payment_mode':
        return (
          <div className="space-y-3">
            <OptionCard
              onClick={() => void handlePaymentModeChoice('HANDYCALL_MANAGED')}
              disabled={paymentModeSaving}
              icon={<IconCreditCard className="h-5 w-5" stroke={1.5} />}
              label="Managed by HandyCall"
              description="HandyCall collects payments from customers and deposits them to your bank account."
              recommended
            />
            <OptionCard
              onClick={() => void handlePaymentModeChoice('SELF_MANAGED')}
              disabled={paymentModeSaving}
              icon={<IconUser className="h-5 w-5" stroke={1.5} />}
              label="I handle payments myself"
              description="HandyCall books the appointment only — you handle payment outside the platform."
            />
          </div>
        );

      case 'billing_plan':
        return (
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(PLAN_CATALOG).map(([plan, details]) => {
              const planKey = plan as SubscriptionPlan;
              const price = getPlanPriceDisplay(planKey);
              const isPopular = details.name === 'Pro';
              return (
                <button
                  type="button"
                  key={plan}
                  onClick={() => void handlePlanSelect(planKey)}
                  disabled={isSaving}
                  className={cn(
                    'relative flex flex-col rounded-2xl border p-5 text-left transition hover:shadow-sm disabled:opacity-50',
                    isPopular
                      ? 'border-emerald-500 bg-emerald-50/50 hover:border-emerald-600 dark:bg-emerald-950/20'
                      : 'border-border bg-card hover:border-emerald-400/60 hover:bg-accent/40'
                  )}
                >
                  {isPopular && (
                    <span className="absolute right-3 top-3 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Popular
                    </span>
                  )}
                  <p className="text-sm font-bold text-foreground">{details.name}</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {price.current}
                    <span className="text-xs font-normal text-muted-foreground">
                      {' '}
                      /{price.cadence.replace('per ', '')}
                    </span>
                  </p>
                  {details.badge && (
                    <p className="mt-2 text-xs text-muted-foreground">{details.badge}</p>
                  )}
                  {details.trialLabel && (
                    <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {details.trialLabel}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Select plan
                    <IconArrowRight className="h-3 w-3" stroke={2} />
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 'billing_payment':
        return stripePromise && setupClientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret: setupClientSecret }}>
            <StripePaymentForm selectedPlan={selectedPlan} onSuccess={handleBillingSuccess} />
          </Elements>
        ) : (
          <p className="text-sm text-red-600 dark:text-red-400">
            {!stripePromise
              ? 'Payment provider not configured. Contact support.'
              : 'Initializing payment form...'}
          </p>
        );

      case 'billing_connect':
        return (
          <div className="space-y-4">
            {connectBusy ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
                <IconLoader2 className="h-8 w-8 animate-spin text-emerald-600 dark:text-emerald-400" stroke={1.5} />
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  Opening Stripe&hellip;
                </p>
                <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">
                  You&apos;ll be redirected to Stripe to connect your bank account. Please wait.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-4 text-sm text-foreground">
                {isConnectReady() ? (
                  <>
                    <p className="font-medium text-emerald-700 dark:text-emerald-300">
                      Bank account connected.
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Stripe is linked and HandyCall can send payouts to your connected account.
                    </p>
                  </>
                ) : connectStatus?.connected ? (
                  <>
                    <p className="font-medium">Stripe account linked.</p>
                    <p className="mt-1 text-muted-foreground">
                      Finish the remaining Stripe onboarding details, then come back and continue.
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Connect account not linked yet.</p>
                )}
                {connectStatus?.account_id && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Account: {connectStatus.account_id}
                  </p>
                )}
                {connectStatus?.connected && !isConnectReady() && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Stripe still needs a bit more information before charges can be enabled.
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {isConnectReady() ? (
                <PrimaryButton
                  onClick={handleContinueAfterConnect}
                  disabled={connectBusy || connectChecking}
                  loading={connectChecking}
                >
                  <IconArrowRight className="h-4 w-4" stroke={1.5} />
                  Continue
                </PrimaryButton>
              ) : null}
              <PrimaryButton
                onClick={handleStartConnectOnboarding}
                disabled={connectBusy || connectChecking}
                loading={connectBusy}
              >
                <IconCreditCard className="h-4 w-4" stroke={1.5} />
                {connectStatus?.connected ? 'Finish in Stripe' : 'Connect bank account (Stripe)'}
              </PrimaryButton>
              <GhostButton
                onClick={() => void refreshConnectStatus()}
                disabled={connectBusy || connectChecking}
              >
                {connectChecking ? 'Checking...' : 'Check connection status'}
              </GhostButton>
              <GhostButton onClick={() => void handlePaymentModeChoice('SELF_MANAGED')}>
                Skip and handle payments myself
              </GhostButton>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <IconCheck className="h-10 w-10 text-emerald-600 dark:text-emerald-400" stroke={2} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Your AI is ready!</h1>
            <p className="mt-3 max-w-md text-lg text-muted-foreground">
              One last step — complete your marketplace profile so customers can find and book you.
            </p>
            <PrimaryButton
              onClick={() => router.replace('/onboarding/marketplace-profile')}
              className="mt-8 px-8 py-3"
            >
              Set up marketplace profile
              <IconArrowRight className="h-4 w-4" stroke={2} />
            </PrimaryButton>
            <button
              onClick={() => router.replace('/dashboard')}
              className="mt-3 text-sm text-muted-foreground underline hover:text-foreground"
            >
              Skip for now, go to dashboard
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loading && phase === 'loading') {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-sm text-muted-foreground">Preparing your setup...</p>
        </div>
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-border bg-card/50 lg:flex">
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Setup steps
          </p>
          <div className="space-y-1">
            {STEP_GROUPS.map((sg) => {
              const groupNum = PHASE_TO_GROUP[phase] || 0;
              const isComplete = groupNum > sg.group;
              const isActive = groupNum === sg.group;
              return (
                <div
                  key={sg.group}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                    isActive &&
                      'bg-emerald-50/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
                    isComplete && 'text-foreground',
                    !isActive && !isComplete && 'text-muted-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      isActive && 'bg-emerald-600 text-white',
                      isComplete &&
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
                      !isActive && !isComplete && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isComplete ? (
                      <IconCheck className="h-3.5 w-3.5" stroke={2.5} />
                    ) : (
                      sg.group
                    )}
                  </div>
                  <span className={cn('font-medium', isActive && 'font-semibold')}>
                    {sg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="border-t border-border p-4">
          <p className="text-xs text-muted-foreground">
            Need help?{' '}
            <a
              href="mailto:support@handycall.org"
              className="text-emerald-600 hover:underline dark:text-emerald-400"
            >
              support@handycall.org
            </a>
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {/* Mobile step indicator */}
        <div className="border-b border-border bg-card/50 px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Step {Math.min(PHASE_TO_GROUP[phase] || 1, 8)} of 8
            </p>
            <p className="text-sm text-muted-foreground">
              {STEP_GROUPS[Math.min((PHASE_TO_GROUP[phase] || 1), 8) - 1]?.label}
            </p>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${((Math.min(PHASE_TO_GROUP[phase] || 1, 8) - 1) / 8) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="mx-auto max-w-2xl px-6 py-10 sm:px-8">
          {/* Step header */}
          {phase !== 'loading' && phase !== 'complete' && (
            <div className="mb-8">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Step {Math.min(PHASE_TO_GROUP[phase] || 1, 8)} of 8
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {getStepMeta(phase).title}
              </h1>
              {getStepMeta(phase).description && (
                <p className="mt-2 text-base text-muted-foreground">
                  {getStepMeta(phase).description}
                </p>
              )}
            </div>
          )}

          {/* Error message */}
          {errMsg && phase !== 'loading' && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              <IconX className="mt-0.5 h-4 w-4 flex-shrink-0" stroke={1.5} />
              {errMsg}
            </div>
          )}

          {/* Step content */}
          {renderStepContent()}

          <div ref={chatEndRef} />
        </div>
      </div>
    </div>
  );
}

export default function OnboardingSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading setup...</p>
          </div>
        </div>
      }
    >
      <OnboardingSetupContent />
    </Suspense>
  );
}
