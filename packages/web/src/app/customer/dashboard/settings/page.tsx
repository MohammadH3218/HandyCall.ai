'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RIYADH_DISTRICTS } from '@/constants/riyadh-districts';
import { apiClient } from '@/lib/api-client';
import {
  CustomerProfile,
  normalizeCustomerProfile,
  sanitizeSaudiPhoneLocalDigits,
} from '@/lib/customer-profile';
import { useAuthStore } from '@/stores/auth-store';
import {
  IconAlertTriangle,
  IconBell,
  IconCheck,
  IconChevronRight,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconMapPin,
  IconMessage,
  IconShield,
  IconTrash,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import { useNotificationStore } from '@/stores/notification-store';

function SaveBanner({ show, message = 'Changes saved' }: { show: boolean; message?: string }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 shadow-lg">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
        <IconCheck className="h-4 w-4" stroke={2.5} />
        {message}
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

const SETTING_TABS = [
  { key: 'profile', label: 'Profile', icon: IconUser },
  { key: 'addresses', label: 'Addresses', icon: IconMapPin },
  { key: 'security', label: 'Security', icon: IconShield },
  { key: 'notifications', label: 'Notifications', icon: IconBell },
] as const;

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition';
const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-700';

type SettingsProfile = CustomerProfile;

function updateCustomerStore(profile: SettingsProfile) {
  useAuthStore.setState((state) => ({
    user: state.user
      ? {
          ...state.user,
          first_name: profile.first_name || state.user.first_name,
          last_name: profile.last_name || state.user.last_name,
          phone_number: profile.phone_number,
          district: profile.district,
          address_line1: profile.address_line1,
          address_line2: profile.address_line2,
          address_latitude: profile.address_latitude,
          address_longitude: profile.address_longitude,
          preferred_language: profile.preferred_language,
          marketing_consent: profile.marketing_consent,
        }
      : state.user,
  }));
}

function ProfileTab({
  profile,
  onSaved,
}: {
  profile: SettingsProfile;
  onSaved: (profile: SettingsProfile, message?: string) => void;
}) {
  const [firstName, setFirstName] = useState(profile.first_name || '');
  const [lastName, setLastName] = useState(profile.last_name || '');
  const [phoneDigits, setPhoneDigits] = useState(
    sanitizeSaudiPhoneLocalDigits(profile.phone_number || ''),
  );
  const [preferredLanguage, setPreferredLanguage] = useState<'ar' | 'en'>(
    profile.preferred_language === 'ar' ? 'ar' : 'en',
  );
  const [marketingConsent, setMarketingConsent] = useState(Boolean(profile.marketing_consent));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(profile.first_name || '');
    setLastName(profile.last_name || '');
    setPhoneDigits(sanitizeSaudiPhoneLocalDigits(profile.phone_number || ''));
    setPreferredLanguage(profile.preferred_language === 'ar' ? 'ar' : 'en');
    setMarketingConsent(Boolean(profile.marketing_consent));
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const phone_number = phoneDigits ? `+966${phoneDigits}` : undefined;
      const result = await apiClient.updateCustomerProfile({
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        phone_number,
        preferred_language: preferredLanguage,
        marketing_consent: marketingConsent,
      });
      onSaved(normalizeCustomerProfile(result.profile), 'Profile updated');
    } catch (err: any) {
      setError(err?.message || 'Could not save your profile right now.');
    } finally {
      setSaving(false);
    }
  }

  const initials =
    firstName?.[0]?.toUpperCase() ||
    profile.email?.[0]?.toUpperCase() ||
    '?';

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
        <p className="mt-1 text-sm text-slate-500">
          Keep your Riyadh account details accurate for requests and messages.
        </p>
      </div>

      <ErrorBanner message={error} />

      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white">
          {initials}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>First name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
            placeholder="First name"
          />
        </div>
        <div>
          <label className={labelClass}>Last name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
            placeholder="Last name"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Email address</label>
        <input
          type="email"
          value={profile.email || ''}
          disabled
          className={`${inputClass} cursor-not-allowed opacity-60`}
        />
        <p className="mt-1 text-xs text-slate-400">Email cannot be changed here.</p>
      </div>

      <div>
        <label className={labelClass}>Saudi phone number</label>
        <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
          <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-500">
            +966
          </span>
          <input
            type="tel"
            inputMode="numeric"
            value={phoneDigits}
            onChange={(e) =>
              setPhoneDigits(sanitizeSaudiPhoneLocalDigits(e.target.value).slice(0, 9))
            }
            className="flex-1 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
            placeholder="5XXXXXXXX"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Preferred language</label>
          <select
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value === 'ar' ? 'ar' : 'en')}
            className={inputClass}
          >
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </select>
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <input
          type="checkbox"
          checked={marketingConsent}
          onChange={(e) => setMarketingConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span className="text-sm text-slate-600">
          Send me occasional HandyCall marketplace updates and customer offers.
        </span>
      </label>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving && <IconLoader2 className="h-4 w-4 animate-spin" stroke={2} />}
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}

function AddressesTab({
  profile,
  onSaved,
}: {
  profile: SettingsProfile;
  onSaved: (profile: SettingsProfile, message?: string) => void;
}) {
  const [district, setDistrict] = useState(profile.district || '');
  const [addressLine1, setAddressLine1] = useState(profile.address_line1 || '');
  const [addressLine2, setAddressLine2] = useState(profile.address_line2 || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDistrict(profile.district || '');
    setAddressLine1(profile.address_line1 || '');
    setAddressLine2(profile.address_line2 || '');
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = await apiClient.updateCustomerProfile({
        district: district || undefined,
        address_line1: addressLine1.trim() || undefined,
        address_line2: addressLine2.trim(),
      });
      onSaved(normalizeCustomerProfile(result.profile), 'Address updated');
    } catch (err: any) {
      setError(err?.message || 'Could not save your address right now.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-900">Saved Address</h3>
        <p className="mt-1 text-sm text-slate-500">
          This address is reused in future service requests.
        </p>
      </div>

      <ErrorBanner message={error} />

      <div>
        <label className={labelClass}>Riyadh district</label>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className={inputClass}
        >
          <option value="">Select your district</option>
          {RIYADH_DISTRICTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Address line 1</label>
        <input
          type="text"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          className={inputClass}
          placeholder="Street, building, and district label"
        />
      </div>

      <div>
        <label className={labelClass}>Address line 2</label>
        <input
          type="text"
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
          className={inputClass}
          placeholder="Apartment, villa number, floor, landmark"
        />
      </div>

      <div>
        <label className={labelClass}>City</label>
        <input
          type="text"
          value="Riyadh"
          disabled
          className={`${inputClass} cursor-not-allowed opacity-60`}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving && <IconLoader2 className="h-4 w-4 animate-spin" stroke={2} />}
        {saving ? 'Saving…' : 'Save address'}
      </button>
    </div>
  );
}

function DeleteModal({
  onConfirm,
  onCancel,
  deleting,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
            <IconAlertTriangle className="h-5 w-5 text-red-600" stroke={1.8} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Delete account permanently</h3>
            <p className="mt-1 text-sm text-slate-500">
              This permanently removes your customer account, requests, conversations, reviews,
              and saved address details.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">
            Type <span className="font-mono text-red-600">DELETE</span> to confirm
          </label>
          <input
            ref={inputRef}
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            placeholder="DELETE"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={onConfirm}
            disabled={typed !== 'DELETE' || deleting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-40"
          >
            {deleting && <IconLoader2 className="h-4 w-4 animate-spin" stroke={2} />}
            {deleting ? 'Deleting…' : 'Delete my account'}
          </button>
          <button
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            <IconX className="h-4 w-4" stroke={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SecurityTab({ onSave }: { onSave: (message?: string) => void }) {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const pwInputClass = `${inputClass} pr-11`;

  async function handlePasswordChange() {
    setPwError(null);
    if (newPw !== confirmPw) {
      setPwError('Passwords do not match.');
      return;
    }
    if (newPw.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }

    setPwSaving(true);
    try {
      await apiClient.updatePassword(currentPw, newPw);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      onSave('Password updated');
    } catch (err: any) {
      setPwError(err?.message || 'Could not update your password.');
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.deleteMyCustomerAccount();
      try {
        localStorage.clear();
      } catch {}
      await logout('/customer/login');
      router.refresh();
    } catch (err: any) {
      setDeleteError(
        err?.message || 'Could not delete your account right now. Please contact hello@handycall.org.',
      );
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-900">Security</h3>
        <p className="mt-1 text-sm text-slate-500">Manage your password and account access.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h4 className="text-sm font-semibold text-slate-800">Change Password</h4>
        <ErrorBanner message={pwError} />

        <div>
          <label className={labelClass}>Current password</label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className={pwInputClass}
              placeholder="Current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showCurrent ? (
                <IconEyeOff className="h-4 w-4" stroke={1.8} />
              ) : (
                <IconEye className="h-4 w-4" stroke={1.8} />
              )}
            </button>
          </div>
        </div>

        <div>
          <label className={labelClass}>New password</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className={pwInputClass}
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowNew((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showNew ? (
                <IconEyeOff className="h-4 w-4" stroke={1.8} />
              ) : (
                <IconEye className="h-4 w-4" stroke={1.8} />
              )}
            </button>
          </div>
        </div>

        <div>
          <label className={labelClass}>Confirm new password</label>
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className={inputClass}
            placeholder="Repeat new password"
          />
        </div>

        <button
          onClick={handlePasswordChange}
          disabled={!currentPw || !newPw || newPw !== confirmPw || pwSaving}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
        >
          {pwSaving && <IconLoader2 className="h-4 w-4 animate-spin" stroke={2} />}
          {pwSaving ? 'Updating…' : 'Update password'}
        </button>
      </div>

      <div className="space-y-3 rounded-2xl border border-red-100 bg-red-50 p-5">
        <h4 className="text-sm font-semibold text-red-700">Danger Zone</h4>
        <p className="text-xs text-red-500">
          Deleting your account is permanent. It removes your customer profile, requests,
          conversations, reviews, and saved details.
        </p>
        <ErrorBanner message={deleteError} />
        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
        >
          <IconTrash className="h-4 w-4" stroke={1.8} />
          Delete my account
        </button>
      </div>

      {showDeleteModal && (
        <DeleteModal
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
          deleting={deleting}
        />
      )}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">
          <Icon className="h-4 w-4 text-slate-500" stroke={1.8} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <p className="mt-0.5 text-xs text-slate-400">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-emerald-500' : 'bg-slate-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function NotificationsTab() {
  const { preferences, setPreference, notifications, clearAll } = useNotificationStore();

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-900">Notification Preferences</h3>
        <p className="mt-1 text-sm text-slate-500">
          Choose which in-app notifications you receive while using HandyCall.
        </p>
      </div>

      <div className="space-y-3">
        <ToggleRow
          icon={IconMessage}
          label="Messages"
          description="Get notified when a pro sends you a new message."
          checked={preferences.messages}
          onChange={(v) => setPreference('messages', v)}
        />
        <ToggleRow
          icon={IconCheck}
          label="Request updates"
          description="Get notified when a pro accepts or declines your request."
          checked={preferences.request_updates}
          onChange={(v) => setPreference('request_updates', v)}
        />
      </div>

      {notifications.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Notification history</h4>
              <p className="mt-0.5 text-xs text-slate-400">{notifications.length} recent notification{notifications.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <IconTrash className="h-3.5 w-3.5" stroke={1.8} />
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerSettingsPage() {
  const [activeTab, setActiveTab] = useState<(typeof SETTING_TABS)[number]['key']>('profile');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [profile, setProfile] = useState<SettingsProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);
        const result = await apiClient.getCustomerProfile();
        if (!mounted) return;
        const nextProfile = normalizeCustomerProfile(result.profile);
        setProfile(nextProfile);
        updateCustomerStore(nextProfile);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'We could not load your customer settings.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  function handleSaved(nextProfile: SettingsProfile, message = 'Changes saved') {
    setProfile(nextProfile);
    updateCustomerStore(nextProfile);
    setSavedMsg(message);
    setTimeout(() => setSavedMsg(null), 2500);
  }

  return (
    <div className="p-6 lg:p-8">
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your account details and security.
        </p>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      {loading ? (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <IconLoader2 className="h-6 w-6 animate-spin text-emerald-600" stroke={2} />
        </div>
      ) : !profile ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          We could not load your customer settings right now.
        </div>
      ) : (
        <div className="flex flex-col gap-6 md:flex-row">
          <nav className="flex w-full flex-col gap-0.5 md:w-48">
            {SETTING_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                    active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`h-4.5 w-4.5 flex-shrink-0 ${
                      active ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                    stroke={active ? 2 : 1.5}
                  />
                  {tab.label}
                  <IconChevronRight
                    className={`ml-auto h-3.5 w-3.5 text-slate-300 ${active ? 'opacity-0' : ''}`}
                    stroke={2}
                  />
                </button>
              );
            })}
          </nav>

          <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-6">
            {activeTab === 'profile' && <ProfileTab profile={profile} onSaved={handleSaved} />}
            {activeTab === 'addresses' && <AddressesTab profile={profile} onSaved={handleSaved} />}
            {activeTab === 'security' && <SecurityTab onSave={(message) => {
              setSavedMsg(message || 'Changes saved');
              setTimeout(() => setSavedMsg(null), 2500);
            }} />}
            {activeTab === 'notifications' && <NotificationsTab />}
          </div>
        </div>
      )}

      <SaveBanner show={Boolean(savedMsg)} message={savedMsg ?? undefined} />
    </div>
    </div>
  );
}
