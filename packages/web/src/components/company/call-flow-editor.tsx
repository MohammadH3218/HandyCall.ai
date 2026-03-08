'use client';

import { CompanyCallFlowQuestion } from '@handycall/shared';
import {
  IconArrowDown,
  IconArrowUp,
  IconBolt,
  IconCircleCheck,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';

type Props = {
  questions: CompanyCallFlowQuestion[];
  onChange: (questions: CompanyCallFlowQuestion[]) => void;
  title?: string;
  subtitle?: string;
};

function normalizeOrder(questions: CompanyCallFlowQuestion[]) {
  return questions.map((question, index) => ({ ...question, order: index }));
}

export function CallFlowEditor({ questions, onChange, title, subtitle }: Props) {
  const updateQuestion = (id: string, updates: Partial<CompanyCallFlowQuestion>) => {
    onChange(
      normalizeOrder(
        questions.map((question) => (question.id === id ? { ...question, ...updates } : question)),
      ),
    );
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const next = [...questions];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange(normalizeOrder(next));
  };

  const removeQuestion = (id: string) => {
    onChange(normalizeOrder(questions.filter((question) => question.id !== id)));
  };

  const addQuestion = () => {
    const nextId = `custom-${Date.now()}`;
    onChange(
      normalizeOrder([
        ...questions,
        {
          id: nextId,
          field_key: `custom_question_${questions.length + 1}`,
          label: 'Custom question',
          prompt: 'What else should we ask before booking?',
          required: true,
          enabled: true,
          order: questions.length,
        },
      ]),
    );
  };

  const pillClass = (active: boolean, tone: 'emerald' | 'slate') =>
    [
      'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition',
      tone === 'emerald'
        ? active
          ? 'border-emerald-500 bg-emerald-600 text-white shadow-sm'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100'
        : active
          ? 'border-slate-400 bg-slate-700 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
    ].join(' ');

  return (
    <div className="space-y-5">
      {(title || subtitle) && (
        <div>
          {title ? <h3 className="text-base font-semibold text-slate-900">{title}</h3> : null}
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>
      )}

      <div className="space-y-4">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
          >
            <div className="border-b border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                      Question {index + 1}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        question.enabled !== false
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {question.enabled !== false ? 'Live in call flow' : 'Disabled'}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        question.required !== false
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {question.required !== false ? 'Required before scheduling' : 'Optional before scheduling'}
                    </span>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">{question.label || `Question ${index + 1}`}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      This question stays in the intake sequence before any date and time options appear.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveQuestion(index, -1)}
                    disabled={index === 0}
                    className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-35"
                    aria-label="Move question up"
                  >
                    <IconArrowUp className="h-4 w-4" stroke={1.8} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(index, 1)}
                    disabled={index === questions.length - 1}
                    className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-35"
                    aria-label="Move question down"
                  >
                    <IconArrowDown className="h-4 w-4" stroke={1.8} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuestion(question.id)}
                    className="rounded-full border border-rose-200 bg-rose-50 p-2.5 text-rose-600 transition hover:border-rose-300 hover:bg-rose-100"
                    aria-label="Delete question"
                  >
                    <IconTrash className="h-4 w-4" stroke={1.8} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Field key
                  </span>
                  <input
                    value={question.field_key}
                    onChange={(e) => updateQuestion(question.id, { field_key: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Internal label
                  </span>
                  <input
                    value={question.label}
                    onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Exact question the AI should ask
                </span>
                <textarea
                  value={question.prompt}
                  onChange={(e) => updateQuestion(question.id, { prompt: e.target.value })}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Scheduling gate</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuestion(question.id, { required: true })}
                      className={pillClass(question.required !== false, 'emerald')}
                    >
                      <IconCircleCheck className="h-4 w-4" stroke={1.8} />
                      Required before scheduling
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQuestion(question.id, { required: false })}
                      className={pillClass(question.required === false, 'slate')}
                    >
                      Optional
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Question status</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuestion(question.id, { enabled: true })}
                      className={pillClass(question.enabled !== false, 'emerald')}
                    >
                      <IconBolt className="h-4 w-4" stroke={1.8} />
                      Enabled
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQuestion(question.id, { enabled: false })}
                      className={pillClass(question.enabled === false, 'slate')}
                    >
                      Hidden
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addQuestion}
        className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-emerald-300 bg-[linear-gradient(180deg,rgba(236,253,245,1),rgba(240,253,250,1))] px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-50"
      >
        <IconPlus className="h-4 w-4" stroke={1.75} />
        Add question
      </button>
    </div>
  );
}
