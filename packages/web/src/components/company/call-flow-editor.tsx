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

function defaultLabel(index: number) {
  return `Question ${index + 1}`;
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
    const nextIndex = questions.length + 1;
    const nextId = `custom-${Date.now()}`;
    onChange(
      normalizeOrder([
        ...questions,
        {
          id: nextId,
          field_key: `custom_question_${nextIndex}`,
          label: defaultLabel(nextIndex - 1),
          prompt: 'What else should we ask before booking?',
          required: true,
          enabled: true,
          order: questions.length,
        },
      ]),
    );
  };

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
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                      Step {index + 1}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Asked before scheduling
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Keep this in plain language. Write it the same way you want the AI to say it on live calls.
                  </p>
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

            <div className="px-5 py-5">
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Question your AI will ask
                </span>
                <textarea
                  value={question.prompt}
                  onChange={(e) =>
                    updateQuestion(question.id, {
                      prompt: e.target.value,
                      label: question.label || defaultLabel(index),
                    })
                  }
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </label>
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
