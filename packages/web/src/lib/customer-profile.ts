export type CustomerProfile = {
  customer_id?: string;
  user_id?: string;
  profile_id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  district?: string;
  address_line1?: string;
  address_line2?: string;
  address_latitude?: number;
  address_longitude?: number;
  city?: string;
  preferred_language?: 'ar' | 'en';
  marketing_consent?: boolean;
  created_at?: number;
  updated_at?: number;
  // Legacy compatibility fields still read by older customer pages.
  name?: string;
  phone?: string;
  state?: string;
  zipcode?: string;
};

export function sanitizeUsPhoneDigits(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits.slice(0, 10);
}

export function sanitizeSaudiPhoneLocalDigits(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('966')) return digits.slice(3, 12);
  if (digits.startsWith('05')) return digits.slice(1, 10);
  if (digits.startsWith('5')) return digits.slice(0, 9);
  return digits.slice(0, 9);
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

export function normalizeCustomerProfile(profile?: Partial<CustomerProfile> | null): CustomerProfile {
  const firstName = String(profile?.first_name || '').trim();
  const lastName = String(profile?.last_name || '').trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const phoneNumber = String(profile?.phone_number || profile?.phone || '').trim();
  const district = String(profile?.district || profile?.state || '').trim();

  return {
    ...profile,
    first_name: firstName,
    last_name: lastName,
    phone_number: phoneNumber || undefined,
    district: district || undefined,
    city: String(profile?.city || 'Riyadh').trim() || 'Riyadh',
    name: String(profile?.name || fullName).trim() || undefined,
    phone: phoneNumber || undefined,
    state: district || undefined,
    zipcode: String(profile?.zipcode || '').trim() || undefined,
  };
}

export function isCustomerProfileComplete(profile?: CustomerProfile | null) {
  // Mirrors the required fields in the onboarding form: name, address, city.
  // state (district) and zipcode are optional in the form so are not required here.
  return Boolean(
    profile &&
      String(profile.name || '').trim() &&
      String(profile.address_line1 || '').trim() &&
      String(profile.city || '').trim(),
  );
}
