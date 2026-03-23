'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
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
} from '@tabler/icons-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function SaveBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 shadow-lg">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
        <IconCheck className="h-4 w-4" stroke={2.5} />
        Changes saved
      </div>
    </div>
  );
}

const SETTING_TABS = [
  { key: 'profile', label: 'Profile', icon: IconUser },
  { key: 'notifications', label: 'Notifications', icon: IconBell },
  { key: 'addresses', label: 'Addresses', icon: IconMapPin },
  { key: 'security', label: 'Security', icon: IconShield },
];

// ── Profile tab ───────────────────────────────────────────────────────────────

function ProfileTab({ onSave }: { onSave: () => void }) {
  const { user } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [email] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('+966 5X XXX XXXX');

  const inputClass =
    'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition';
  const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-700';

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
        <p className="mt-1 text-sm text-slate-500">Update your name, email, and phone number.</p>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white">
          {firstName?.[0] ?? user?.email?.[0]?.toUpperCase() ?? '?'}
        </div>
        <div>
          <button className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700">
            Upload photo
          </button>
          <p className="mt-1 text-xs text-slate-400">JPG or PNG · Max 5 MB</p>
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
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
          placeholder="+966 5X XXX XXXX"
        />
      </div>

      <button
        onClick={onSave}
        className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        Save changes
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

function NotificationsTab({ onSave }: { onSave: () => void }) {
  const [prefs, setPrefs] = useState<Record<string, { push: boolean; email: boolean }>>(
    Object.fromEntries(
      NOTIFICATION_PREFS.map((p) => [
        p.key,
        { push: p.key !== 'promotions', email: p.key !== 'review_request' && p.key !== 'promotions' },
      ]),
    ),
  );

  function toggle(key: string, channel: 'push' | 'email') {
    setPrefs((prev) => ({
      ...prev,
      [key]: { ...prev[key], [channel]: !prev[key][channel] },
    }));
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-900">Notification Preferences</h3>
        <p className="mt-1 text-sm text-slate-500">Choose how you want to be notified.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_64px_64px] gap-0 border-b border-slate-100 px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Notification</span>
          <span className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Push</span>
          <span className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400">Email</span>
        </div>
        {NOTIFICATION_PREFS.map((pref, i) => (
          <div
            key={pref.key}
            className={`grid grid-cols-[1fr_64px_64px] items-center gap-0 px-5 py-4 ${
              i < NOTIFICATION_PREFS.length - 1 ? 'border-b border-slate-50' : ''
            }`}
          >
            <div>
              <p className="text-sm font-medium text-slate-800">{pref.label}</p>
              <p className="text-xs text-slate-400">{pref.desc}</p>
            </div>
            {(['push', 'email'] as const).map((channel) => (
              <div key={channel} className="flex justify-center">
                <button
                  onClick={() => toggle(pref.key, channel)}
                  className={`relative h-6 w-10 rounded-full transition-colors ${
                    prefs[pref.key]?.[channel] ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      prefs[pref.key]?.[channel] ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <button
        onClick={onSave}
        className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        Save preferences
      </button>
    </div>
  );
}

// ── Addresses tab ─────────────────────────────────────────────────────────────

const ADDRESSES = [
  { id: '1', label: 'Home', address: 'Al Olaya District, Riyadh, 12241', default: true },
  { id: '2', label: 'Work', address: 'King Fahd Road, Riyadh, 12343', default: false },
];

function AddressesTab({ onSave }: { onSave: () => void }) {
  const [addresses, setAddresses] = useState(ADDRESSES);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const inputClass =
    'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition';

  function addAddress() {
    if (!newAddress.trim()) return;
    setAddresses((prev) => [
      ...prev,
      { id: String(Date.now()), label: newLabel || 'Address', address: newAddress, default: false },
    ]);
    setNewLabel('');
    setNewAddress('');
    setAdding(false);
    onSave();
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-900">Saved Addresses</h3>
        <p className="mt-1 text-sm text-slate-500">Addresses used for booking services.</p>
      </div>

      <ul className="space-y-3">
        {addresses.map((addr) => (
          <li
            key={addr.id}
            className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <IconMapPin className="h-5 w-5" stroke={1.5} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-800">{addr.label}</p>
                {addr.default && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Default
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{addr.address}</p>
            </div>
            <button
              onClick={() => setAddresses((prev) => prev.filter((a) => a.id !== addr.id))}
              className="text-slate-300 transition hover:text-red-500"
            >
              <IconTrash className="h-4 w-4" stroke={1.5} />
            </button>
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Label</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Home, Work, Parent's house..."
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Address</label>
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
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Add
            </button>
            <button
              onClick={() => setAdding(false)}
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

// ── Security tab ──────────────────────────────────────────────────────────────

function SecurityTab({ onSave }: { onSave: () => void }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const inputClass =
    'w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition';

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-slate-900">Security</h3>
        <p className="mt-1 text-sm text-slate-500">Manage your password and account security.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h4 className="text-sm font-semibold text-slate-800">Change Password</h4>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Current password</label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className={inputClass}
              placeholder="Current password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showCurrent ? <IconEyeOff className="h-4 w-4" stroke={1.8} /> : <IconEye className="h-4 w-4" stroke={1.8} />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">New password</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className={inputClass}
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showNew ? <IconEyeOff className="h-4 w-4" stroke={1.8} /> : <IconEye className="h-4 w-4" stroke={1.8} />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Confirm new password</label>
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className={inputClass.replace('pr-11', 'pr-4')}
            placeholder="Repeat new password"
          />
        </div>

        <button
          onClick={() => { if (newPw && newPw === confirmPw) onSave(); }}
          disabled={!currentPw || !newPw || newPw !== confirmPw}
          className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
        >
          Update Password
        </button>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
        <h4 className="text-sm font-semibold text-red-700">Danger Zone</h4>
        <p className="mt-1 text-xs text-red-500">
          Deleting your account is permanent and cannot be undone. All your bookings, messages, and payment history will be removed.
        </p>
        <button className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100">
          <IconTrash className="h-4 w-4" stroke={1.8} />
          Delete my account
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CustomerSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [showSaved, setShowSaved] = useState(false);

  function handleSave() {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2500);
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
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
        <div className="flex-1">
          {activeTab === 'profile' && <ProfileTab onSave={handleSave} />}
          {activeTab === 'notifications' && <NotificationsTab onSave={handleSave} />}
          {activeTab === 'addresses' && <AddressesTab onSave={handleSave} />}
          {activeTab === 'security' && <SecurityTab onSave={handleSave} />}
        </div>
      </div>

      <SaveBanner show={showSaved} />
    </div>
  );
}
