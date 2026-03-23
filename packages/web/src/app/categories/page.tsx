import { Metadata } from 'next';
import { CategoriesPageClient } from '@/components/marketing/pages/CategoriesPageClient';

export const metadata: Metadata = {
  title: 'Browse Service Categories — HandyCall Saudi Arabia',
  description:
    'Browse all home service categories available across Saudi Arabia: AC repair, plumbing, electrical, cleaning, car washing, appliance repair, moving, and more.',
};

export default function CategoriesPage() {
  return <CategoriesPageClient />;
}
