'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import {
  IconUser,
  IconBell,
  IconShield,
  IconMapPin,
  IconTrash,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconChevronRight,
  IconAlertTriangle,
  IconLoader2,
  IconX,
} from '@tabler/icons-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  { key: 'notifications', label: 'Notifications', icon: IconBell },
  { key: 'addresses', label: 'Addresses', icon: IconMapPin },
  { key: 'security', label: 'Security', icon: IconShield },
];

const inputClass =
  'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition';
const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-700';

// ── Profile tab ───────────────────────────────────────────────────────────────

function ProfileTab({ onSave }: { onSave: (msg?: string) => void }) {
  const { user } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [email] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load phone from user object if available
  useEffect(() => {
    const raw = (user as any)?.phone_number ?? '';
    setPhone(raw.replace(/^\+1/, ''));
  }, [user]);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const normalizedPhone = phone.replace(/\D/g, '');
      const phoneNumber = normalizedPhone ? `+1${normalizedPhone}` : undefined;
      await apiClient.updateMyProfile({
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        phone_number: phoneNumber,
      });
      onSave('Profile updated');
    } catch (err: any) {
      setError(err?.message || 'Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
        <p className="mt-1 text-sm text-slate-500">Update your name and phone number.</p>
      </div>

      <ErrorBanner message={error} />

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white">
          {firstName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <p className="text-xs text-slate-400">Profile photo coming soon</p>
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
          value={email}
          disabled
          className={`${inputClass} cursor-not-allowed opacity-60`}
        />
        <p className="mt-1 text-xs text-slate-400">Email cannot be changed.</p>
      </div>

      <div>
        <label className={labelClass}>Phone number</label>
        <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
          <span className="flex items-center bg-slate-50 px-3 text-sm font-medium text-slate-500 border-r border-slate-200 shrink-0">
            +1
          </span>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            className="flex-1 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

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

// ── Notifications tab ─────────────────────────────────────────────────────────

const NOTIFICATION_PREFS = [
  { key: 'booking_confirmed', label: 'Booking confirmed', desc: 'When a pro accepts your booking request.' },
  { key: 'booking_reminder', label: 'Booking reminders', desc: '24 hours and 2 hours before your appointment.' },
  { key: 'pro_message', label: 'Pro messages', desc: 'When a pro sends you a message.' },
  { key: 'review_request', label: 'Review requests', desc: 'After a service is completed.' },
  { key: 'payment', label: 'Payment updates', desc: 'Receipts and payment confirmations.' },
  { key: 'promotions', label: 'Promotions & offers', desc: 'Special deals and seasonal discounts.' },
];

const NOTIF_STORAGE_KEY = 'hc_customer_notif_prefs';

function getDefaultPrefs() {
  return Object.fromEntries(
    NOTIFICATION_PREFS.map((p) => [
      p.key,
      { push: p.key !== 'promotions', email: p.key !== 'review_request' && p.key !== 'promotions' },
    ])
  );
}

function NotificationsTab({ onSave }: { onSave: (msg?: string) => void }) {
  const [prefs, setPrefs] = useState<Record<string, { push: boolean; email: boolean }>>(getDefaultPrefs);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIF_STORAGE_KEY);
      if (stored) setPrefs(JSON.parse(stored));
    } catch {}
  }, []);

  function toggle(key: string, channel: 'push' | 'email') {
    setPrefs((prev) => ({ ...prev, [key]: { ...prev[key], [channel]: !prev[key][channel] } }));
  }

  function handleSave() {
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(prefs));
    } catch {}
    onSave('Preferences saved');
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-900">Notification Preferences</h3>
        <p className="mt-1 text-sm text-slate-500">Choose how you want to be notified.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_64px_64px] border-b border-slate-100 px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notification</span>
          <span className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Push</span>
          <span className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Email</span>
        </div>
        {NOTIFICATION_PREFS.map((pref, i) => (
          <div
            key={pref.key}
            className={`grid grid-cols-[1fr_64px_64px] items-center px-5 py-4 ${i < NOTIFICATION_PREFS.length - 1 ? 'border-b border-slate-50' : ''}`}
          >
            <div>
              <p className="text-sm font-medium text-slate-800">{pref.label}</p>
              <p className="text-xs text-slate-400">{pref.desc}</p>
            </div>
            {(['push', 'email'] as const).map((channel) => (
              <div key={channel} className="flex justify-center">
                <button
                  onClick={() => toggle(pref.key, channel)}
                  className={`relative h-6 w-10 rounded-full transition-colors ${prefs[pref.key]?.[channel] ? 'bg-emerald-600' : 'bg-slate-200'}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${prefs[pref.key]?.[channel] ? 'translate-x-4' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        Save preferences
      </button>
    </div>
  );
}

// ── Addresses tab ─────────────────────────────────────────────────────────────

const ADDR_STORAGE_KEY = 'hc_customer_addresses';
type Address = { id: string; label: string; address: string; default: boolean };

function AddressesTab({ onSave }: { onSave: (msg?: string) => void }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ADDR_STORAGE_KEY);
      if (stored) setAddresses(JSON.parse(stored));
    } catch {}
  }, []);

  function persist(next: Address[]) {
    setAddresses(next);
    try { localStorage.setItem(ADDR_STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  function addAddress() {
    if (!newAddress.trim()) return;
    const next: Address[] = [
      ...addresses,
      { id: String(Date.now()), label: newLabel.trim() || 'Address', address: newAddress.trim(), default: addresses.length === 0 },
    ];
    persist(next);
    setNewLabel('');
    setNewAddress('');
    setAdding(false);
    onSave('Address added');
  }

  function removeAddress(id: string) {
    const next = addresses.filter((a) => a.id !== id);
    // If the removed was default, make first remaining default
    if (addresses.find((a) => a.id === id)?.default && next.length > 0) {
      next[0].default = true;
    }
    persist(next);
    onSave('Address removed');
  }

  function setDefault(id: string) {
    persist(addresses.map((a) => ({ ...a, default: a.id === id })));
    onSave('Default address updated');
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-900">Saved Addresses</h3>
        <p className="mt-1 text-sm text-slate-500">Addresses used for booking services.</p>
      </div>

      {addresses.length === 0 && !adding && (
        <p className="text-sm text-slate-400">No addresses saved yet.</p>
      )}

      <ul className="space-y-3">
        {addresses.map((addr) => (
          <li key={addr.id} className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <IconMapPin className="h-5 w-5" stroke={1.5} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-800">{addr.label}</p>
                {addr.default ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Default</span>
                ) : (
                  <button
                    onClick={() => setDefault(addr.id)}
                    className="text-[10px] text-slate-400 underline hover:text-emerald-600"
                  >
                    Set as default
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">{addr.address}</p>
            </div>
            <button
              onClick={() => removeAddress(addr.id)}
              className="text-slate-300 transition hover:text-red-500"
              title="Remove"
            >
              <IconTrash className="h-4 w-4" stroke={1.5} />
            </button>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <label className={labelClass}>Label</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Home, Work, Parents' house…"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="Street, District, City"
              className={inputClass}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addAddress}
              disabled={!newAddress.trim()}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setNewLabel(''); setNewAddress(''); }}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-5 py-3 text-sm font-medium text-slate-500 transition hover:border-emerald-300 hover:text-emerald-700"
        >
          <IconMapPin className="h-4 w-4" stroke={1.8} />
          Add new address
        </button>
      )}
    </div>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────

function DeleteModal({ onConfirm, onCancel, deleting }: { onConfirm: () => void; onCancel: () => void; deleting: boolean }) {
  const [typed, setTyped] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

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
              This will permanently delete your account, all bookings, messages, and payment history. This cannot be undone.
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

// ── Security tab ──────────────────────────────────────────────────────────────

function SecurityTab({ onSave }: { onSave: (msg?: string) => void }) {
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
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    setPwSaving(true);
    try {
      await apiClient.updatePassword(currentPw, newPw);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      onSave('Password updated');
    } catch (err: any) {
      setPwError(err?.message || 'Could not update password. Check your current password.');
    } finally {
      setPwSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.deleteMyCustomerAccount();
      // Clear local data
      try { localStorage.clear(); } catch {}
      await logout('/customer/login');
    } catch (err: any) {
      setDeleteError(
        err?.message || 'Could not delete account. Please try again or contact support@handycall.org.'
      );
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-900">Security</h3>
        <p className="mt-1 text-sm text-slate-500">Manage your password and account security.</p>
      </div>

      {/* Change password */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
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
            <button type="button" onClick={() => setShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showCurrent ? <IconEyeOff className="h-4 w-4" stroke={1.8} /> : <IconEye className="h-4 w-4" stroke={1.8} />}
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
            <button type="button" onClick={() => setShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showNew ? <IconEyeOff className="h-4 w-4" stroke={1.8} /> : <IconEye className="h-4 w-4" stroke={1.8} />}
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
          {pwSaving ? 'Updating…' : 'Update Password'}
        </button>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-100 bg-red-50 p-5 space-y-3">
        <h4 className="text-sm font-semibold text-red-700">Danger Zone</h4>
        <p className="text-xs text-red-500">
          Deleting your account is permanent and cannot be undone. All your bookings, messages, payment history, and personal data will be erased immediately.
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

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CustomerSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  function handleSave(msg = 'Changes saved') {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(null), 2500);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account, notifications, and security.</p>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Sidebar tabs */}
        <nav className="flex w-full flex-col gap-0.5 md:w-48">
          {SETTING_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                  active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4.5 w-4.5 flex-shrink-0 ${active ? 'text-emerald-600' : 'text-slate-400'}`}
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

        {/* Content */}
        <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-6">
          {activeTab === 'profile' && <ProfileTab onSave={handleSave} />}
          {activeTab === 'notifications' && <NotificationsTab onSave={handleSave} />}
          {activeTab === 'addresses' && <AddressesTab onSave={handleSave} />}
          {activeTab === 'security' && <SecurityTab onSave={handleSave} />}
        </div>
      </div>

      <SaveBanner show={Boolean(savedMsg)} message={savedMsg ?? undefined} />
    </div>
  );
}
