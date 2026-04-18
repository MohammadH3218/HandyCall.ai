export class OnboardingAccountSetupDto {
  id_type?: 'NATIONAL_ID' | 'IQAMA';
  id_number?: string;
  phone_number?: string;
  national_address_short?: string;
  national_address_building?: string;
  national_address_street?: string;
  national_address_district?: string;
  national_address_city?: string;
  national_address_postal_code?: string;
}
