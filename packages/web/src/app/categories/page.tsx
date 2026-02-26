import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

export const metadata: Metadata = {
  title: 'Browse Home Service Categories',
  description:
    'Find trusted professionals across 16+ home service categories — plumbing, HVAC, electrical, cleaning, landscaping, and more. Instant quotes, verified reviews.',
  openGraph: {
    title: 'Browse Home Service Categories | HandyCall',
    description: 'Plumbing, HVAC, electrical, cleaning, landscaping, handyman & more. Book in minutes.',
  },
};
import {
  Wrench, Wind, Zap, Bug, Sparkles, TreePine, Home, Paintbrush,
  Hammer, Truck, Droplets, Flame, Shield, Monitor, Layers, Scissors,
} from 'lucide-react';

const categories = [
  { slug: 'plumbing', name: 'Plumbing', icon: Wrench, color: 'bg-blue-50 text-blue-600', description: 'Pipe repair, water heaters, drain cleaning & more', count: '2,400+' },
  { slug: 'hvac', name: 'HVAC', icon: Wind, color: 'bg-sky-50 text-sky-600', description: 'AC repair, furnace service, duct cleaning', count: '1,800+' },
  { slug: 'electrical', name: 'Electrical', icon: Zap, color: 'bg-yellow-50 text-yellow-600', description: 'Wiring, panel upgrades, outlet installation', count: '1,600+' },
  { slug: 'pest-control', name: 'Pest Control', icon: Bug, color: 'bg-orange-50 text-orange-600', description: 'Extermination, prevention, wildlife removal', count: '900+' },
  { slug: 'cleaning', name: 'Cleaning', icon: Sparkles, color: 'bg-violet-50 text-violet-600', description: 'House cleaning, deep clean, move-in/out cleaning', count: '3,200+' },
  { slug: 'landscaping', name: 'Landscaping', icon: TreePine, color: 'bg-emerald-50 text-emerald-600', description: 'Lawn care, tree service, garden design', count: '2,100+' },
  { slug: 'roofing', name: 'Roofing', icon: Home, color: 'bg-red-50 text-red-600', description: 'Roof repair, replacement, gutter installation', count: '800+' },
  { slug: 'painting', name: 'Painting', icon: Paintbrush, color: 'bg-pink-50 text-pink-600', description: 'Interior & exterior painting, drywall repair', count: '1,400+' },
  { slug: 'handyman', name: 'Handyman', icon: Hammer, color: 'bg-amber-50 text-amber-600', description: 'General repairs, furniture assembly, odd jobs', count: '4,100+' },
  { slug: 'moving', name: 'Moving', icon: Truck, color: 'bg-slate-100 text-slate-600', description: 'Local & long-distance moving, packing help', count: '1,200+' },
  { slug: 'waterproofing', name: 'Waterproofing', icon: Droplets, color: 'bg-cyan-50 text-cyan-600', description: 'Basement waterproofing, sump pumps, crawl space', count: '400+' },
  { slug: 'chimney', name: 'Chimney & Fireplace', icon: Flame, color: 'bg-orange-50 text-orange-700', description: 'Chimney cleaning, inspection, fireplace repair', count: '300+' },
  { slug: 'home-security', name: 'Home Security', icon: Shield, color: 'bg-indigo-50 text-indigo-600', description: 'Alarm systems, cameras, smart locks', count: '700+' },
  { slug: 'smart-home', name: 'Smart Home', icon: Monitor, color: 'bg-teal-50 text-teal-600', description: 'Automation, AV installation, smart thermostats', count: '550+' },
  { slug: 'flooring', name: 'Flooring', icon: Layers, color: 'bg-amber-50 text-amber-700', description: 'Hardwood, tile, carpet, vinyl installation', count: '1,100+' },
  { slug: 'lawn-care', name: 'Lawn Care', icon: Scissors, color: 'bg-lime-50 text-lime-600', description: 'Mowing, edging, fertilizing, aerating', count: '2,800+' },
];

export default function CategoriesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-emerald-50 via-white to-slate-50 py-14 text-center">
          <div className="mx-auto max-w-2xl px-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Browse Home Service Categories
            </h1>
            <p className="mt-3 text-lg text-slate-600">
              Find the right professional for any home service need. All pros are vetted, reviewed, and ready to book.
            </p>
          </div>
        </section>

        {/* Categories grid */}
        <section className="py-14">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.slug}
                    href={`/categories/${cat.slug}`}
                    className="group flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-200"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700">
                        {cat.name}
                      </h3>
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                        {cat.description}
                      </p>
                    </div>
                    <p className="text-xs font-medium text-emerald-600 mt-auto">
                      {cat.count} pros near you
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-emerald-600 py-12 text-center">
          <div className="mx-auto max-w-2xl px-4">
            <h2 className="text-2xl font-bold text-white">Don't see your category?</h2>
            <p className="mt-2 text-emerald-100">
              Search for any home service and we'll match you with the right pro.
            </p>
            <Link
              href="/find-pros"
              className="mt-6 inline-block rounded-xl bg-white px-8 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition"
            >
              Search All Services
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
