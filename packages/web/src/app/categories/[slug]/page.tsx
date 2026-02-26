import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import {
  Wrench, Wind, Zap, Bug, Sparkles, TreePine, Home, Paintbrush,
  Hammer, Truck, Droplets, Flame, Shield, Monitor, Layers, Scissors,
  Star, CheckCircle, ArrowRight,
} from 'lucide-react';

const CATEGORY_DATA: Record<string, {
  name: string;
  icon: any;
  color: string;
  description: string;
  longDescription: string;
  services: string[];
  faqs: { q: string; a: string }[];
  avgCost: string;
  keywords: string;
}> = {
  plumbing: {
    name: 'Plumbing',
    icon: Wrench,
    color: 'bg-blue-50 text-blue-600',
    description: 'Expert plumbers for any repair or installation',
    longDescription: 'From leaky faucets to full pipe replacements, our verified plumbers handle every job with speed and care. Available for emergency and scheduled appointments.',
    services: ['Leak repair', 'Drain cleaning', 'Water heater installation', 'Pipe replacement', 'Toilet repair', 'Sump pump installation', 'Gas line services'],
    faqs: [
      { q: 'How quickly can a plumber arrive?', a: 'Many of our plumbers offer same-day and emergency service, often arriving within 1–2 hours.' },
      { q: 'Are plumbers licensed and insured?', a: 'Yes — all HandyCall plumbers are licensed, insured, and background-checked before joining the platform.' },
      { q: 'How much does a plumber cost?', a: 'Most plumbing jobs range from $150–$500 for standard repairs. Emergency calls may have additional fees.' },
    ],
    avgCost: '$150 – $500',
    keywords: 'plumber near me, plumbing repair, drain cleaning',
  },
  hvac: {
    name: 'HVAC',
    icon: Wind,
    color: 'bg-sky-50 text-sky-600',
    description: 'AC, heating, and ventilation experts',
    longDescription: 'Keep your home comfortable year-round with our certified HVAC technicians. We handle installation, maintenance, and emergency repairs for all major brands.',
    services: ['AC repair & installation', 'Furnace service', 'Duct cleaning', 'Heat pump service', 'Thermostat installation', 'Indoor air quality', 'Seasonal tune-ups'],
    faqs: [
      { q: 'How often should I service my HVAC?', a: 'Twice a year — once before summer and once before winter — is the standard recommendation.' },
      { q: 'What brands do technicians work with?', a: 'Our HVAC pros are certified on all major brands including Carrier, Lennox, Trane, York, and Rheem.' },
      { q: 'How much does AC repair cost?', a: 'AC repairs typically range from $150–$1,500 depending on the issue. Refrigerant recharges and compressor replacements cost more.' },
    ],
    avgCost: '$150 – $1,500',
    keywords: 'HVAC repair near me, AC service, furnace repair',
  },
  electrical: {
    name: 'Electrical',
    icon: Zap,
    color: 'bg-yellow-50 text-yellow-600',
    description: 'Licensed electricians for safe, reliable work',
    longDescription: 'Don\'t risk DIY electrical work. Our licensed electricians handle everything from outlet installation to full panel upgrades, all up to code.',
    services: ['Outlet & switch installation', 'Panel upgrades', 'Ceiling fan installation', 'EV charger installation', 'Lighting installation', 'Safety inspections', 'Generator hookup'],
    faqs: [
      { q: 'Do I need a permit for electrical work?', a: 'Most significant electrical work requires a permit. Our electricians handle the permit process for you.' },
      { q: 'How quickly can an electrician come out?', a: 'Many of our electricians offer next-day and same-day availability for urgent issues.' },
      { q: 'How much does electrical work cost?', a: 'Basic jobs like outlet installation start around $100–$200. Panel upgrades can range from $1,000–$3,000.' },
    ],
    avgCost: '$100 – $3,000',
    keywords: 'electrician near me, electrical repair, panel upgrade',
  },
  cleaning: {
    name: 'Cleaning',
    icon: Sparkles,
    color: 'bg-violet-50 text-violet-600',
    description: 'Professional house cleaning services',
    longDescription: 'Vetted, reliable cleaning professionals for regular housekeeping, deep cleans, move-in/out service, and everything in between.',
    services: ['Standard house cleaning', 'Deep cleaning', 'Move-in/move-out cleaning', 'Post-construction cleanup', 'Recurring weekly/biweekly service', 'Carpet cleaning', 'Window washing'],
    faqs: [
      { q: 'Do cleaners bring their own supplies?', a: 'Most cleaners bring professional-grade supplies and equipment, though you can also request they use your products.' },
      { q: 'How long does a house cleaning take?', a: 'A standard 2-bedroom home takes 2–3 hours. Deep cleans and larger homes take longer.' },
      { q: 'How much does house cleaning cost?', a: 'Standard cleanings range from $100–$250 depending on home size. Deep cleans start around $200.' },
    ],
    avgCost: '$100 – $300',
    keywords: 'house cleaning near me, maid service, deep cleaning',
  },
  landscaping: {
    name: 'Landscaping',
    icon: TreePine,
    color: 'bg-emerald-50 text-emerald-600',
    description: 'Lawn care, landscaping, and outdoor services',
    longDescription: 'Transform your outdoor space with our experienced landscapers. From routine lawn maintenance to complete landscape redesigns.',
    services: ['Lawn mowing', 'Tree trimming & removal', 'Garden design & planting', 'Irrigation installation', 'Mulching & edging', 'Leaf removal', 'Hardscaping'],
    faqs: [
      { q: 'Do landscapers offer recurring service?', a: 'Yes — many pros offer weekly, biweekly, or monthly contracts for ongoing lawn care.' },
      { q: 'What\'s included in a standard lawn service?', a: 'Typically mowing, edging, and blowing. Additional services like fertilizing or aeration cost extra.' },
      { q: 'How much does landscaping cost?', a: 'Basic lawn mowing starts around $40–$80/visit. Full landscape design projects range from $500–$10,000+.' },
    ],
    avgCost: '$40 – $500',
    keywords: 'landscaping near me, lawn care, tree service',
  },
  handyman: {
    name: 'Handyman',
    icon: Hammer,
    color: 'bg-amber-50 text-amber-600',
    description: 'Reliable handymen for any home repair',
    longDescription: 'Got a list of repairs piling up? Our handymen tackle any project — from hanging shelves to patching drywall — quickly and affordably.',
    services: ['Furniture assembly', 'Drywall repair', 'Shelf & TV mounting', 'Door & lock repair', 'Caulking & weatherstripping', 'Deck repair', 'Pressure washing'],
    faqs: [
      { q: 'What projects can a handyman handle?', a: 'General repairs, furniture assembly, mounting, painting touch-ups, and minor plumbing or electrical (no permits required).' },
      { q: 'Do handymen charge by the hour or per project?', a: 'Both — some charge $50–$100/hour, others offer flat rates per project. You\'ll see pricing upfront before booking.' },
      { q: 'How do I book a handyman?', a: 'Browse profiles, pick a time, and confirm. For larger projects, request a free quote first.' },
    ],
    avgCost: '$50 – $500',
    keywords: 'handyman near me, home repair, furniture assembly',
  },
  'pest-control': {
    name: 'Pest Control',
    icon: Bug,
    color: 'bg-orange-50 text-orange-600',
    description: 'Expert extermination and pest prevention',
    longDescription: 'Protect your home from ants, rodents, termites, and more. Our licensed pest control pros use safe, effective treatments with guaranteed results.',
    services: ['General pest treatment', 'Termite inspection & treatment', 'Rodent control', 'Bed bug treatment', 'Mosquito control', 'Wildlife removal', 'Preventive treatments'],
    faqs: [
      { q: 'Is pest control safe for kids and pets?', a: 'Our pros use EPA-approved, family-safe treatments and will advise you on any precautions needed.' },
      { q: 'How many treatments will I need?', a: 'Most infestations are resolved in 1–3 treatments. We offer recurring quarterly plans for ongoing prevention.' },
      { q: 'How much does pest control cost?', a: 'One-time treatments start around $100–$300. Annual prevention plans typically range from $400–$700.' },
    ],
    avgCost: '$100 – $500',
    keywords: 'pest control near me, exterminator, termite treatment',
  },
  roofing: {
    name: 'Roofing',
    icon: Home,
    color: 'bg-red-50 text-red-600',
    description: 'Trusted roofers for repairs and replacements',
    longDescription: 'From minor leak repairs to complete roof replacements, our licensed roofers deliver quality workmanship backed by warranties.',
    services: ['Roof inspection', 'Leak repair', 'Shingle replacement', 'Full roof replacement', 'Gutter installation & repair', 'Flat roof repair', 'Emergency tarping'],
    faqs: [
      { q: 'How do I know if I need a repair or full replacement?', a: 'Our pros offer free inspections. Most roofs under 20 years old can be repaired; older roofs may need replacement.' },
      { q: 'Do roofers work with insurance claims?', a: 'Yes — many of our roofers are experienced with insurance claims and can help document damage.' },
      { q: 'How much does roof replacement cost?', a: 'A standard asphalt shingle roof replacement costs $5,000–$15,000 depending on size and materials.' },
    ],
    avgCost: '$300 – $15,000',
    keywords: 'roofer near me, roof repair, roof replacement',
  },
  painting: {
    name: 'Painting',
    icon: Paintbrush,
    color: 'bg-pink-50 text-pink-600',
    description: 'Professional interior and exterior painters',
    longDescription: 'Refresh your home with a professional paint job. Our painters provide flawless results with premium materials and clean, efficient service.',
    services: ['Interior painting', 'Exterior painting', 'Cabinet painting', 'Deck staining', 'Drywall repair & texture', 'Commercial painting', 'Wallpaper removal'],
    faqs: [
      { q: 'Do painters supply paint?', a: 'Many do — or you can choose your own colors and they\'ll use your materials. Specify your preference when booking.' },
      { q: 'How long does house painting take?', a: 'A single room takes 4–8 hours. A full home exterior takes 3–5 days depending on size.' },
      { q: 'How much does painting cost?', a: 'Interior rooms average $200–$600 per room. Full exterior painting typically runs $2,500–$8,000.' },
    ],
    avgCost: '$200 – $8,000',
    keywords: 'painter near me, house painting, exterior painting',
  },
};

// Generate static params for known categories
export function generateStaticParams() {
  return Object.keys(CATEGORY_DATA).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const cat = CATEGORY_DATA[params.slug];
  if (!cat) return { title: 'Service Category' };
  return {
    title: `${cat.name} Services Near You — Find Local ${cat.name} Pros`,
    description: `${cat.description}. Browse verified ${cat.name.toLowerCase()} pros, compare reviews, and book online. ${cat.keywords}.`,
    openGraph: {
      title: `${cat.name} Services | HandyCall`,
      description: cat.longDescription,
    },
  };
}

export default function CategoryPage({ params }: { params: { slug: string } }) {
  const cat = CATEGORY_DATA[params.slug];
  if (!cat) notFound();

  const Icon = cat.icon;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-emerald-50 via-white to-slate-50 py-14">
          <div className="mx-auto max-w-5xl px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link href="/categories" className="hover:text-emerald-600">Categories</Link>
              <span>/</span>
              <span className="text-slate-900">{cat.name}</span>
            </div>

            <div className="flex items-start gap-6">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl shrink-0 ${cat.color}`}>
                <Icon className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  {cat.name} Services Near You
                </h1>
                <p className="mt-2 text-lg text-slate-600 max-w-2xl">{cat.longDescription}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/find-pros?category=${cat.name}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                  >
                    Find {cat.name} Pros <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={`/request?category=${cat.name}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 hover:border-emerald-300 transition"
                  >
                    Request a Quote
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-5xl px-4 py-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-8">
            {/* Services offered */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Services Included</h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {cat.services.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* FAQ */}
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-5">Frequently Asked Questions</h2>
              <div className="space-y-5">
                {cat.faqs.map((faq) => (
                  <div key={faq.q}>
                    <h3 className="font-semibold text-slate-900">{faq.q}</h3>
                    <p className="mt-1 text-sm text-slate-600">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Cost card */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 mb-1">Typical Cost Range</p>
              <p className="text-2xl font-bold text-slate-900">{cat.avgCost}</p>
              <p className="mt-1 text-xs text-emerald-700">Get a free custom quote from local pros</p>
            </div>

            {/* Trust */}
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
              <h3 className="font-semibold text-slate-900">Why HandyCall?</h3>
              {[
                'Background-checked professionals',
                'Read verified customer reviews',
                'Book online in under 2 minutes',
                'Satisfaction guaranteed',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-700">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <Link
              href={`/find-pros?category=${cat.name}`}
              className="block text-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition"
            >
              Find {cat.name} Pros Now
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
