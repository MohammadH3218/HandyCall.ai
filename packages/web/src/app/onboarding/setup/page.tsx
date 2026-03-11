'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
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
  IconPencil,
  IconSend,
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

type ChatMessage = {
  id: string;
  role: 'bot' | 'user';
  content: string;
  /** If set, an edit pencil appears on this user message */
  onEdit?: () => void;
};
type KnowledgeMsg = { role: 'user' | 'assistant'; content: string };
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _id = 0;
const mkId = () => `msg-${++_id}`;
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
    const card = elements.getElement(CardElement);
    if (!card) return;
    setLoading(true);
    setError(null);
    try {
      const { client_secret } = await apiClient.createSetupIntent();
      const { error: stripeErr, setupIntent } = await stripe.confirmCardSetup(client_secret, {
        payment_method: { card },
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <CardElement
          options={{
            style: {
              base: {
                color: '#1f2937',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                fontSize: '14px',
                '::placeholder': { color: '#9ca3af' },
              },
              invalid: { color: '#ef4444' },
            },
          }}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {done && <p className="text-sm font-medium text-emerald-600">Subscription activated!</p>}
      <button
        type="submit"
        disabled={!stripe || loading || done || !selectedPlan}
        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? (
          <>
            <IconLoader2 className="h-4 w-4 animate-spin" stroke={1.5} />
            Processing...
          </>
        ) : (
          <>
            <IconCreditCard className="h-4 w-4" stroke={1.5} />
            Activate {selectedPlan ? PLAN_CATALOG[selectedPlan].name : ''} plan
          </>
        )}
      </button>
    </form>
  );
}

// ─── Small reusable buttons ───────────────────────────────────────────────────

function ActionButton({
  onClick,
  disabled,
  loading,
  children,
}: {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={disabled || loading}
      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
    >
      {loading && <IconLoader2 className="h-4 w-4 animate-spin" stroke={1.5} />}
      {children}
    </button>
  );
}

function ChipButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={disabled}
      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function ChoiceButton({
  onClick,
  disabled,
  icon,
  children,
}: {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={disabled}
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
    >
      {icon}
      {children}
    </button>
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

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
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

  // Knowledge AI state
  const [kbMessages, setKbMessages] = useState<KnowledgeMsg[]>([]);
  const [kbInput, setKbInput] = useState('');
  const [kbLoading, setKbLoading] = useState(false);
  const [kbGenerating, setKbGenerating] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);

  // Billing state
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<
    'HANDYCALL_MANAGED' | 'SELF_MANAGED' | null
  >(null);
  const [paymentModeSaving, setPaymentModeSaving] = useState(false);
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectStatus, setConnectStatus] = useState<any>(null);
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

  // Auto-scroll on new messages
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (container.scrollHeight <= container.clientHeight) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: messages.length > 2 || kbMessages.length > 0 ? 'smooth' : 'auto',
    });
  }, [messages, isTyping, kbMessages]);

  // ─── Chat helpers ──────────────────────────────────────────────────────────

  const botSay = useCallback(async (text: string) => {
    setIsTyping(true);
    await sleep(Math.min(500 + text.length * 12, 1600));
    setIsTyping(false);
    setMessages((prev) => [...prev, { id: mkId(), role: 'bot', content: text }]);
  }, []);

  const userSay = useCallback((text: string, onEdit?: () => void) => {
    setMessages((prev) => [...prev, { id: mkId(), role: 'user', content: text, onEdit }]);
  }, []);

  const goTo = useCallback(
    async (next: Phase, ...msgs: string[]) => {
      setErrMsg(null);
      for (const m of msgs) await botSay(m);
      setPhase(next);
    },
    [botSay]
  );

  /**
   * Re-opens a previous step for editing.
   * Adds a bot re-prompt message and jumps back to that phase.
   */
  const editStep = useCallback(
    (prompt: string, targetPhase: Phase, prefill?: () => void) => {
      setErrMsg(null);
      if (prefill) prefill();
      void (async () => {
        await botSay(prompt);
        setPhase(targetPhase);
      })();
    },
    [botSay]
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

    await botSay(
      "👋 Hi! I'm your HandyCall setup assistant. Let's get your AI receptionist ready — it only takes a few minutes."
    );
    if (!s.profile) {
      await goTo('profile_name', "First, what's your full name?");
    } else if (!s.companyProfile) {
      await goTo('company_name', "Let's set up your company. What's the business name?");
    } else if (!s.serviceArea) {
      await goTo(
        'service_area_choice',
        'Where do you provide service? Do you cover all areas, or specific ZIP codes?'
      );
    } else if (!s.calendar) {
      await goTo(
        'calendar_mode',
        "Let's set up your booking calendar. How do you want to manage appointments?"
      );
    } else if (!s.phone) {
      await goTo('phone_choice', 'Almost there! How do you want customers to reach you?');
    } else if (!s.knowledge) {
      await goTo(
        'knowledge_intro',
        "Now let's build your AI receptionist's knowledge base so it can answer caller questions accurately."
      );
    } else if (!(company as any)?.call_flow_questions?.length) {
      await goTo(
        'call_flow_editor',
        'Next, review the questions your AI should ask before it ever asks for a date and time. You can edit the wording, remove questions, add new ones, and control the order here.'
      );
    } else if (!(company as any)?.booking_payment_mode_confirmed) {
      await goTo(
        'billing_payment_mode',
        'Before we finish, choose whether HandyCall should collect customer payments for you or whether your team will handle them directly.'
      );
    } else if (!s.billing) {
      await goTo('billing_plan', "Last step — let's activate your HandyCall subscription.");
    } else if (
      paymentsFlow === 'connect' &&
      (connectState === 'return' || connectState === 'refresh')
    ) {
      await goTo(
        'billing_connect',
        connectState === 'return'
          ? "Welcome back. Let's verify your Stripe Connect setup."
          : "Stripe setup was refreshed. Let's continue and verify your Connect status."
      );
      await refreshConnectStatusAndContinue();
    } else if (
      (company as any)?.booking_payment_mode === 'HANDYCALL_MANAGED' &&
      !(company as any)?.stripe_connect_onboarding_complete
    ) {
      await goTo(
        'billing_connect',
        'Almost done! Connect your bank account so HandyCall can send customer payment payouts directly to you.'
      );
      await refreshConnectStatusAndContinue();
    } else {
      await botSay('🎉 Setup complete! Redirecting to your dashboard...');
      setTimeout(() => router.replace('/dashboard'), 2000);
    }
  };

  // ─── Step handlers ─────────────────────────────────────────────────────────

  const handleProfileName = async () => {
    const name = nameInput.trim();
    if (!name) return;
    const captured = name;
    userSay(captured, () =>
      editStep('What name would you like to use?', 'profile_name', () => setNameInput(captured))
    );
    setNameInput('');
    setIsSaving(true);
    try {
      await apiClient.updateMyCompany({ owner_name: captured });
      await refreshAll();
    } catch {
      // Non-blocking
    } finally {
      setIsSaving(false);
    }
    await goTo('company_name', `Nice to meet you, ${captured}! What's the name of your business?`);
  };

  const handleCompanyName = async () => {
    const name = companyInput.trim();
    if (!name) return;
    userSay(name, () => editStep("What's the correct business name?", 'company_name'));
    await goTo('service_type', `Got it — ${name}! What type of service do you provide?`);
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
      await goTo('timezone', 'What timezone are you in?');
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
      await goTo(
        'service_area_choice',
        "Company details saved! Now let's set your service area. Do you serve all areas, or specific ZIP codes?"
      );
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
      await goTo(
        'calendar_mode',
        "Got it — you cover all areas. Now let's set up your booking calendar."
      );
    } catch {
      setErrMsg('Could not save service area.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleServiceAreaSpecific = async () => {
    userSay('Specific ZIP codes');
    await goTo('service_area_input', 'Add the ZIP codes you serve below, then save to continue.');
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
      await goTo('calendar_mode', "Service area saved! Let's set up your booking calendar.");
    } catch {
      setErrMsg('Could not save service area.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCalendarMode = async (mode: 'INTERNAL' | 'EXTERNAL') => {
    if (mode === 'INTERNAL') {
      userSay('Use HandyCall Calendar');
      await goTo(
        'calendar_hours',
        'Great choice! Set your business hours so callers can book valid times. Toggle each day open or closed.'
      );
    } else {
      userSay('Connect my existing calendar');
      await goTo('calendar_provider', 'Which calendar would you like to connect?');
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
      userSay('Business hours saved ✓');
      await goTo(
        'phone_choice',
        "Calendar is all set! Now let's get your phone ready. How do you want customers to reach you?"
      );
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
      await goTo('calendar_apple', 'Enter your Apple ID and an app-specific password to connect.');
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
      userSay('Apple Calendar connected ✓');
      await goTo('phone_choice', "Calendar connected! Let's set up your phone.");
    } catch (err: any) {
      setErrMsg(err?.message || 'Could not connect Apple Calendar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhoneChoice = async (choice: 'claim' | 'forward' | 'demo') => {
    if (choice === 'claim') {
      userSay('Claim a new HandyCall number');
      await goTo(
        'phone_claim',
        "Let's find a local number! Enter an area code to search available numbers."
      );
    } else if (choice === 'forward') {
      userSay('Forward my existing number');
      await goTo(
        'phone_forward',
        "Enter your current business number. I'll save it so you can set up forwarding from your carrier."
      );
    } else {
      userSay('Use a demo number for testing');
      setIsSaving(true);
      try {
        const res = await apiClient.claimDemoPhoneNumber();
        await refreshCompanyNumber();
        await refreshAll();
        const num = res?.phoneNumber ?? res?.phone_number ?? res?.data?.phoneNumber ?? '';
        userSay(`Demo number assigned${num ? `: ${num}` : ''}`);
        await goTo(
          'knowledge_intro',
          `Demo number ready${num ? ` (${num})` : ''}! Now let's build your AI knowledge base.`
        );
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
      userSay(`Claimed ${phoneNumber} ✓`);
      await goTo(
        'knowledge_intro',
        `Your HandyCall number is ${phoneNumber}. Now let's build your AI knowledge base so it can answer calls accurately!`
      );
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
      await goTo(
        'knowledge_intro',
        `Got it! When ready, forward calls from ${forwardNumber.trim()} to your HandyCall number in your carrier settings. Now let's build your knowledge base!`
      );
    } catch {
      setErrMsg('Could not save number.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartKnowledge = async () => {
    userSay("Let's build it!");
    const suggestions = getKnowledgeBasePromptSuggestions(
      (company?.service_type as ServiceType | undefined) || undefined
    );
    setKbMessages([
      {
        role: 'assistant',
        content:
          'Tell me the company-specific facts you want your AI receptionist to answer confidently. Focus on what is unique to your business, not general small-talk or generic customer service answers.',
      },
      {
        role: 'assistant',
        content:
          `Use this chat like you're briefing a new receptionist. Add the company-specific answers you want the AI to know before it starts taking real calls.\n\n` +
          suggestions.map((item, index) => `${index + 1}. ${item}`).join('\n'),
      },
    ]);
    await botSay(
      'Use the chat below to tell HandyCall what customers should hear about your services, pricing, policies, and anything specific to your business.'
    );
    setPhase('knowledge_chat');
  };

  const fetchKbReply = async (history: KnowledgeMsg[]) => {
    setKbLoading(true);
    setKbError(null);
    try {
      const res = await apiClient.knowledgeAssistantRespond(history);
      const msg = String(res?.assistant_message || '').trim();
      if (msg) {
        setKbMessages([...history, { role: 'assistant', content: msg }]);
      }
    } catch {
      setKbError(
        "The AI interview is temporarily unavailable. You can still generate a knowledge base with what you've already answered."
      );
    } finally {
      setKbLoading(false);
    }
  };

  const sendKbMessage = async () => {
    const text = kbInput.trim();
    if (!text || kbLoading) return;
    const next: KnowledgeMsg[] = [...kbMessages, { role: 'user', content: text }];
    setKbMessages(next);
    setKbInput('');
    await fetchKbReply(next);
  };

  const handleGenerateKnowledge = async (overrideMessages?: KnowledgeMsg[]) => {
    setKbGenerating(true);
    setKbError(null);
    const draft = kbInput.trim();
    const baseMessages = overrideMessages ?? kbMessages;
    const msgs = draft
      ? [...baseMessages, { role: 'user' as const, content: draft }]
      : baseMessages;
    if (draft) {
      setKbMessages(msgs);
      setKbInput('');
    }
    try {
      const [kbRes, prodRes] = await Promise.all([
        apiClient.knowledgeAssistantGenerate(msgs, true),
        apiClient
          .knowledgeExtractProducts(msgs)
          .catch(() => ({ created_count: 0, skipped_count: 0 })),
      ]);
      const created = Number(kbRes?.created_count || 0);
      const productsCreated = Number(prodRes?.created_count || 0);
      await refreshKnowledge();
      await refreshAll();
      userSay(`Knowledge base generated: ${created} entries created`);
      const productNote =
        productsCreated > 0
          ? ` I also created ${productsCreated} service product${productsCreated === 1 ? '' : 's'} in your Payments page.`
          : '';
      await goTo(
        'call_flow_editor',
        `Done! I created ${created} knowledge entr${created === 1 ? 'y' : 'ies'} for your AI receptionist.${productNote} You can always add more from your dashboard.`,
        'Now review the exact intake questions your AI should ask before it ever asks for a date and time.'
      );
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
      await goTo(
        'billing_payment_mode',
        'Call flow saved. Before we finish, choose how you want customer payments to work.'
      );
    } catch (err: any) {
      setErrMsg(err?.message || 'Could not save your AI call flow.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePlanSelect = async (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    userSay(`${PLAN_CATALOG[plan].name} — $${PLAN_CATALOG[plan].price}/month`);
    await goTo(
      'billing_payment',
      `${PLAN_CATALOG[plan].name} plan selected! Add a payment method to activate.`
    );
  };

  const handleBillingSuccess = async () => {
    await refreshAll();
    const effectiveMode =
      selectedPaymentMode ||
      ((company as any)?.booking_payment_mode as 'HANDYCALL_MANAGED' | 'SELF_MANAGED' | undefined);

    if (effectiveMode === 'HANDYCALL_MANAGED') {
      await goTo(
        'billing_connect',
        'Subscription activated. Connect Stripe so HandyCall can collect customer payments and send payouts to your bank account.'
      );
      await refreshConnectStatusAndContinue();
      return;
    }

    await goTo(
      'complete',
      "🎉 You're all set! HandyCall is active and your team will handle customer payments outside the platform."
    );
  };

  const refreshConnectStatusAndContinue = async () => {
    try {
      const latest = await apiClient.getConnectStatus();
      setConnectStatus(latest);
      if (latest?.connected && latest?.charges_enabled && latest?.payouts_enabled) {
        await goTo(
          'complete',
          "🎉 You're all set! Stripe Connect is fully configured and your HandyCall AI receptionist is ready."
        );
      }
    } catch (err: any) {
      setErrMsg(err?.message || 'Could not verify Stripe Connect status.');
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

      if (!status.billing) {
        userSay(mode === 'HANDYCALL_MANAGED' ? 'Managed in HandyCall' : 'I handle payments myself');
        await goTo(
          'billing_plan',
          mode === 'HANDYCALL_MANAGED'
            ? "Great choice. Pick a plan to activate HandyCall, then you'll connect Stripe for payouts."
            : 'Got it. Pick a HandyCall plan to activate the AI receptionist while your team keeps customer payments in its own workflow.'
        );
        return;
      }

      if (mode === 'SELF_MANAGED') {
        userSay('I handle payments myself');
        await goTo(
          'complete',
          "🎉 You're all set! HandyCall will handle calls and bookings, and your team handles customer payments."
        );
      } else {
        userSay('Managed in HandyCall');
        await goTo(
          'billing_connect',
          'Great choice. Connect Stripe to receive payouts and let customers pay through HandyCall booking links.'
        );
        await refreshConnectStatusAndContinue();
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
      setErrMsg(err?.message || 'Could not start Stripe Connect onboarding.');
    } finally {
      setConnectBusy(false);
    }
  };

  // ─── Active zone ───────────────────────────────────────────────────────────

  const renderActiveZone = () => {
    if (phase === 'loading' || phase === 'complete') return null;

    return (
      <div className="space-y-3">
        {errMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            <IconX className="h-4 w-4 flex-shrink-0" stroke={1.5} />
            {errMsg}
          </div>
        )}

        {/* Profile name */}
        {phase === 'profile_name' && (
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleProfileName()}
              placeholder="Your full name..."
              disabled={isSaving}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
            />
            <ActionButton
              onClick={handleProfileName}
              disabled={!nameInput.trim() || isSaving}
              loading={isSaving}
            >
              <IconSend className="h-4 w-4" stroke={1.5} />
            </ActionButton>
          </div>
        )}

        {/* Company name */}
        {phase === 'company_name' && (
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={companyInput}
              onChange={(e) => setCompanyInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' && companyInput.trim() && void handleCompanyName()
              }
              placeholder="Business name..."
              disabled={isSaving}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
            />
            <ActionButton
              onClick={handleCompanyName}
              disabled={!companyInput.trim() || isSaving}
              loading={isSaving}
            >
              <IconSend className="h-4 w-4" stroke={1.5} />
            </ActionButton>
          </div>
        )}

        {/* Service type */}
        {phase === 'service_type' && (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              {COMPANY_TEMPLATE_OPTIONS.map((option) => (
                <button
                  key={option.serviceType}
                  type="button"
                  onClick={() => void handleServiceType(option.serviceType, option.title)}
                  disabled={isSaving}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50/60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        {option.category}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">{option.title}</h3>
                    </div>
                    <IconArrowRight className="h-5 w-5 text-slate-300" stroke={1.5} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{option.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {option.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Need something custom?</p>
              <p className="mt-1 text-sm text-slate-600">
                Pick the closest template. You can edit every intake question and its order in the
                next step.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SERVICE_TYPE_OPTIONS.filter((opt) => (opt.value as string) === 'OTHER').map(
                  (opt) => (
                    <ChipButton
                      key={opt.value}
                      onClick={() => {
                        setShowOtherInput(true);
                        setOtherServiceInput('');
                      }}
                      disabled={isSaving || showOtherInput}
                    >
                      {opt.label}
                    </ChipButton>
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
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                />
                <ActionButton
                  onClick={() => void handleServiceType('OTHER', otherServiceInput.trim())}
                  disabled={!otherServiceInput.trim() || isSaving}
                  loading={isSaving}
                >
                  <IconSend className="h-4 w-4" stroke={1.5} />
                </ActionButton>
              </div>
            )}
          </div>
        )}

        {/* Timezone */}
        {phase === 'timezone' && (
          <div className="flex flex-wrap gap-2">
            {TIMEZONE_OPTIONS.map((tz) => (
              <ChipButton
                key={tz.value}
                onClick={() => void handleTimezone(tz.value, tz.label)}
                disabled={isSaving}
              >
                {tz.label}
              </ChipButton>
            ))}
          </div>
        )}

        {/* Service area choice */}
        {phase === 'service_area_choice' && (
          <div className="flex flex-wrap gap-3">
            <ChoiceButton
              icon={<IconMapPin className="h-4 w-4 text-emerald-500" stroke={1.5} />}
              onClick={handleServiceAreaAll}
              disabled={isSaving}
            >
              Serve all areas
            </ChoiceButton>
            <ChoiceButton
              icon={<IconMapPin className="h-4 w-4 text-slate-400" stroke={1.5} />}
              onClick={handleServiceAreaSpecific}
              disabled={isSaving}
            >
              Specific ZIP codes
            </ChoiceButton>
          </div>
        )}

        {/* Service area input */}
        {phase === 'service_area_input' && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Add the ZIP codes you actually serve
              </p>
              <p className="mt-1 text-sm text-slate-600">
                HandyCall uses this to qualify calls before booking, so keep it limited to the areas
                you want appointments from.
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="button"
                  onClick={addZip}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {zipCodes.map((z) => (
                  <span
                    key={z}
                    className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800"
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
            <ActionButton
              onClick={handleSaveServiceArea}
              disabled={isSaving || zipCodes.length === 0}
              loading={isSaving}
            >
              <IconCheck className="h-4 w-4" stroke={2} />
              Save service area
            </ActionButton>
          </div>
        )}

        {/* Calendar mode */}
        {phase === 'calendar_mode' && (
          <div className="flex flex-wrap gap-3">
            <ChoiceButton
              icon={<IconCalendar className="h-4 w-4 text-emerald-500" stroke={1.5} />}
              onClick={() => void handleCalendarMode('INTERNAL')}
              disabled={isSaving}
            >
              Use HandyCall Calendar
            </ChoiceButton>
            <ChoiceButton
              icon={<IconCalendar className="h-4 w-4 text-slate-400" stroke={1.5} />}
              onClick={() => void handleCalendarMode('EXTERNAL')}
              disabled={isSaving}
            >
              Connect my existing calendar
            </ChoiceButton>
          </div>
        )}

        {/* Business hours */}
        {phase === 'calendar_hours' && (
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
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="w-8 text-xs font-bold text-slate-500">{day.label}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarHours((prev) => ({
                          ...prev,
                          [day.key]: { ...row, closed: !row.closed },
                        }))
                      }
                      className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold transition ${
                        row.closed
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
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
                          className="rounded-lg border border-slate-200 px-2 py-0.5 text-xs"
                        />
                        <span className="text-xs text-slate-400">–</span>
                        <input
                          type="time"
                          value={row.close}
                          onChange={(e) =>
                            setCalendarHours((prev) => ({
                              ...prev,
                              [day.key]: { ...row, close: e.target.value },
                            }))
                          }
                          className="rounded-lg border border-slate-200 px-2 py-0.5 text-xs"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <ActionButton onClick={handleSaveCalendarHours} disabled={isSaving} loading={isSaving}>
              <IconCheck className="h-4 w-4" stroke={2} />
              Save hours & continue
            </ActionButton>
          </div>
        )}

        {/* Calendar provider */}
        {phase === 'calendar_provider' && (
          <div className="flex flex-wrap gap-3">
            {[
              {
                id: 'GOOGLE',
                label: 'Google Calendar',
                icon: <IconBrandGoogle className="h-4 w-4" stroke={1.5} />,
              },
              {
                id: 'MICROSOFT',
                label: 'Outlook / Microsoft 365',
                icon: <IconBrandWindows className="h-4 w-4" stroke={1.5} />,
              },
              {
                id: 'APPLE',
                label: 'Apple iCloud',
                icon: <IconBrandApple className="h-4 w-4" stroke={1.5} />,
              },
            ].map((opt) => (
              <ChoiceButton
                key={opt.id}
                icon={opt.icon}
                onClick={() =>
                  void handleCalendarProvider(opt.id as 'GOOGLE' | 'MICROSOFT' | 'APPLE')
                }
                disabled={isSaving}
              >
                {opt.label}
              </ChoiceButton>
            ))}
          </div>
        )}

        {/* Apple calendar credentials */}
        {phase === 'calendar_apple' && (
          <div className="space-y-3">
            <input
              type="email"
              value={appleEmail}
              onChange={(e) => setAppleEmail(e.target.value)}
              placeholder="Apple ID email"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <input
              type="password"
              value={applePass}
              onChange={(e) => setApplePass(e.target.value)}
              placeholder="App-specific password"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <a
              href="https://support.apple.com/en-us/102654"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-emerald-600 hover:underline"
            >
              How to generate an app-specific password →
            </a>
            <ActionButton
              onClick={handleConnectApple}
              disabled={isSaving || !appleEmail || !applePass}
              loading={isSaving}
            >
              <IconCheck className="h-4 w-4" stroke={2} />
              Connect Apple Calendar
            </ActionButton>
          </div>
        )}

        {/* Phone choice */}
        {phase === 'phone_choice' && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {[
              {
                id: 'claim',
                label: 'Claim a new HandyCall number',
                icon: <IconPhone className="h-4 w-4 text-emerald-500" stroke={1.5} />,
              },
              {
                id: 'forward',
                label: 'Forward my existing number',
                icon: <IconPhone className="h-4 w-4 text-slate-500" stroke={1.5} />,
              },
              {
                id: 'demo',
                label: 'Use a demo number for testing',
                icon: <IconPhone className="h-4 w-4 text-slate-300" stroke={1.5} />,
              },
            ].map((opt) => (
              <ChoiceButton
                key={opt.id}
                icon={opt.icon}
                onClick={() => void handlePhoneChoice(opt.id as 'claim' | 'forward' | 'demo')}
                disabled={isSaving}
              >
                {opt.label}
              </ChoiceButton>
            ))}
          </div>
        )}

        {/* Phone number search */}
        {phase === 'phone_claim' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                placeholder="Area code"
                maxLength={3}
                className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              />
              <input
                type="text"
                value={numberSearch}
                onChange={(e) => setNumberSearch(e.target.value)}
                placeholder="Contains (optional)"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => void handleSearchNumbers()}
                disabled={searchingNums || isSaving}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    <span className="font-semibold text-slate-900">{num.phoneNumber}</span>
                    <span className="text-xs font-medium text-emerald-600">Claim →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Forward number input */}
        {phase === 'phone_forward' && (
          <div className="flex gap-2">
            <input
              autoFocus
              type="tel"
              value={forwardNumber}
              onChange={(e) => setForwardNumber(e.target.value)}
              placeholder="+15551234567"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <ActionButton
              onClick={handleSaveForwarding}
              disabled={isSaving || !forwardNumber.trim()}
              loading={isSaving}
            >
              <IconCheck className="h-4 w-4" stroke={2} />
              Save
            </ActionButton>
          </div>
        )}

        {/* Knowledge intro */}
        {phase === 'knowledge_intro' && (
          <div className="flex flex-wrap gap-3">
            <ChoiceButton
              icon={<IconBrain className="h-4 w-4 text-emerald-500" stroke={1.5} />}
              onClick={() => void handleStartKnowledge()}
              disabled={isSaving}
            >
              Build my knowledge base
            </ChoiceButton>
          </div>
        )}

        {/* Knowledge structured form */}
        {phase === 'knowledge_chat' && (
          <div className="space-y-4 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(180deg,rgba(236,253,245,0.9),rgba(255,255,255,1))] p-5">
              <p className="text-base font-semibold text-slate-900">What to include here</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
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
                    className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-80 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              {kbMessages.map((msg, index) => (
                <div
                  key={`${msg.role}-${index}`}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-700 shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {kbLoading && <p className="text-sm text-slate-500">Assistant is thinking…</p>}
            </div>

            <div className="space-y-3">
              <textarea
                value={kbInput}
                onChange={(e) => setKbInput(e.target.value)}
                placeholder="Example: We offer one-time and monthly pest plans. Our one-time treatment starts at $149. Monthly plans start at $39/month. We service Fulshear, Katy, and Richmond. Customers often ask if pets need to stay outside during treatment..."
                rows={5}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              {kbError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                  {kbError}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  onClick={() => void handleGenerateKnowledge()}
                  disabled={
                    kbGenerating ||
                    (kbMessages.filter((msg) => msg.role === 'user').length === 0 &&
                      !kbInput.trim())
                  }
                  loading={kbGenerating}
                >
                  <IconBrain className="h-4 w-4" stroke={1.5} />
                  {kbGenerating ? 'Building knowledge base...' : 'Build knowledge base'}
                </ActionButton>
              </div>
            </div>
          </div>
        )}

        {phase === 'call_flow_editor' && (
          <div className="space-y-4 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,1))] p-5">
              <p className="text-base font-semibold text-slate-900">
                Control the questions your AI asks before scheduling
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Reword the questions, remove anything unnecessary, add your own, and set the order.
                The scheduling question stays automatic and always comes last.
              </p>
            </div>
            <CallFlowEditor questions={callFlowQuestions} onChange={setCallFlowQuestions} />
            <div className="flex flex-wrap gap-2">
              <ActionButton onClick={handleSaveCallFlow} disabled={isSaving} loading={isSaving}>
                <IconCheck className="h-4 w-4" stroke={1.5} />
                Save call flow
              </ActionButton>
            </div>
          </div>
        )}

        {/* Billing plan selection */}
        {phase === 'billing_plan' && (
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.entries(PLAN_CATALOG).map(([plan, details]) => {
              const planKey = plan as SubscriptionPlan;
              const price = getPlanPriceDisplay(planKey);
              return (
                <button
                  type="button"
                  key={plan}
                  onClick={() => void handlePlanSelect(planKey)}
                  disabled={isSaving}
                  className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-400 hover:shadow-sm disabled:opacity-50"
                >
                  <p className="text-sm font-bold text-slate-900">{details.name}</p>
                  <p className="mt-1 text-xl font-bold text-emerald-600">
                    {price.current}
                    <span className="text-xs font-normal text-slate-500">
                      {' '}
                      /{price.cadence.replace('per ', '')}
                    </span>
                  </p>
                  {details.badge && (
                    <p className="mt-1.5 text-xs text-slate-500">{details.badge}</p>
                  )}
                  {details.trialLabel && (
                    <p className="mt-1 text-xs font-semibold text-emerald-600">
                      {details.trialLabel}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Stripe payment */}
        {phase === 'billing_payment' &&
          (stripePromise ? (
            <Elements stripe={stripePromise}>
              <StripePaymentForm selectedPlan={selectedPlan} onSuccess={handleBillingSuccess} />
            </Elements>
          ) : (
            <p className="text-sm text-red-600">
              Payment provider not configured. Contact support.
            </p>
          ))}

        {/* Payment mode choice */}
        {phase === 'billing_payment_mode' && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <ChoiceButton
              icon={<IconCreditCard className="h-4 w-4 text-emerald-500" stroke={1.5} />}
              onClick={() => void handlePaymentModeChoice('HANDYCALL_MANAGED')}
              disabled={paymentModeSaving}
            >
              Managed in HandyCall (Recommended)
            </ChoiceButton>
            <ChoiceButton
              icon={<IconCreditCard className="h-4 w-4 text-slate-500" stroke={1.5} />}
              onClick={() => void handlePaymentModeChoice('SELF_MANAGED')}
              disabled={paymentModeSaving}
            >
              I handle payments myself
            </ChoiceButton>
          </div>
        )}

        {/* Stripe Connect onboarding */}
        {phase === 'billing_connect' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
              {connectStatus?.connected
                ? `Connect account linked (${connectStatus?.account_id || 'account found'}).`
                : 'Connect account not linked yet.'}
              {connectStatus?.connected && !connectStatus?.charges_enabled && (
                <p className="mt-1 text-xs text-amber-600">
                  Complete onboarding in Stripe to enable charges and payouts.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton
                onClick={handleStartConnectOnboarding}
                disabled={connectBusy}
                loading={connectBusy}
              >
                <IconCreditCard className="h-4 w-4" stroke={1.5} />
                Connect bank account (Stripe)
              </ActionButton>
              <button
                type="button"
                onClick={() => void refreshConnectStatusAndContinue()}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                I completed this, check again
              </button>
              <button
                type="button"
                onClick={() => void handlePaymentModeChoice('SELF_MANAGED')}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
              >
                Skip and handle payments myself
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Main render ───────────────────────────────────────────────────────────

  if (loading && messages.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-sm text-slate-500">Preparing your setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#f8fafc_18%,#ffffff_18%,#ffffff_100%)]"
    >
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-10 pt-8 sm:px-8">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`group flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div
              className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                msg.role === 'bot' ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            >
              {msg.role === 'bot' ? (
                <IconSparkles className="h-4 w-4 text-white" stroke={1.5} />
              ) : (
                <IconUser className="h-4 w-4 text-slate-500" stroke={1.5} />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-md rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'bot'
                  ? 'rounded-tl-sm border border-slate-200 bg-white text-slate-800 shadow-sm'
                  : 'rounded-tr-sm bg-emerald-600 text-white'
              }`}
            >
              {msg.content}
            </div>

            {/* Edit pencil — appears on hover for editable user messages */}
            {msg.role === 'user' && msg.onEdit && (
              <button
                type="button"
                onClick={msg.onEdit}
                title="Edit this answer"
                className="mt-2 flex-shrink-0 self-center rounded-lg p-1 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
              >
                <IconPencil className="h-3.5 w-3.5" stroke={1.5} />
              </button>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600">
              <IconSparkles className="h-4 w-4 text-white" stroke={1.5} />
            </div>
            <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-1">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-2 w-2 animate-bounce rounded-full bg-slate-300"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Complete CTA */}
        {phase === 'complete' && !isTyping && (
          <div className="flex justify-start pl-11">
            <button
              type="button"
              onClick={() => router.replace('/dashboard')}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              Go to Dashboard
              <IconArrowRight className="h-4 w-4" stroke={2} />
            </button>
          </div>
        )}

        {!isTyping && phase !== 'loading' && phase !== 'complete' && (
          <div className="pl-11">
            <div className="max-h-[72vh] overflow-y-auto rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
              {renderActiveZone()}
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>
    </div>
  );
}

export default function OnboardingSetupPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading setup...</div>}>
      <OnboardingSetupContent />
    </Suspense>
  );
}
