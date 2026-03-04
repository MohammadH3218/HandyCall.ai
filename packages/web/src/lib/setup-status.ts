type OnboardingStatus = {
  profile: boolean;
  billing: boolean;
  companyProfile: boolean;
  serviceArea: boolean;
  knowledge: boolean;
  calendar: boolean;
  phone: boolean;
};

function hasPricingProfileData(company: any | null) {
  const profile = company?.pricing_profile;
  if (!profile || typeof profile !== 'object') return false;
  return Object.values(profile).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'boolean') return true;
    return false;
  });
}

function hasCompanyProfileEntry(company: any | null) {
  if (!company) return false;
  return Boolean(
    String(company.company_name || '').trim() &&
      String(company.service_type || '').trim() &&
      String(company.timezone || '').trim(),
  );
}

function hasServiceAreaEntry(company: any | null) {
  if (!company) return false;
  const zips = Array.isArray(company.service_area_zipcodes) ? company.service_area_zipcodes : [];
  const cities = Array.isArray(company.service_area_cities) ? company.service_area_cities : [];
  return zips.length > 0 || cities.length > 0;
}

function hasInternalCalendarEntry(company: any | null) {
  if (!company || company.calendar_mode !== 'INTERNAL') return false;
  const hours = company.business_hours;
  if (!hours || typeof hours !== 'object') return false;
  return Object.keys(hours).length > 0;
}

function hasExternalCalendarEntry(company: any | null) {
  if (!company || company.calendar_mode !== 'EXTERNAL') return false;
  return company.calendar_provider && company.calendar_provider !== 'NONE';
}

export function computeOnboardingStatus(input: {
  company: any | null;
  userFirstName?: string | null;
  userLastName?: string | null;
  userEmail?: string | null;
  knowledgeCount: number | null;
  companyNumber: string | null;
}): OnboardingStatus {
  const { company, knowledgeCount, companyNumber, userEmail, userFirstName, userLastName } = input;

  if (!company) {
    return {
      profile: false,
      billing: false,
      companyProfile: false,
      serviceArea: false,
      knowledge: false,
      calendar: false,
      phone: false,
    };
  }

  const billing = Boolean(
    company.subscription_plan ||
      company.stripe_subscription_id ||
      (company.subscription_status &&
        (company.subscription_status === 'ACTIVE' || company.subscription_status === 'TRIALING')) ||
      (company.trial_ends_at && company.trial_ends_at > Date.now()),
  );

  const companyProfile = company.company_profile_completed === true || hasCompanyProfileEntry(company);
  const serviceArea = company.service_area_completed === true || hasServiceAreaEntry(company);
  const calendar =
    company.calendar_setup_completed === true ||
    hasInternalCalendarEntry(company) ||
    hasExternalCalendarEntry(company);
  const knowledge = (knowledgeCount !== null ? knowledgeCount > 0 : false) || hasPricingProfileData(company);
  const phone = Boolean(companyNumber || String(company.phone_number || '').trim());

  return {
    profile: Boolean((userFirstName || userLastName) && (userEmail || company.email)),
    billing,
    companyProfile,
    serviceArea,
    knowledge,
    calendar,
    phone,
  };
}

