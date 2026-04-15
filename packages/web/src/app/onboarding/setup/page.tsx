'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconArrowRight,
  IconCheck,
  IconChevronLeft,
  IconLoader2,
  IconX,
  IconPlus,
} from '@tabler/icons-react';
import { apiClient } from '@/lib/api-client';
import {
  MARKETPLACE_CATEGORIES,
  MarketplaceCategoryKey,
  getCategoryByKey,
} from '@/constants/marketplace-categories';
import { RIYADH_DISTRICTS } from '@/constants/riyadh-districts';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

type ProProfile = {
  bio: string;
  years_experience: number;
  speaks_arabic: boolean;
  speaks_english: boolean;
  speaks_urdu: boolean;
  speaks_hindi: boolean;
};

type SkillEntry = {
  id: string;
  title: string;
  pricing_type: 'FIXED' | 'HOURLY' | 'QUOTE';
  price_sar: string;
  is_preset: boolean;
};

type PayoutDraft = {
  iban: string;
  bank_name: string;
  service_districts: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _id = 0;
const mkId = () => `skill-${++_id}`;

const WEEKDAYS = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU'] as const;
const DAY_LABELS: Record<string, string> = {
  SAT: 'Sat', SUN: 'Sun', MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu',
};

function defaultAvailability() {
  return WEEKDAYS.map((day) => ({
    day_of_week: day,
    open_time: '08:00',
    close_time: '18:00',
    is_available: day !== 'SUN',
  }));
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-emerald-700">
        Step {current} of {total}
      </span>
      <div className="flex flex-1 gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i < current ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Step 1: Personal profile ─────────────────────────────────────────────────

function Step1Profile({
  draft,
  onChange,
  onNext,
  saving,
  error,
}: {
  draft: ProProfile;
  onChange: (patch: Partial<ProProfile>) => void;
  onNext: () => void;
  saving: boolean;
  error: string | null;
}) {
  const canContinue = draft.bio.trim().length >= 20 && (draft.speaks_arabic || draft.speaks_english);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tell customers about yourself</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your profile is what customers see before booking. A great bio wins more jobs.
        </p>
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700">
          About you <span className="text-slate-400 font-normal">(shown on your public profile)</span>
        </label>
        <textarea
          rows={4}
          value={draft.bio}
          onChange={(e) => onChange({ bio: e.target.value })}
          placeholder="e.g. Professional AC technician with 8 years of experience in installation and maintenance..."
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
        />
        <p className="text-xs text-slate-400">{draft.bio.length} characters (20 minimum)</p>
      </div>

      {/* Years of experience */}
      <div className="space-y-1.5">
        <label className="block text-sm font-semibold text-slate-700">Years of experience</label>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 5, 8, 10, 15, 20].map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => onChange({ years_experience: yr })}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                draft.years_experience === yr
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'
              }`}
            >
              {yr}+ yr{yr === 1 ? '' : 's'}
            </button>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">Languages spoken</label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { key: 'speaks_arabic', label: 'Arabic' },
              { key: 'speaks_english', label: 'English' },
              { key: 'speaks_urdu', label: 'Urdu' },
              { key: 'speaks_hindi', label: 'Hindi' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => onChange({ [key]: !draft[key] })}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                draft[key]
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {draft[key] && <IconCheck className="h-3.5 w-3.5" stroke={2.5} />}
              {label}
            </button>
          ))}
        </div>
        {!draft.speaks_arabic && !draft.speaks_english && (
          <p className="text-xs text-amber-600">Select at least one language</p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <IconX className="h-4 w-4 shrink-0" stroke={2} />
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={!canContinue || saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 sm:w-auto"
      >
        {saving ? (
          <IconLoader2 className="h-4 w-4 animate-spin" stroke={1.5} />
        ) : (
          <IconArrowRight className="h-4 w-4" stroke={2} />
        )}
        Continue
      </button>
    </div>
  );
}

// ─── Step 2: Category selection ───────────────────────────────────────────────

function Step2Category({
  selected,
  onSelect,
  saving,
  error,
  onBack,
}: {
  selected: MarketplaceCategoryKey | null;
  onSelect: (key: MarketplaceCategoryKey) => void;
  saving: boolean;
  error: string | null;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Which main category fits your business best?
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose the broad category now. On the next setup step, you will list the exact services
          customers can search for inside that category.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <IconX className="h-4 w-4 shrink-0" stroke={2} />
          {error}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Broad category first, specifics next
        </p>
        <p className="text-sm text-slate-500">
          Pick the main category that best fits your business. In your marketplace profile,
          you&apos;ll then list the exact jobs you do, like mesh network setup, duct cleaning, or
          water heater repair.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-1">
        {MARKETPLACE_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => !saving && onSelect(cat.key)}
            disabled={saving}
            className={`group relative w-full rounded-xl border px-5 py-4 text-left transition ${
              selected === cat.key
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
            } disabled:opacity-60`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                  Marketplace Category
                </p>
                <p className="text-base font-semibold text-slate-900">{cat.label_en}</p>
                <p className="mt-0.5 text-sm text-slate-500">{cat.description}</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {cat.preset_skills.slice(0, 3).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div
                className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
                  selected === cat.key
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600'
                }`}
              >
                {saving && selected === cat.key ? (
                  <IconLoader2 className="h-4 w-4 animate-spin" stroke={1.5} />
                ) : selected === cat.key ? (
                  <IconCheck className="h-4 w-4" stroke={2.5} />
                ) : (
                  <IconArrowRight className="h-4 w-4" stroke={2} />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onBack}
        disabled={saving}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
      >
        <IconChevronLeft className="h-4 w-4" stroke={2} />
        Back
      </button>
    </div>
  );
}

// ─── Step 3: Skills / services ────────────────────────────────────────────────

function Step3Skills({
  categoryKey,
  skills,
  onTogglePreset,
  onAddCustom,
  onRemoveSkill,
  onUpdateSkill,
  onNext,
  onBack,
  saving,
  error,
}: {
  categoryKey: MarketplaceCategoryKey;
  skills: SkillEntry[];
  onTogglePreset: (title: string) => void;
  onAddCustom: (title: string) => void;
  onRemoveSkill: (id: string) => void;
  onUpdateSkill: (id: string, patch: Partial<SkillEntry>) => void;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [customInput, setCustomInput] = useState('');
  const category = getCategoryByKey(categoryKey)!;
  const selectedTitles = new Set(skills.map((s) => s.title));

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    onAddCustom(trimmed);
    setCustomInput('');
  };

  const canContinue = skills.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          What specific services do you offer?
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Select from the common {category.label_en} services below, or add your own. Customers
          search for these exact services on the marketplace.
        </p>
      </div>

      {/* Preset skill chips */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Common {category.label_en} services
        </p>
        <div className="flex flex-wrap gap-2">
          {category.preset_skills.map((skill) => {
            const active = selectedTitles.has(skill);
            return (
              <button
                key={skill}
                type="button"
                onClick={() => onTogglePreset(skill)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-slate-50'
                }`}
              >
                {active && <IconCheck className="h-3.5 w-3.5" stroke={2.5} />}
                {skill}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom skill entry */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Add a custom service
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="e.g. Underfloor Heating Repair..."
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customInput.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
          >
            <IconPlus className="h-4 w-4" stroke={2} />
            Add
          </button>
        </div>
      </div>

      {/* Selected services list */}
      {skills.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Your services ({skills.length})
          </p>
          <div className="space-y-2">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 truncate">
                  {skill.title}
                </span>
                <select
                  value={skill.pricing_type}
                  onChange={(e) =>
                    onUpdateSkill(skill.id, {
                      pricing_type: e.target.value as 'FIXED' | 'HOURLY' | 'QUOTE',
                      price_sar: '',
                    })
                  }
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-400"
                >
                  <option value="QUOTE">Quote</option>
                  <option value="FIXED">Fixed price</option>
                  <option value="HOURLY">Per hour</option>
                </select>
                {skill.pricing_type !== 'QUOTE' && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500">SAR</span>
                    <input
                      type="number"
                      min="0"
                      max="50000"
                      value={skill.price_sar}
                      onChange={(e) => onUpdateSkill(skill.id, { price_sar: e.target.value })}
                      placeholder="0"
                      className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-emerald-400"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveSkill(skill.id)}
                  className="text-slate-400 hover:text-red-500 transition"
                >
                  <IconX className="h-4 w-4" stroke={2} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <IconX className="h-4 w-4 shrink-0" stroke={2} />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <IconChevronLeft className="h-4 w-4" stroke={2} />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue || saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 sm:flex-none"
        >
          {saving ? (
            <IconLoader2 className="h-4 w-4 animate-spin" stroke={1.5} />
          ) : (
            <IconArrowRight className="h-4 w-4" stroke={2} />
          )}
          Save services & continue
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Coverage & payout ────────────────────────────────────────────────

function Step4Payout({
  payout,
  availability,
  onChange,
  onAvailabilityChange,
  onSubmit,
  onBack,
  saving,
  error,
}: {
  payout: PayoutDraft;
  availability: ReturnType<typeof defaultAvailability>;
  onChange: (patch: Partial<PayoutDraft>) => void;
  onAvailabilityChange: (day: string, field: 'is_available' | 'open_time' | 'close_time', value: any) => void;
  onSubmit: () => void;
  onBack: () => void;
  saving: boolean;
  error: string | null;
}) {
  const toggleDistrict = (d: string) => {
    onChange({
      service_districts: payout.service_districts.includes(d)
        ? payout.service_districts.filter((x) => x !== d)
        : [...payout.service_districts, d],
    });
  };

  const canSubmit =
    payout.iban.match(/^SA\d{22}$/) &&
    payout.bank_name.trim().length > 0 &&
    payout.service_districts.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Coverage & payment setup</h1>
        <p className="mt-1 text-sm text-slate-500">
          Where do you serve customers in Riyadh? Add your bank details to receive payments.
        </p>
      </div>

      {/* Service districts */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">
          Service districts in Riyadh{' '}
          <span className="text-slate-400 font-normal">(select all that apply)</span>
        </label>
        <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 p-3">
          {RIYADH_DISTRICTS.map((d) => {
            const active = payout.service_districts.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDistrict(d)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
        {payout.service_districts.length > 0 && (
          <p className="text-xs text-emerald-600">{payout.service_districts.length} district(s) selected</p>
        )}
      </div>

      {/* Availability */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">Your weekly availability</label>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Day</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Available</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">From</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">To</th>
              </tr>
            </thead>
            <tbody>
              {availability.map((slot) => (
                <tr key={slot.day_of_week} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-slate-700">
                    {DAY_LABELS[slot.day_of_week]}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        onAvailabilityChange(slot.day_of_week, 'is_available', !slot.is_available)
                      }
                      className={`relative h-5 w-9 rounded-full transition ${
                        slot.is_available ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          slot.is_available ? 'left-4' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="time"
                      value={slot.open_time}
                      disabled={!slot.is_available}
                      onChange={(e) =>
                        onAvailabilityChange(slot.day_of_week, 'open_time', e.target.value)
                      }
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-40"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="time"
                      value={slot.close_time}
                      disabled={!slot.is_available}
                      onChange={(e) =>
                        onAvailabilityChange(slot.day_of_week, 'close_time', e.target.value)
                      }
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 outline-none focus:border-emerald-400 disabled:opacity-40"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* IBAN */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Saudi IBAN</label>
          <input
            type="text"
            value={payout.iban}
            onChange={(e) => onChange({ iban: e.target.value.toUpperCase().replace(/\s/g, '') })}
            placeholder="SA0000000000000000000000"
            maxLength={24}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-mono text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          {payout.iban && !payout.iban.match(/^SA\d{22}$/) && (
            <p className="text-xs text-red-500">Must be SA followed by 22 digits</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-700">Bank name</label>
          <input
            type="text"
            value={payout.bank_name}
            onChange={(e) => onChange({ bank_name: e.target.value })}
            placeholder="e.g. Al Rajhi Bank"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <IconX className="h-4 w-4 shrink-0" stroke={2} />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <IconChevronLeft className="h-4 w-4" stroke={2} />
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 sm:flex-none"
        >
          {saving ? (
            <IconLoader2 className="h-4 w-4 animate-spin" stroke={1.5} />
          ) : (
            <IconCheck className="h-4 w-4" stroke={2.5} />
          )}
          Complete setup
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketplaceProSetupPage() {
  const router = useRouter();
  const initialized = useRef(false);

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 data
  const [profile, setProfile] = useState<ProProfile>({
    bio: '',
    years_experience: 3,
    speaks_arabic: true,
    speaks_english: false,
    speaks_urdu: false,
    speaks_hindi: false,
  });

  // Step 2 data
  const [selectedCategory, setSelectedCategory] = useState<MarketplaceCategoryKey | null>(null);

  // Step 3 data
  const [skills, setSkills] = useState<SkillEntry[]>([]);

  // Step 4 data
  const [payout, setPayout] = useState<PayoutDraft>({
    iban: '',
    bank_name: '',
    service_districts: [],
  });
  const [availability, setAvailability] = useState(defaultAvailability());

  // Load existing pro profile on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      try {
        const pro = await apiClient.getMyProProfile();
        if (!pro) { setLoading(false); return; }

        if (pro.status === 'ACTIVE') {
          router.replace('/dashboard');
          return;
        }

        // Pre-fill from existing data
        if (pro.bio) setProfile((p) => ({ ...p, bio: pro.bio }));
        if (typeof pro.years_experience === 'number')
          setProfile((p) => ({ ...p, years_experience: pro.years_experience }));
        if (typeof pro.speaks_arabic === 'boolean')
          setProfile((p) => ({ ...p, speaks_arabic: pro.speaks_arabic }));
        if (typeof pro.speaks_english === 'boolean')
          setProfile((p) => ({ ...p, speaks_english: pro.speaks_english }));
        if (typeof pro.speaks_urdu === 'boolean')
          setProfile((p) => ({ ...p, speaks_urdu: pro.speaks_urdu }));
        if (typeof pro.speaks_hindi === 'boolean')
          setProfile((p) => ({ ...p, speaks_hindi: pro.speaks_hindi }));

        // If still on identity step (step 1), silently advance it so the profile
        // step is unlocked. The identity/KYC doc can be uploaded later from the dashboard.
        const onboardingStep = pro.onboarding_step ?? 1;
        if (onboardingStep === 1) {
          try {
            await apiClient.proOnboardIdentity();
          } catch {
            // Already past step 1, or identity call not supported — continue
          }
        }

        // Map backend onboarding_step → UI step
        // Backend: 1=identity, 2=profile, 3=services, 4=payout, 5=complete
        // Frontend: 1=profile, 2=category, 3=skills, 4=payout
        if (onboardingStep >= 3) setStep(2); // past profile → show category
        if (onboardingStep >= 4) setStep(4); // past services → show payout
      } catch {
        // New pro or profile not found — start from step 1
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [router]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    try {
      // Ensure identity step is advanced first (silently) in case init didn't run it
      try { await apiClient.proOnboardIdentity(); } catch { /* already past step 1 */ }

      await apiClient.proOnboardProfile({
        bio: profile.bio.trim(),
        years_experience: profile.years_experience,
        speaks_arabic: profile.speaks_arabic,
        speaks_english: profile.speaks_english,
        speaks_urdu: profile.speaks_urdu || undefined,
        speaks_hindi: profile.speaks_hindi || undefined,
      });
      setStep(2);
    } catch (err: any) {
      setError(err?.message || 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectCategory = useCallback(
    async (key: MarketplaceCategoryKey) => {
      setSelectedCategory(key);
      setError(null);

      // Auto-fill bio if still empty / default
      const cat = getCategoryByKey(key);
      if (cat && !profile.bio.trim()) {
        setProfile((p) => ({ ...p, bio: cat.bio_template }));
      }

      // Pre-select common skills for the category
      if (cat) {
        setSkills(
          cat.preset_skills.slice(0, 3).map((title) => ({
            id: mkId(),
            title,
            pricing_type: 'QUOTE',
            price_sar: '',
            is_preset: true,
          })),
        );
      }

      setStep(3);
    },
    [profile.bio],
  );

  const handleTogglePreset = useCallback((title: string) => {
    setSkills((prev) => {
      const exists = prev.find((s) => s.title === title);
      if (exists) {
        return prev.filter((s) => s.title !== title);
      }
      return [
        ...prev,
        { id: mkId(), title, pricing_type: 'QUOTE', price_sar: '', is_preset: true },
      ];
    });
  }, []);

  const handleAddCustom = useCallback((title: string) => {
    setSkills((prev) => {
      if (prev.find((s) => s.title.toLowerCase() === title.toLowerCase())) return prev;
      return [
        ...prev,
        { id: mkId(), title, pricing_type: 'QUOTE', price_sar: '', is_preset: false },
      ];
    });
  }, []);

  const handleRemoveSkill = useCallback((id: string) => {
    setSkills((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleUpdateSkill = useCallback((id: string, patch: Partial<SkillEntry>) => {
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const handleSaveServices = async () => {
    if (!selectedCategory || skills.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const services = skills.map((skill) => {
        const priceSar = parseFloat(skill.price_sar);
        const base = {
          category: selectedCategory,
          title: skill.title,
          pricing_type: skill.pricing_type,
          vat_included: false,
        };
        if (skill.pricing_type !== 'QUOTE' && !isNaN(priceSar) && priceSar > 0) {
          return { ...base, price_sar: priceSar };
        }
        return base;
      });
      await apiClient.proOnboardServices({ services });
      setStep(4);
    } catch {
      setError('Could not save your services. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAvailabilityChange = (
    day: string,
    field: 'is_available' | 'open_time' | 'close_time',
    value: any,
  ) => {
    setAvailability((prev) =>
      prev.map((slot) => (slot.day_of_week === day ? { ...slot, [field]: value } : slot)),
    );
  };

  const handleCompletePayout = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiClient.proOnboardPayout({
        iban: payout.iban,
        bank_name: payout.bank_name.trim(),
        service_districts: payout.service_districts,
        availability: availability.filter((s) => s.is_available),
      });
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Could not complete setup. Please check your details and try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-500">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <StepIndicator current={step} total={4} />

        {step === 1 && (
          <Step1Profile
            draft={profile}
            onChange={(patch) => setProfile((p) => ({ ...p, ...patch }))}
            onNext={handleSaveProfile}
            saving={saving}
            error={error}
          />
        )}

        {step === 2 && (
          <Step2Category
            selected={selectedCategory}
            onSelect={handleSelectCategory}
            saving={saving}
            error={error}
            onBack={() => { setError(null); setStep(1); }}
          />
        )}

        {step === 3 && selectedCategory && (
          <Step3Skills
            categoryKey={selectedCategory}
            skills={skills}
            onTogglePreset={handleTogglePreset}
            onAddCustom={handleAddCustom}
            onRemoveSkill={handleRemoveSkill}
            onUpdateSkill={handleUpdateSkill}
            onNext={handleSaveServices}
            onBack={() => { setError(null); setStep(2); }}
            saving={saving}
            error={error}
          />
        )}

        {step === 4 && (
          <Step4Payout
            payout={payout}
            availability={availability}
            onChange={(patch) => setPayout((p) => ({ ...p, ...patch }))}
            onAvailabilityChange={handleAvailabilityChange}
            onSubmit={handleCompletePayout}
            onBack={() => { setError(null); setStep(3); }}
            saving={saving}
            error={error}
          />
        )}
      </div>
    </div>
  );
}
