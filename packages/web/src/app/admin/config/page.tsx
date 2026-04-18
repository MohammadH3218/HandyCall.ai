'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { IconLoader2, IconCheck, IconPencil } from '@tabler/icons-react';

export default function ConfigPage() {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setConfig(await apiClient.adminGetConfig()); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (key: string, current: any) => {
    setEditing(key);
    setEditValue(typeof current?.value === 'object' ? JSON.stringify(current.value) : String(current?.value ?? ''));
  };

  const save = async (key: string) => {
    setSaving(true);
    try {
      let value: any = editValue;
      try { value = JSON.parse(editValue); } catch {}
      await apiClient.adminUpdateConfig(key, value);
      setEditing(null);
      load();
    } catch {}
    setSaving(false);
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><IconLoader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>;

  const entries = Object.entries(config);

  return (
    <div className="px-8 py-10">
      <h1 className="text-[26px] font-bold text-slate-900">Platform Config</h1>
      <p className="mt-1 text-[14px] text-slate-400">Edit platform-level settings. Changes take effect immediately.</p>

      <div className="mt-6 rounded-2xl border border-border/80 bg-white shadow-sm">
        {entries.length === 0 ? (
          <p className="px-6 py-8 text-[14px] text-slate-400">No configuration entries found.</p>
        ) : (
          <ul>
            {entries.map(([key, entry], i) => (
              <li key={key} className={`flex items-start justify-between gap-4 px-6 py-4 ${i < entries.length - 1 ? 'border-b border-border/40' : ''}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-900">{key}</p>
                  {editing === key ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-emerald-200"
                      autoFocus
                    />
                  ) : (
                    <p className="mt-0.5 text-[13px] text-slate-500 font-mono">{
                      typeof entry?.value === 'object' ? JSON.stringify(entry.value) : String(entry?.value ?? '')
                    }</p>
                  )}
                  {entry?.updated_at && (
                    <p className="mt-0.5 text-[11px] text-slate-400">Updated {new Date(entry.updated_at).toLocaleString()}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {editing === key ? (
                    <button type="button" onClick={() => save(key)} disabled={saving}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                      {saving ? <IconLoader2 className="h-3.5 w-3.5 animate-spin" /> : <IconCheck className="h-3.5 w-3.5" />}
                      Save
                    </button>
                  ) : (
                    <button type="button" onClick={() => startEdit(key, entry)}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-200">
                      <IconPencil className="h-3.5 w-3.5" stroke={1.8} />
                      Edit
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
