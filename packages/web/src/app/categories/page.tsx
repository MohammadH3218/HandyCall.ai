import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { HOME_SERVICE_GROUPS } from '@/constants/home-services';
import {
  Wrench,
  Wind,
  Zap,
  Bug,
  Sparkles,
  TreePine,
  Home,
  Paintbrush,
  Hammer,
  Truck,
  Droplets,
  Flame,
  Shield,
  Monitor,
  Layers,
  Scissors,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Browse Home Service Categories',
  description:
    'Explore major and niche home service categories in one place. Search local pros by service type and availability.',
  openGraph: {
    title: 'Browse Home Service Categories | HandyCall',
    description: 'Explore core and niche home services and find the right local provider.',
  },
};

const primaryCategories = [
  { slug: 'plumbing', name: 'Plumbing', icon: Wrench, color: 'bg-blue-50 text-blue-600', description: 'Pipes, leaks, water heaters, drain work' },
  { slug: 'hvac', name: 'HVAC', icon: Wind, color: 'bg-sky-50 text-sky-600', description: 'Heating, cooling, and ventilation services' },
  { slug: 'electrical', name: 'Electrical', icon: Zap, color: 'bg-yellow-50 text-yellow-600', description: 'Panels, wiring, outlets, and upgrades' },
  { slug: 'pest-control', name: 'Pest Control', icon: Bug, color: 'bg-orange-50 text-orange-600', description: 'Extermination, treatment, and prevention' },
  { slug: 'cleaning', name: 'Cleaning', icon: Sparkles, color: 'bg-violet-50 text-violet-600', description: 'Standard, deep, and specialty cleaning' },
  { slug: 'landscaping', name: 'Landscaping', icon: TreePine, color: 'bg-emerald-50 text-emerald-600', description: 'Lawn, gardens, and outdoor care' },
  { slug: 'roofing', name: 'Roofing', icon: Home, color: 'bg-red-50 text-red-600', description: 'Repairs, replacement, gutters, inspections' },
  { slug: 'painting', name: 'Painting', icon: Paintbrush, color: 'bg-pink-50 text-pink-600', description: 'Interior, exterior, and finishing' },
  { slug: 'handyman', name: 'Handyman', icon: Hammer, color: 'bg-amber-50 text-amber-600', description: 'General fixes and small projects' },
  { slug: 'moving', name: 'Moving', icon: Truck, color: 'bg-slate-100 text-slate-600', description: 'Moving labor, packing, and relocation' },
  { slug: 'waterproofing', name: 'Waterproofing', icon: Droplets, color: 'bg-cyan-50 text-cyan-600', description: 'Basement, foundation, and drainage protection' },
  { slug: 'chimney', name: 'Chimney & Fireplace', icon: Flame, color: 'bg-orange-50 text-orange-700', description: 'Cleaning, repair, and safety inspections' },
  { slug: 'home-security', name: 'Home Security', icon: Shield, color: 'bg-indigo-50 text-indigo-600', description: 'Alarms, cameras, and smart locks' },
  { slug: 'smart-home', name: 'Smart Home', icon: Monitor, color: 'bg-teal-50 text-teal-600', description: 'Automation, devices, and integrations' },
  { slug: 'flooring', name: 'Flooring', icon: Layers, color: 'bg-amber-50 text-amber-700', description: 'Hardwood, tile, carpet, and refinishing' },
  { slug: 'lawn-care', name: 'Lawn Care', icon: Scissors, color: 'bg-lime-50 text-lime-600', description: 'Mowing, edging, fertilizing, and maintenance' },
];

export default function CategoriesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1">
        <section className="bg-gradient-to-br from-emerald-50 via-white to-slate-50 py-14 text-center">
          <div className="mx-auto max-w-3xl px-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Browse Home Service Categories</h1>
            <p className="mt-3 text-lg text-slate-600">
              Browse common and niche services, then jump into search to find the right pro.
            </p>
          </div>
        </section>

        <section className="py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-5 text-xl font-bold text-slate-900">Popular categories</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {primaryCategories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.slug}
                    href={`/categories/${cat.slug}`}
                    className="group flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700">{cat.name}</h3>
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{cat.description}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="mb-2 text-xl font-bold text-slate-900">All home services by category</h2>
            <p className="mb-8 text-sm text-slate-500">
              Includes specialty and niche service types used during setup and routing.
            </p>
            <div className="grid gap-5 lg:grid-cols-2">
              {HOME_SERVICE_GROUPS.map((group) => (
                <div key={group.key} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-slate-900">{group.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{group.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {group.services.map((service) => (
                      <Link
                        key={`${group.key}-${service}`}
                        href={`/find-pros?category=${encodeURIComponent(service)}`}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                      >
                        {service}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-emerald-600 py-12 text-center">
          <div className="mx-auto max-w-2xl px-4">
            <h2 className="text-2xl font-bold text-white">Need something specific?</h2>
            <p className="mt-2 text-emerald-100">Search by job type, brand, or problem and we will surface matching providers.</p>
            <Link
              href="/find-pros"
              className="mt-6 inline-block rounded-xl bg-white px-8 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              Search all services
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
