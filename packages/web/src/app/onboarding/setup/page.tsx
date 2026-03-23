'use client';

import {
  Suspense,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import {
  IconArrowRight,
  IconBrain,
  IconBrandApple,
  IconBrandGoogle,
  IconBrandWindows,
  IconCalendar,
  IconCheck,
  IconChevronRight,
  IconCreditCard,
  IconLoader2,
  IconMapPin,
  IconPhone,
  IconSparkles,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { useOnboarding } from '@/components/onboarding/onboarding-context';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import {
  createDefaultCallFlowQuestions,
  getKnowledgeBasePromptSuggestions,
} from '@/constants/company-templates';
import { TIMEZONE_OPTIONS, DEFAULT_TIMEZONE } from '@/constants/timezones';
import { PLAN_CATALOG, getPlanPriceDisplay, normalizePlan } from '@/constants/plans';
import { SAUDI_CITIES } from '@/constants/saudi-marketplace';
import { MARKETPLACE_SERVICE_CATEGORIES } from '@/constants/marketplace-service-categories';
import { CompanyCallFlowQuestion, ServiceType, SubscriptionPlan } from '@handycall/shared';
import { CallFlowEditor } from '@/components/company/call-flow-editor';
import { cn } from '@/lib/utils';

type Phase =
  | 'loading'
  | 'plan_selection'
  | 'profile_name'
  | 'company_name'
  | 'service_type'
  | 'timezone'
  | 'marketplace_profile_intro'
  | 'calendar_mode'
  | 'calendar_hours'
  | 'calendar_provider'
  | 'calendar_apple'
  | 'phone_choice'
  | 'phone_forward'
  | 'knowledge_chat'
  | 'call_flow_editor'
  | 'billing_payment_mode'
  | 'billing_plan'
  | 'billing_payment'
  | 'billing_connect'
  | 'starter_activation'
  | 'complete';

type DayRow = { closed: boolean; open: string; close: string };
type CalendarHours = Record<string, DayRow>;

const PLAN_DRAFT_STORAGE_KEY = 'handycall-onboarding-tier';

const WEEKDAYS = [
  { key: 'SUN', label: 'Sun' },
  { key: 'MON', label: 'Mon' },
  { key: 'TUE', label: 'Tue' },
  { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' },
  { key: 'FRI', label: 'Fri' },
  { key: 'SAT', label: 'Sat' },
];

function defaultHours(): CalendarHours {
  return Object.fromEntries(
    WEEKDAYS.map((day) => [
      day.key,
      {
        closed: day.key === 'FRI' || day.key === 'SAT',
        open: '09:00',
        close: '18:00',
      },
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

function normalizeHours(source: any): CalendarHours {
  const base = defaultHours();
  if (!source || typeof source !== 'object') return base;

  const aliases: Record<string, string[]> = {
    SUN: ['SUN', 'sunday'],
    MON: ['MON', 'monday'],
    TUE: ['TUE', 'tuesday'],
    WED: ['WED', 'wednesday'],
    THU: ['THU', 'thursday'],
    FRI: ['FRI', 'friday'],
    SAT: ['SAT', 'saturday'],
  };

  for (const [key, names] of Object.entries(aliases)) {
    const raw = names.map((name) => source[name]).find(Boolean);
    if (raw && !raw.closed && raw.open) {
      base[key] = { closed: false, open: raw.open, close: raw.close || '18:00' };
    }
  }
  return base;
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

function isPaidTier(plan: SubscriptionPlan | null | undefined) {
  return plan === SubscriptionPlan.PRO || plan === SubscriptionPlan.MAX;
}

function getSetupGroups(plan: SubscriptionPlan | null | undefined) {
  if (plan === SubscriptionPlan.STARTER) {
    return [
      { group: 1, label: 'Choose tier' },
      { group: 2, label: 'Business basics' },
      { group: 3, label: 'Marketplace profile' },
      { group: 4, label: 'Launch listing' },
    ];
  }

  return [
    { group: 1, label: 'Choose tier' },
    { group: 2, label: 'Business basics' },
    { group: 3, label: 'Marketplace profile' },
    { group: 4, label: 'AI calling setup' },
    { group: 5, label: 'Billing & launch' },
  ];
}

function getPhaseGroup(phase: Phase, plan: SubscriptionPlan | null | undefined) {
  switch (phase) {
    case 'loading':
      return 0;
    case 'plan_selection':
      return 1;
    case 'profile_name':
    case 'company_name':
    case 'service_type':
    case 'timezone':
      return 2;
    case 'marketplace_profile_intro':
      return 3;
    case 'starter_activation':
      return 4;
    case 'calendar_mode':
    case 'calendar_hours':
    case 'calendar_provider':
    case 'calendar_apple':
    case 'phone_choice':
    case 'phone_forward':
    case 'knowledge_chat':
    case 'call_flow_editor':
    case 'billing_payment_mode':
      return plan === SubscriptionPlan.STARTER ? 4 : 4;
    case 'billing_plan':
    case 'billing_payment':
    case 'billing_connect':
      return plan === SubscriptionPlan.STARTER ? 4 : 5;
    case 'complete':
      return getSetupGroups(plan).length + 1;
    default:
      return 0;
  }
}

function getStepMeta(
  phase: Phase,
  plan: SubscriptionPlan | null | undefined
): { title: string; description: string } {
  switch (phase) {
    case 'plan_selection':
      return {
        title: 'Choose how you want to grow on HandyCall',
        description:
          'Starter is marketplace-only. Pro and Max add AI calling, automation, and payment setup.',
      };
    case 'profile_name':
      return {
        title: "What's your name?",
        description: "We'll use this to personalize your HandyCall workspace.",
      };
    case 'company_name':
      return {
        title: "What's your business name?",
        description: 'This appears on your marketplace profile and customer-facing booking pages.',
      };
    case 'service_type':
      return {
        title: 'Which main category fits your business best?',
        description:
          'Choose the broad category now. On the next setup step, you will list the exact services customers can search for inside that category.',
      };
    case 'timezone':
      return {
        title: 'Which timezone should we use?',
        description: 'Used for business hours, availability, reminders, and lead timestamps.',
      };
    case 'marketplace_profile_intro':
      return {
        title: 'Build your marketplace profile first',
        description:
          'Customers will see this before they inquire. Add your cities, services, pricing cues, and trust signals now.',
      };
    case 'calendar_mode':
      return {
        title: 'How should the AI handle availability?',
        description:
          'For Pro and Max, the AI receptionist needs live availability before it can book qualified leads.',
      };
    case 'calendar_hours':
      return {
        title: 'Set your working hours',
        description:
          'We default to the Saudi work week. Customers will only be offered times inside these hours.',
      };
    case 'calendar_provider':
      return {
        title: 'Connect your calendar',
        description: 'Sync with Google, Microsoft, or Apple so the AI books around your real schedule.',
      };
    case 'calendar_apple':
      return {
        title: 'Connect Apple Calendar',
        description: 'Use an app-specific password from your Apple ID settings.',
      };
    case 'phone_choice':
      return {
        title: 'How should calls reach your AI receptionist?',
        description:
          'You can forward your existing Saudi business number or use a temporary HandyCall number while you test.',
      };
    case 'phone_forward':
      return {
        title: 'Enter the number you already use',
        description: 'Customers keep calling the same number while HandyCall handles the first touch.',
      };
    case 'knowledge_chat':
      return {
        title: 'Teach the AI how your business works',
        description:
          'Add service details, pricing expectations, what is included, and the policies your team repeats every day.',
      };
    case 'call_flow_editor':
      return {
        title: 'Shape the intake questions your AI will ask',
        description:
          'Keep the questions tight and relevant so customers qualify quickly before booking or payment.',
      };
    case 'billing_payment_mode':
      return {
        title: 'How should customer payments work?',
        description:
          'Pro and Max can either collect payments inside HandyCall or let your team handle payment offline.',
      };
    case 'billing_plan':
      return {
        title: 'Review your final tier',
        description:
          plan === SubscriptionPlan.STARTER
            ? 'Starter is free to activate. You only pay when you unlock a lead.'
            : 'Billing happens at the end of setup, after your marketplace and AI flows are ready.',
      };
    case 'billing_payment':
      return {
        title: 'Add a payment method',
        description: "Your paid plan won't start charging until onboarding is complete.",
      };
    case 'billing_connect':
      return {
        title: 'Connect your payout account',
        description:
          'HandyCall uses Stripe to deposit customer payments to your business bank account.',
      };
    case 'starter_activation':
      return {
        title: 'Activate your free Starter listing',
        description:
          'You will appear in search, receive lead requests, and pay only when you unlock the customer contact details.',
      };
    case 'complete':
      return {
        title: 'You are ready to launch',
        description:
          plan === SubscriptionPlan.STARTER
            ? 'Your marketplace profile is live and ready for customer inquiries.'
            : 'Your marketplace profile, AI calling, and billing setup are all ready to go.',
      };
    default:
      return { title: 'Preparing setup...', description: '' };
  }
}

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
  children: ReactNode;
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
  children: ReactNode;
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
  icon?: ReactNode;
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
      {recommended ? (
        <span className="absolute right-3 top-3 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          Recommended
        </span>
      ) : null}
      <div className="flex items-start gap-3">
        {icon ? (
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
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{label}</p>
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <IconChevronRight
          className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
          stroke={1.5}
        />
      </div>
    </button>
  );
}

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
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
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {done ? (
        <p className="text-sm font-medium text-emerald-600">Subscription activated!</p>
      ) : null}
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

function OnboardingSetupContent() {
  const { loading, company, status, refreshAll, refreshKnowledge, refreshCompanyNumber } =
    useOnboarding();
  const { setCompany } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialized = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>('loading');
  const [isSaving, setIsSaving] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [calendarHours, setCalendarHours] = useState<CalendarHours>(defaultHours());
  const [calendarTimezone, setCalendarTimezone] = useState(DEFAULT_TIMEZONE);
  const [appleEmail, setAppleEmail] = useState('');
  const [applePass, setApplePass] = useState('');
  const [forwardNumber, setForwardNumber] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherServiceInput, setOtherServiceInput] = useState('');
  const [callFlowQuestions, setCallFlowQuestions] = useState<CompanyCallFlowQuestion[]>([]);
  const [kbInput, setKbInput] = useState('');
  const [kbGenerating, setKbGenerating] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
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

  const resolvedPlan =
    selectedPlan ?? normalizePlan(company?.subscription_plan as SubscriptionPlan | null | undefined) ?? null;
  const setupGroups = useMemo(() => getSetupGroups(resolvedPlan), [resolvedPlan]);
  const currentGroup = getPhaseGroup(phase, resolvedPlan);

  const goTo = useCallback((next: Phase) => {
    setErrMsg(null);
    setPhase(next);
  }, []);

  const clearPlanDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(PLAN_DRAFT_STORAGE_KEY);
  }, []);

  const persistPlanDraft = useCallback((plan: SubscriptionPlan | null) => {
    if (typeof window === 'undefined') return;
    if (!plan) {
      window.localStorage.removeItem(PLAN_DRAFT_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(PLAN_DRAFT_STORAGE_KEY, plan);
  }, []);

  const clearConnectQueryParams = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const hadConnectParams = url.searchParams.has('payments') || url.searchParams.has('state');
    if (!hadConnectParams) return;
    url.searchParams.delete('payments');
    url.searchParams.delete('state');
    url.searchParams.delete('marketplace');
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

  const refreshConnectStatus = useCallback(
    async (options?: { clearQuery?: boolean }) => {
      setConnectChecking(true);
      try {
        const latest = await apiClient.getConnectStatus();
        setConnectStatus(latest);
        if (options?.clearQuery) clearConnectQueryParams();
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

  const continueAfterConnect = useCallback(async () => {
    await refreshAll();
    if (hasActiveBilling()) {
      goTo('complete');
      return;
    }
    goTo('billing_plan');
  }, [goTo, hasActiveBilling, refreshAll]);

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

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: 0, behavior: 'auto' });
  }, [phase]);

  useEffect(() => {
    if (loading || initialized.current) return;
    initialized.current = true;

    const companyPlan = normalizePlan(company?.subscription_plan as SubscriptionPlan | null | undefined);
    if (companyPlan) {
      setSelectedPlan(companyPlan);
      clearPlanDraft();
    } else if (typeof window !== 'undefined') {
      const storedPlan = normalizePlan(window.localStorage.getItem(PLAN_DRAFT_STORAGE_KEY));
      if (storedPlan) setSelectedPlan(storedPlan);
    }

    if (company?.company_name) setCompanyInput(String(company.company_name));
    if (company?.timezone) setCalendarTimezone(String(company.timezone));
    if (company?.business_hours) setCalendarHours(normalizeHours(company.business_hours));
    if (company?.phone_number) setForwardNumber(String(company.phone_number));
    if ((company as any)?.booking_payment_mode) {
      setSelectedPaymentMode((company as any).booking_payment_mode);
    }
    if (Array.isArray((company as any)?.call_flow_questions) && (company as any).call_flow_questions.length > 0) {
      setCallFlowQuestions(normalizeCallFlowQuestions((company as any).call_flow_questions));
    } else if (company?.service_type) {
      setCallFlowQuestions(createDefaultCallFlowQuestions(company.service_type as ServiceType));
    }

    const companyMarketplaceProfile = (company as any)?.marketplace_profile;
    if (!status.knowledge && companyMarketplaceProfile?.bio) {
      const draft = [
        companyMarketplaceProfile.bio,
        Array.isArray(companyMarketplaceProfile.services_offered) &&
        companyMarketplaceProfile.services_offered.length > 0
          ? `Services offered: ${companyMarketplaceProfile.services_offered.join(', ')}`
          : null,
        Array.isArray(companyMarketplaceProfile.service_cities) &&
        companyMarketplaceProfile.service_cities.length > 0
          ? `Cities served: ${companyMarketplaceProfile.service_cities.join(', ')}`
          : null,
      ]
        .filter(Boolean)
        .join('\n');
      setKbInput(draft);
    }

    void (async () => {
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
        goTo('billing_connect');
        await refreshConnectStatus({ clearQuery: true });
        return;
      }

      if (!companyPlan && !normalizePlan(typeof window !== 'undefined' ? window.localStorage.getItem(PLAN_DRAFT_STORAGE_KEY) : null)) {
        goTo('plan_selection');
        return;
      }

      const effectivePlan =
        companyPlan ??
        normalizePlan(typeof window !== 'undefined' ? window.localStorage.getItem(PLAN_DRAFT_STORAGE_KEY) : null);

      if (!status.profile) {
        goTo('profile_name');
      } else if (!status.companyProfile) {
        goTo('company_name');
      } else if (!status.marketplaceProfile) {
        goTo('marketplace_profile_intro');
      } else if (effectivePlan === SubscriptionPlan.STARTER) {
        if (!status.billing) {
          goTo('starter_activation');
        } else {
          clearPlanDraft();
          goTo('complete');
        }
      } else if (!status.calendar) {
        goTo('calendar_mode');
      } else if (!status.phone) {
        goTo('phone_choice');
      } else if (!status.knowledge) {
        goTo('knowledge_chat');
      } else if (!(company as any)?.call_flow_questions?.length) {
        goTo('call_flow_editor');
      } else if (!(company as any)?.booking_payment_mode_confirmed) {
        goTo('billing_payment_mode');
      } else if (needsManagedConnect) {
        goTo('billing_connect');
        await refreshConnectStatus();
      } else if (!status.billing) {
        goTo('billing_plan');
      } else {
        clearPlanDraft();
        goTo('complete');
      }
    })();
  }, [
    clearPlanDraft,
    company,
    goTo,
    loading,
    refreshConnectStatus,
    searchParams,
    status,
  ]);

  useEffect(() => {
    const companyPlan = normalizePlan(company?.subscription_plan as SubscriptionPlan | null | undefined);
    if (companyPlan) {
      clearPlanDraft();
      return;
    }
    persistPlanDraft(selectedPlan);
  }, [clearPlanDraft, company?.subscription_plan, persistPlanDraft, selectedPlan]);

  useEffect(() => {
    if (phase !== 'billing_connect') return;
    void refreshConnectStatus();
  }, [phase, refreshConnectStatus]);

  const handleTierSelect = async (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setSetupClientSecret(null);
    if (!status.profile) {
      goTo('profile_name');
      return;
    }
    if (!status.companyProfile) {
      goTo('company_name');
      return;
    }
    if (!status.marketplaceProfile) {
      goTo('marketplace_profile_intro');
      return;
    }
    if (plan === SubscriptionPlan.STARTER) {
      goTo('starter_activation');
      return;
    }
    if (!status.calendar) {
      goTo('calendar_mode');
      return;
    }
    if (!status.phone) {
      goTo('phone_choice');
      return;
    }
    if (!status.knowledge) {
      goTo('knowledge_chat');
      return;
    }
    goTo('billing_plan');
  };

  const handleProfileName = async () => {
    const name = nameInput.trim();
    if (!name) return;
    const nameParts = name.split(/\s+/).filter(Boolean);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || undefined;
    setIsSaving(true);
    try {
      await Promise.all([
        apiClient.updateMyProfile({
          first_name: firstName || undefined,
          last_name: lastName,
        }),
        apiClient.updateMyCompany({ owner_name: name }),
      ]);
      await refreshAll();
      setNameInput('');
      goTo('company_name');
    } catch {
      setErrMsg('Could not save your name. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompanyName = () => {
    if (!companyInput.trim()) return;
    goTo('service_type');
  };

  const handleServiceType = async ({
    serviceType,
    categoryTitle,
    label,
  }: {
    serviceType: ServiceType;
    categoryTitle: string;
    label: string;
  }) => {
    setShowOtherInput(false);
    setOtherServiceInput('');
    const defaultQuestions = createDefaultCallFlowQuestions(serviceType);
    setIsSaving(true);
    try {
      await apiClient.updateMyCompany({
        service_type: serviceType,
        call_flow_questions: defaultQuestions,
        marketplace_profile: {
          ...(((company as any)?.marketplace_profile || {}) as Record<string, any>),
          service_category: categoryTitle,
        },
      });
      setCallFlowQuestions(defaultQuestions);
      await refreshAll();
      goTo('timezone');
    } catch {
      setErrMsg(`Could not save ${label}. Try again.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTimezone = async (value: string) => {
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
      goTo('marketplace_profile_intro');
    } catch {
      setErrMsg('Could not save business basics. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenMarketplaceProfile = () => {
    const tier = resolvedPlan || selectedPlan;
    router.push(
      `/onboarding/marketplace-profile?returnTo=setup${tier ? `&tier=${tier}` : ''}`
    );
  };

  const handleCalendarMode = async (mode: 'INTERNAL' | 'EXTERNAL') => {
    if (mode === 'INTERNAL') {
      goTo('calendar_hours');
      return;
    }
    goTo('calendar_provider');
  };

  const handleSaveCalendarHours = async () => {
    const hasOpen = WEEKDAYS.some((day) => !calendarHours[day.key]?.closed);
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
      goTo('phone_choice');
    } catch {
      setErrMsg('Could not save your calendar settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCalendarProvider = async (provider: 'GOOGLE' | 'MICROSOFT' | 'APPLE') => {
    if (provider === 'APPLE') {
      goTo('calendar_apple');
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
      const response =
        provider === 'GOOGLE'
          ? await apiClient.getGoogleCalendarAuthUrl()
          : await apiClient.getMicrosoftCalendarAuthUrl();
      if (response?.url) window.location.href = response.url;
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
      goTo('phone_choice');
    } catch (err: any) {
      setErrMsg(err?.message || 'Could not connect Apple Calendar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhoneChoice = async (choice: 'forward' | 'demo') => {
    if (choice === 'forward') {
      goTo('phone_forward');
      return;
    }
    setIsSaving(true);
    try {
      await apiClient.claimDemoPhoneNumber();
      await refreshCompanyNumber();
      await refreshAll();
      goTo('knowledge_chat');
    } catch (err: any) {
      setErrMsg(err?.message || 'Could not assign a temporary setup number.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveForwarding = async () => {
    if (!forwardNumber.trim()) {
      setErrMsg('Enter your business number.');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await apiClient.updateMyCompany({ phone_number: forwardNumber.trim() });
      setCompany(updated);
      await refreshAll();
      goTo('knowledge_chat');
    } catch {
      setErrMsg('Could not save your number.');
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
    const messages = [{ role: 'user' as const, content: draft }];
    try {
      await Promise.all([
        apiClient.knowledgeAssistantGenerate(messages, true),
        apiClient.knowledgeExtractProducts(messages).catch(() => ({ created_count: 0 })),
      ]);
      await refreshKnowledge();
      await refreshAll();
      goTo('call_flow_editor');
    } catch (err: any) {
      setKbError(err?.message || 'Could not generate the knowledge base. Try again.');
    } finally {
      setKbGenerating(false);
    }
  };

  const handleSaveCallFlow = async () => {
    const normalized = sanitizeCallFlowQuestions(callFlowQuestions);
    if (normalized.length === 0) {
      setErrMsg('Keep at least one intake question before continuing.');
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
      goTo('billing_payment_mode');
    } catch (err: any) {
      setErrMsg(err?.message || 'Could not save your AI intake flow.');
    } finally {
      setIsSaving(false);
    }
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
      if (mode === 'HANDYCALL_MANAGED') {
        goTo('billing_connect');
        await refreshConnectStatus();
      } else {
        goTo('billing_plan');
      }
    } catch (err: any) {
      setErrMsg(err?.message || 'Could not save your payment setup.');
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
      setErrMsg(err?.message || 'Could not start Stripe Connect onboarding.');
      goTo('billing_connect');
    } finally {
      setConnectBusy(false);
    }
  };

  const handleContinueAfterConnect = async () => {
    const latest = await refreshConnectStatus();
    if (!isConnectReady(latest)) {
      setErrMsg('Finish Stripe onboarding first, then continue.');
      return;
    }
    await continueAfterConnect();
  };

  const handleBeginPlanBilling = async () => {
    if (!resolvedPlan) {
      setErrMsg('Choose a tier first.');
      goTo('plan_selection');
      return;
    }

    if (resolvedPlan === SubscriptionPlan.STARTER) {
      goTo('starter_activation');
      return;
    }

    const effectiveMode =
      selectedPaymentMode ||
      ((company as any)?.booking_payment_mode as 'HANDYCALL_MANAGED' | 'SELF_MANAGED' | undefined);

    if (effectiveMode === 'HANDYCALL_MANAGED' && !isConnectReady()) {
      setErrMsg('Connect your payout account before activating your paid tier.');
      goTo('billing_connect');
      return;
    }

    setIsSaving(true);
    setErrMsg(null);
    try {
      const { client_secret } = await apiClient.createSetupIntent();
      setSetupClientSecret(client_secret);
      goTo('billing_payment');
    } catch (err: any) {
      setErrMsg(err?.message || 'Could not initialize billing.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStarterActivation = async () => {
    setIsSaving(true);
    setErrMsg(null);
    try {
      await apiClient.activateStarterPlan();
      await refreshAll();
      clearPlanDraft();
      goTo('complete');
    } catch (err: any) {
      setErrMsg(err?.message || 'Could not activate Starter.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBillingSuccess = async () => {
    await refreshAll();
    clearPlanDraft();
    goTo('complete');
  };

  const renderStepContent = () => {
    switch (phase) {
      case 'loading':
        return null;

      case 'plan_selection':
        return (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              {Object.entries(PLAN_CATALOG).map(([plan, details]) => {
                const planKey = plan as SubscriptionPlan;
                const price = getPlanPriceDisplay(planKey);
                const selected = resolvedPlan === planKey;
                return (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => void handleTierSelect(planKey)}
                    className={cn(
                      'flex h-full flex-col rounded-3xl border p-5 text-left transition',
                      selected
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-sm dark:bg-emerald-950/20'
                        : 'border-border bg-card hover:border-emerald-400/60 hover:bg-accent/50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-bold text-foreground">{details.name}</p>
                        {details.badge ? (
                          <p className="mt-1 text-sm text-muted-foreground">{details.badge}</p>
                        ) : null}
                      </div>
                      {selected ? (
                        <span className="rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Selected
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-5">
                      <p className="text-3xl font-bold text-foreground">{price.current}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {details.price === 0 ? 'Only pay when you unlock a lead' : price.cadence}
                      </p>
                    </div>
                    <div className="mt-5 space-y-2">
                      {details.featureHighlights.map((item) => (
                        <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <IconCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" stroke={2} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-emerald-600">
                      Continue with {details.name}
                      <IconArrowRight className="h-4 w-4" stroke={2} />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <p className="text-sm font-semibold text-foreground">How the paths differ</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Starter stops after your marketplace profile and activates a free listing. Pro and Max
                then continue into AI calling, payment flows, and final billing.
              </p>
            </div>
          </div>
        );

      case 'profile_name':
        return (
          <div className="space-y-4">
            <input
              autoFocus
              type="text"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && void handleProfileName()}
              placeholder="e.g. Mohammad Hamdallah"
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
              onChange={(event) => setCompanyInput(event.target.value)}
              onKeyDown={(event) =>
                event.key === 'Enter' && companyInput.trim() && void handleCompanyName()
              }
              placeholder="e.g. Riyadh Elite AC Services"
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
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Broad category first, specifics next</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick the main category that best fits your business. In your marketplace profile, you&apos;ll
                then list the exact jobs you do, like mesh network setup, duct cleaning, or water heater repair.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {MARKETPLACE_SERVICE_CATEGORIES.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() =>
                    void handleServiceType({
                      serviceType: option.templateServiceType,
                      categoryTitle: option.title,
                      label: option.title,
                    })
                  }
                  disabled={isSaving}
                  className="rounded-2xl border border-border bg-card p-4 text-left transition hover:border-emerald-400/60 hover:bg-accent/60 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                        Marketplace category
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-foreground">{option.title}</h3>
                    </div>
                    <IconArrowRight className="h-5 w-5 flex-shrink-0 text-muted-foreground/40" stroke={1.5} />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{option.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {option.services.slice(0, 3).map((highlight) => (
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
                Start from a general template and tailor the intake flow after your marketplace profile is complete.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowOtherInput(true);
                    setOtherServiceInput('');
                  }}
                  disabled={isSaving || showOtherInput}
                  className="rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-emerald-400/60 hover:bg-accent disabled:opacity-50"
                >
                  Other / Custom
                </button>
              </div>
            </div>
            {showOtherInput ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={otherServiceInput}
                  onChange={(event) => setOtherServiceInput(event.target.value)}
                  onKeyDown={(event) =>
                    event.key === 'Enter' &&
                    otherServiceInput.trim() &&
                    void handleServiceType({
                      serviceType: ServiceType.OTHER,
                      categoryTitle: otherServiceInput.trim(),
                      label: otherServiceInput.trim(),
                    })
                  }
                  placeholder="e.g. Water tank cleaning, false ceiling repair..."
                  disabled={isSaving}
                  className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />
                <PrimaryButton
                  onClick={() =>
                    void handleServiceType({
                      serviceType: ServiceType.OTHER,
                      categoryTitle: otherServiceInput.trim(),
                      label: otherServiceInput.trim(),
                    })
                  }
                  disabled={!otherServiceInput.trim() || isSaving}
                  loading={isSaving}
                >
                  <IconArrowRight className="h-4 w-4" stroke={2} />
                </PrimaryButton>
              </div>
            ) : null}
          </div>
        );

      case 'timezone':
        return (
          <div className="flex flex-wrap gap-2">
            {TIMEZONE_OPTIONS.map((timezone) => (
              <button
                key={timezone.value}
                type="button"
                onClick={() => void handleTimezone(timezone.value)}
                disabled={isSaving}
                className="rounded-xl border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-emerald-400/60 hover:bg-accent disabled:opacity-50"
              >
                {timezone.label}
              </button>
            ))}
          </div>
        );

      case 'marketplace_profile_intro':
        return (
          <div className="space-y-5">
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <IconSparkles className="h-6 w-6" stroke={1.8} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">What you will set up here</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your public profile includes the cities you serve, services offered, starting price,
                    trust badges, business hours, payment methods, and project photos.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-muted/60 p-4">
                  <p className="text-sm font-semibold text-foreground">Saudi service coverage</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose cities like {SAUDI_CITIES.slice(0, 4).join(', ')}, and more.
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/60 p-4">
                  <p className="text-sm font-semibold text-foreground">Thumbtack-style trust signals</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add bio, years in business, certifications, supported payment methods, and work examples.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <PrimaryButton onClick={handleOpenMarketplaceProfile}>
                Build marketplace profile
                <IconArrowRight className="h-4 w-4" stroke={2} />
              </PrimaryButton>
              <GhostButton onClick={() => goTo('plan_selection')}>Change tier</GhostButton>
            </div>
          </div>
        );

      case 'calendar_mode':
        return (
          <div className="space-y-3">
            <OptionCard
              onClick={() => void handleCalendarMode('INTERNAL')}
              disabled={isSaving}
              icon={<IconCalendar className="h-5 w-5" stroke={1.5} />}
              label="Use HandyCall scheduling"
              description="Keep your setup simple and let HandyCall manage bookable time from your working hours."
              recommended
            />
            <OptionCard
              onClick={() => void handleCalendarMode('EXTERNAL')}
              disabled={isSaving}
              icon={<IconCalendar className="h-5 w-5" stroke={1.5} />}
              label="Connect my existing calendar"
              description="Use Google, Outlook, or Apple if your team already lives in another calendar."
            />
          </div>
        );

      case 'calendar_hours':
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Default Saudi work week</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sunday through Thursday starts open by default. Friday and Saturday start closed, but you can adjust any day.
              </p>
            </div>
            <div className="space-y-1.5">
              {WEEKDAYS.map((day) => {
                const row = calendarHours[day.key];
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
                    {!row.closed ? (
                      <>
                        <input
                          type="time"
                          value={row.open}
                          onChange={(event) =>
                            setCalendarHours((prev) => ({
                              ...prev,
                              [day.key]: { ...row, open: event.target.value },
                            }))
                          }
                          className="rounded-lg border border-border bg-background px-2 py-0.5 text-xs text-foreground"
                        />
                        <span className="text-xs text-muted-foreground">-</span>
                        <input
                          type="time"
                          value={row.close}
                          onChange={(event) =>
                            setCalendarHours((prev) => ({
                              ...prev,
                              [day.key]: { ...row, close: event.target.value },
                            }))
                          }
                          className="rounded-lg border border-border bg-background px-2 py-0.5 text-xs text-foreground"
                        />
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <PrimaryButton onClick={handleSaveCalendarHours} disabled={isSaving} loading={isSaving}>
              <IconCheck className="h-4 w-4" stroke={2} />
              Save hours
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
                description: 'Best for most solo pros and field teams.',
                icon: <IconBrandGoogle className="h-5 w-5" stroke={1.5} />,
              },
              {
                id: 'MICROSOFT',
                label: 'Outlook / Microsoft 365',
                description: 'Good for businesses already using Microsoft tools.',
                icon: <IconBrandWindows className="h-5 w-5" stroke={1.5} />,
              },
              {
                id: 'APPLE',
                label: 'Apple Calendar',
                description: 'Connect iCloud Calendar with an app-specific password.',
                icon: <IconBrandApple className="h-5 w-5" stroke={1.5} />,
              },
            ].map((option) => (
              <OptionCard
                key={option.id}
                onClick={() =>
                  void handleCalendarProvider(option.id as 'GOOGLE' | 'MICROSOFT' | 'APPLE')
                }
                disabled={isSaving}
                icon={option.icon}
                label={option.label}
                description={option.description}
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
              onChange={(event) => setAppleEmail(event.target.value)}
              placeholder="Apple ID email"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <input
              type="password"
              value={applePass}
              onChange={(event) => setApplePass(event.target.value)}
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
              onClick={() => void handlePhoneChoice('forward')}
              disabled={isSaving}
              icon={<IconPhone className="h-5 w-5" stroke={1.5} />}
              label="Forward my current business number"
              description="Best if customers already know your number and you want the AI to answer first."
              recommended
            />
            <OptionCard
              onClick={() => void handlePhoneChoice('demo')}
              disabled={isSaving}
              icon={<IconPhone className="h-5 w-5" stroke={1.5} />}
              label="Use a temporary HandyCall setup number"
              description="Useful while you test the AI before routing your live line."
            />
            <div className="rounded-2xl border border-border bg-card/70 p-4 text-sm text-muted-foreground">
              Dedicated long-term number sourcing can still be configured later from your dashboard settings.
            </div>
          </div>
        );

      case 'phone_forward':
        return (
          <div className="space-y-4">
            <input
              autoFocus
              type="tel"
              value={forwardNumber}
              onChange={(event) => setForwardNumber(event.target.value)}
              placeholder="+9665XXXXXXXX"
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

      case 'knowledge_chat':
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <p className="text-sm font-semibold text-foreground">What to include here</p>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                Add the details your team repeats all day: what you service, pricing rules, emergency surcharges,
                city coverage, cancellation windows, warranty notes, deposits, and anything the AI should answer consistently.
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
            <textarea
              value={kbInput}
              onChange={(event) => setKbInput(event.target.value)}
              placeholder="Example: We handle split AC repair in Riyadh and Khobar. Standard diagnostics start at SAR 149 and same-day emergency visits add SAR 90. Customers should switch the unit off if water is leaking..."
              rows={6}
              className="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {kbError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                {kbError}
              </div>
            ) : null}
            <PrimaryButton
              onClick={() => void handleGenerateKnowledge()}
              disabled={kbGenerating || !kbInput.trim()}
              loading={kbGenerating}
            >
              <IconBrain className="h-4 w-4" stroke={1.5} />
              {kbGenerating ? 'Building knowledge base...' : 'Build knowledge base'}
            </PrimaryButton>
          </div>
        );

      case 'call_flow_editor':
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-foreground">
                Control the questions your AI asks before booking or quoting
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep questions relevant to the issue, location, urgency, and any details your team truly needs before taking the next step.
              </p>
            </div>
            <CallFlowEditor questions={callFlowQuestions} onChange={setCallFlowQuestions} />
            <PrimaryButton onClick={handleSaveCallFlow} disabled={isSaving} loading={isSaving}>
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
              selected={
                selectedPaymentMode === 'HANDYCALL_MANAGED' ||
                (company as any)?.booking_payment_mode === 'HANDYCALL_MANAGED'
              }
              icon={<IconCreditCard className="h-5 w-5" stroke={1.5} />}
              label="Collect payments in HandyCall"
              description="Customers can pay through the platform and payouts are sent to your Stripe-connected account."
              recommended
            />
            <OptionCard
              onClick={() => void handlePaymentModeChoice('SELF_MANAGED')}
              disabled={paymentModeSaving}
              selected={
                selectedPaymentMode === 'SELF_MANAGED' ||
                (company as any)?.booking_payment_mode === 'SELF_MANAGED'
              }
              icon={<IconUser className="h-5 w-5" stroke={1.5} />}
              label="I collect payment myself"
              description="Use HandyCall for qualification and booking only, then collect payment outside the platform."
            />
          </div>
        );

      case 'billing_plan':
        return (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-3">
              {Object.entries(PLAN_CATALOG).map(([plan, details]) => {
                const planKey = plan as SubscriptionPlan;
                const price = getPlanPriceDisplay(planKey);
                const selected = resolvedPlan === planKey;
                return (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => setSelectedPlan(planKey)}
                    className={cn(
                      'rounded-3xl border p-5 text-left transition',
                      selected
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/20'
                        : 'border-border bg-card hover:border-emerald-400/60 hover:bg-accent/50'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-bold text-foreground">{details.name}</p>
                      {selected ? (
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Selected
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-2xl font-bold text-foreground">{price.current}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {details.price === 0 ? 'Pay per unlocked lead' : price.cadence}
                    </p>
                    <div className="mt-4 space-y-2">
                      {details.featureHighlights.slice(0, 4).map((item) => (
                        <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <IconCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" stroke={2} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3">
              <PrimaryButton
                onClick={handleBeginPlanBilling}
                disabled={!resolvedPlan || isSaving}
                loading={isSaving}
              >
                {resolvedPlan === SubscriptionPlan.STARTER ? 'Continue to free activation' : 'Continue to payment'}
                <IconArrowRight className="h-4 w-4" stroke={2} />
              </PrimaryButton>
              <GhostButton onClick={() => goTo('plan_selection')}>Change onboarding path</GhostButton>
            </div>
          </div>
        );

      case 'billing_payment':
        return stripePromise && setupClientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret: setupClientSecret }}>
            <StripePaymentForm selectedPlan={resolvedPlan} onSuccess={handleBillingSuccess} />
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
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Opening Stripe...</p>
                <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">
                  You&apos;ll be redirected to Stripe to finish payouts and customer payment setup.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-4 text-sm text-foreground">
                {isConnectReady() ? (
                  <>
                    <p className="font-medium text-emerald-700 dark:text-emerald-300">Payout account connected.</p>
                    <p className="mt-1 text-muted-foreground">
                      Stripe is ready and HandyCall can route customer payments to your business.
                    </p>
                  </>
                ) : connectStatus?.connected ? (
                  <>
                    <p className="font-medium">Stripe account linked.</p>
                    <p className="mt-1 text-muted-foreground">
                      Finish the remaining details in Stripe, then come back and continue.
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Your payout account is not connected yet.</p>
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
                {connectStatus?.connected ? 'Finish in Stripe' : 'Connect payout account'}
              </PrimaryButton>
              <GhostButton onClick={() => void refreshConnectStatus()} disabled={connectBusy || connectChecking}>
                {connectChecking ? 'Checking...' : 'Check status'}
              </GhostButton>
              <GhostButton onClick={() => void handlePaymentModeChoice('SELF_MANAGED')}>
                Skip and collect payments yourself
              </GhostButton>
            </div>
          </div>
        );

      case 'starter_activation':
        return (
          <div className="space-y-5">
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm dark:bg-emerald-900/50">
                  <IconSparkles className="h-6 w-6" stroke={1.8} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Starter is marketplace-only</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your listing goes live for free. When a customer inquires, you will see the request summary first, then unlock the full lead details when you are ready.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/80 p-4 dark:bg-emerald-950/30">
                  <p className="text-sm font-semibold text-foreground">Included now</p>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    <li>Marketplace profile and search visibility</li>
                    <li>Lead request previews</li>
                    <li>Pay-per-lead unlock model</li>
                  </ul>
                </div>
                <div className="rounded-2xl bg-white/80 p-4 dark:bg-emerald-950/30">
                  <p className="text-sm font-semibold text-foreground">Not included on Starter</p>
                  <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                    <li>No AI receptionist or automated call handling</li>
                    <li>No automated payments or scheduling assistant</li>
                    <li>Upgrade to Pro or Max anytime</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <PrimaryButton onClick={handleStarterActivation} loading={isSaving} disabled={isSaving}>
                Activate free Starter
                <IconArrowRight className="h-4 w-4" stroke={2} />
              </PrimaryButton>
              <GhostButton onClick={() => goTo('plan_selection')}>Choose a paid tier instead</GhostButton>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <IconCheck className="h-10 w-10 text-emerald-600 dark:text-emerald-400" stroke={2} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {resolvedPlan === SubscriptionPlan.STARTER ? 'Your listing is ready!' : 'Your pro setup is ready!'}
            </h1>
            <p className="mt-3 max-w-xl text-lg text-muted-foreground">
              {resolvedPlan === SubscriptionPlan.STARTER
                ? 'Customers can now discover your marketplace profile and send lead requests. You can unlock the best-fit leads from your dashboard.'
                : 'Your marketplace profile is live, your AI calling flow is configured, and you can now manage leads, calls, bookings, and billing from the dashboard.'}
            </p>
            <PrimaryButton onClick={() => router.replace('/dashboard')} className="mt-8 px-8 py-3">
              Go to dashboard
              <IconArrowRight className="h-4 w-4" stroke={2} />
            </PrimaryButton>
            <button
              onClick={() => router.replace('/onboarding/marketplace-profile')}
              className="mt-3 text-sm text-muted-foreground underline hover:text-foreground"
            >
              Edit marketplace profile
            </button>
          </div>
        );

      default:
        return null;
    }
  };

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

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <aside className="hidden w-72 flex-shrink-0 flex-col border-r border-border bg-card/50 lg:flex">
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Setup journey
          </p>
          <div className="space-y-1">
            {setupGroups.map((group) => {
              const isComplete = currentGroup > group.group;
              const isActive = currentGroup === group.group;
              return (
                <div
                  key={group.group}
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
                      group.group
                    )}
                  </div>
                  <span className={cn('font-medium', isActive && 'font-semibold')}>{group.label}</span>
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

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        <div className="border-b border-border bg-card/50 px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              Step {Math.min(Math.max(currentGroup, 1), setupGroups.length)} of {setupGroups.length}
            </p>
            <p className="text-sm text-muted-foreground">
              {setupGroups[Math.min(Math.max(currentGroup, 1), setupGroups.length) - 1]?.label}
            </p>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${((Math.min(Math.max(currentGroup, 1), setupGroups.length) - 1) / setupGroups.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-6 py-10 sm:px-8">
          {phase !== 'loading' && phase !== 'complete' ? (
            <div className="mb-8">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Step {Math.min(Math.max(currentGroup, 1), setupGroups.length)} of {setupGroups.length}
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {getStepMeta(phase, resolvedPlan).title}
              </h1>
              {getStepMeta(phase, resolvedPlan).description ? (
                <p className="mt-2 text-base text-muted-foreground">
                  {getStepMeta(phase, resolvedPlan).description}
                </p>
              ) : null}
            </div>
          ) : null}

          {errMsg && phase !== 'loading' ? (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
              <IconX className="mt-0.5 h-4 w-4 flex-shrink-0" stroke={1.5} />
              {errMsg}
            </div>
          ) : null}

          {renderStepContent()}
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
