export type CustomerProfile = {
  user_id?: string;
  profile_id?: string;
  email?: string;
  name?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  created_at?: number;
  updated_at?: number;
};

export function sanitizeUsPhoneDigits(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits.slice(0, 10);
}

export function sanitizeZip(value: string) {
  return value.replace(/\D/g, '').slice(0, 5);
}

export function formatUsPhoneDigits(value: string) {
  const digits = sanitizeUsPhoneDigits(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function splitFullName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

export function isCustomerProfileComplete(profile?: CustomerProfile | null) {
  return Boolean(
    profile &&
      String(profile.name || '').trim() &&
      String(profile.address_line1 || '').trim() &&
      String(profile.city || '').trim(),
  );
}
