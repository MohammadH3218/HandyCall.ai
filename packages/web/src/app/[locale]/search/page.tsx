import { redirect } from 'next/navigation';

type Props = { params: { locale: string } };

export default function LocaleSearchPage({ params }: Props) {
  redirect(params.locale === 'en' ? '/search' : '/search');
}
