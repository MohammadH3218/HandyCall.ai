export type TimezoneOption = {
  value: string;
  label: string;
};

export const DEFAULT_TIMEZONE = 'Asia/Riyadh';

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: 'Asia/Riyadh', label: 'Saudi Arabia Standard Time (AST)' },
];

export function hasTimezoneOption(value?: string | null) {
  if (!value) return false;
  return TIMEZONE_OPTIONS.some((option) => option.value === value);
}
