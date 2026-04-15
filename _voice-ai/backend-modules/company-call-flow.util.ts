import { CompanyCallFlowQuestion } from '@handycall/shared';

type TemplateLike = {
  template_id?: string;
  name?: string;
  category?: string;
  base_system_prompt?: string;
  intake_schema?: {
    required?: string[];
    optional?: string[];
    conditional?: Record<string, any>;
    labels?: Record<string, string>;
    questions?: Array<{
      id?: string;
      field_key?: string;
      label?: string;
      prompt?: string;
      helper_text?: string;
      required?: boolean;
      enabled?: boolean;
      order?: number;
    }>;
  };
  booking_defaults?: Record<string, any>;
  tool_policy?: Record<string, any>;
};

function normalizeFieldKey(value: string | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function uniq(fields: string[]) {
  return fields.filter((field, index) => fields.indexOf(field) === index);
}

export function normalizeCompanyCallFlowQuestions(
  questions: CompanyCallFlowQuestion[] | undefined | null,
): CompanyCallFlowQuestion[] {
  if (!Array.isArray(questions)) return [];
  return questions
    .map((question, index) => {
      const field_key = normalizeFieldKey(question?.field_key);
      const prompt = String(question?.prompt || '').trim();
      const label = String(question?.label || field_key.replace(/_/g, ' ') || 'Question').trim();
      if (!field_key || !prompt || !label) return null;
      return {
        id: String(question?.id || `${field_key}-${index + 1}`),
        field_key,
        label,
        prompt,
        helper_text: question?.helper_text ? String(question.helper_text).trim() : undefined,
        required: question?.required !== false,
        enabled: question?.enabled !== false,
        order: Number.isFinite(Number(question?.order)) ? Number(question?.order) : index,
      } as CompanyCallFlowQuestion;
    })
    .filter((question): question is CompanyCallFlowQuestion => Boolean(question))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

export function applyCompanyCallFlowToTemplate(
  template: TemplateLike | null | undefined,
  questions: CompanyCallFlowQuestion[] | undefined | null,
): TemplateLike | undefined {
  if (!template) return undefined;
  const normalizedQuestions = normalizeCompanyCallFlowQuestions(questions).filter((question) => question.enabled !== false);
  if (!normalizedQuestions.length) return template;

  const existingRequired = Array.isArray(template.intake_schema?.required)
    ? template.intake_schema!.required!.map((field) => normalizeFieldKey(field)).filter(Boolean)
    : [];
  const existingOptional = Array.isArray(template.intake_schema?.optional)
    ? template.intake_schema!.optional!.map((field) => normalizeFieldKey(field)).filter(Boolean)
    : [];
  const hadPreferredTime =
    existingRequired.includes('preferred_time') || existingOptional.includes('preferred_time');

  const required = normalizedQuestions
    .filter((question) => question.required !== false && question.field_key !== 'preferred_time')
    .map((question) => question.field_key);
  const optional = normalizedQuestions
    .filter((question) => question.required === false && question.field_key !== 'preferred_time')
    .map((question) => question.field_key);

  const labels = normalizedQuestions.reduce<Record<string, string>>((acc, question) => {
    acc[question.field_key] = question.label;
    return acc;
  }, { ...(template.intake_schema?.labels || {}) });

  return {
    ...template,
    intake_schema: {
      ...(template.intake_schema || {}),
      required: uniq(hadPreferredTime ? [...required, 'preferred_time'] : required),
      optional: uniq([...existingOptional.filter((field) => !required.includes(field) && field !== 'preferred_time'), ...optional]),
      labels,
      questions: normalizedQuestions.map((question) => ({
        id: question.id,
        field_key: question.field_key,
        label: question.label,
        prompt: question.prompt,
        helper_text: question.helper_text,
        required: question.required !== false,
        enabled: question.enabled !== false,
        order: question.order || 0,
      })),
    },
  };
}
