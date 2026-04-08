type OnboardingStatus = {
  profile: boolean;
  billing: boolean;
  companyProfile: boolean;
  serviceArea: boolean;
  marketplaceProfile: boolean;
  calendar: boolean;
};

function resolveBooleanStep(
  explicitValue: boolean | undefined,
  fallbackValue: boolean,
) {
  if (explicitValue === true) return true;
  if (explicitValue === false) return false;
  return fallbackValue;
}

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

function hasMarketplaceProfileEntry(company: any | null) {
  const profile = company?.marketplace_profile;
  if (!profile || typeof profile !== 'object') return false;
  const serviceCities = Array.isArray(profile.service_cities) ? profile.service_cities : [];
  const servicesOffered = Array.isArray(profile.services_offered) ? profile.services_offered : [];
  return Boolean(
    String(profile.bio || '').trim() &&
      String(profile.service_category || '').trim() &&
      serviceCities.length > 0 &&
      servicesOffered.length > 0
  );
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
}): OnboardingStatus {
  const { company, userEmail, userFirstName, userLastName } = input;

  if (!company) {
    return {
      profile: false,
      billing: false,
      companyProfile: false,
      serviceArea: false,
      marketplaceProfile: false,
      calendar: false,
    };
  }

  const billing = Boolean(
    company.subscription_plan ||
      company.stripe_subscription_id ||
      (company.subscription_status &&
        (company.subscription_status === 'ACTIVE' || company.subscription_status === 'TRIALING')) ||
      (company.trial_ends_at && company.trial_ends_at > Date.now()),
  );

  const companyProfile = resolveBooleanStep(
    company.company_profile_completed,
    hasCompanyProfileEntry(company),
  );
  const serviceArea = resolveBooleanStep(
    company.service_area_completed,
    hasServiceAreaEntry(company),
  );
  const marketplaceProfile = resolveBooleanStep(
    company.marketplace_profile_completed,
    hasMarketplaceProfileEntry(company),
  );
  const calendar = resolveBooleanStep(
    company.calendar_setup_completed,
    hasInternalCalendarEntry(company) || hasExternalCalendarEntry(company),
  );
  const ownerName = String(company.owner_name || '').trim();
  const hasProfileName = Boolean(userFirstName || userLastName || ownerName);

  return {
    profile: Boolean(hasProfileName && (userEmail || company.email)),
    billing,
    companyProfile,
    serviceArea,
    marketplaceProfile,
    calendar,
  };
}
