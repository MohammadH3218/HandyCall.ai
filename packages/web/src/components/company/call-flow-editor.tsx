'use client';

import { CompanyCallFlowQuestion } from '@handycall/shared';
import { IconArrowDown, IconArrowUp, IconPlus, IconTrash } from '@tabler/icons-react';

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

  return (
    <div className="space-y-4">
      {(title || subtitle) && (
        <div>
          {title ? <h3 className="text-base font-semibold text-slate-900">{title}</h3> : null}
          {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
        </div>
      )}

      <div className="space-y-3">
        {questions.map((question, index) => (
          <div key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Question {index + 1}</p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  This will be asked before scheduling. Date and time is always handled last automatically.
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveQuestion(index, -1)}
                  disabled={index === 0}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                >
                  <IconArrowUp className="h-4 w-4" stroke={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => moveQuestion(index, 1)}
                  disabled={index === questions.length - 1}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                >
                  <IconArrowDown className="h-4 w-4" stroke={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => removeQuestion(question.id)}
                  className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                >
                  <IconTrash className="h-4 w-4" stroke={1.75} />
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Field key</span>
                <input
                  value={question.field_key}
                  onChange={(e) => updateQuestion(question.id, { field_key: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Internal label</span>
                <input
                  value={question.label}
                  onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Exact question the AI should ask</span>
              <textarea
                value={question.prompt}
                onChange={(e) => updateQuestion(question.id, { prompt: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={question.required !== false}
                  onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Required before scheduling
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={question.enabled !== false}
                  onChange={(e) => updateQuestion(question.id, { enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Enabled
              </label>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addQuestion}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
      >
        <IconPlus className="h-4 w-4" stroke={1.75} />
        Add question
      </button>
    </div>
  );
}
