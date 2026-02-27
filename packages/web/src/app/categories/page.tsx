import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { HOME_SERVICE_GROUPS } from '@/constants/home-services';
import {
  IconTool,
  IconWind,
  IconBolt,
  IconBug,
  IconSparkles,
  IconTree,
  IconHome,
  IconPaint,
  IconHammer,
  IconTruck,
  IconDroplet,
  IconFlame,
  IconShield,
  IconDeviceDesktop,
  IconStack2,
  IconScissors,
} from '@tabler/icons-react';

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
  { slug: 'plumbing', name: 'Plumbing', icon: IconTool, description: 'Pipes, leaks, water heaters, drain work' },
  { slug: 'hvac', name: 'HVAC', icon: IconWind, description: 'Heating, cooling, and ventilation services' },
  { slug: 'electrical', name: 'Electrical', icon: IconBolt, description: 'Panels, wiring, outlets, and upgrades' },
  { slug: 'pest-control', name: 'Pest Control', icon: IconBug, description: 'Extermination, treatment, and prevention' },
  { slug: 'cleaning', name: 'Cleaning', icon: IconSparkles, description: 'Standard, deep, and specialty cleaning' },
  { slug: 'landscaping', name: 'Landscaping', icon: IconTree, description: 'Lawn, gardens, and outdoor care' },
  { slug: 'roofing', name: 'Roofing', icon: IconHome, description: 'Repairs, replacement, gutters, inspections' },
  { slug: 'painting', name: 'Painting', icon: IconPaint, description: 'Interior, exterior, and finishing' },
  { slug: 'handyman', name: 'Handyman', icon: IconHammer, description: 'General fixes and small projects' },
  { slug: 'moving', name: 'Moving', icon: IconTruck, description: 'Moving labor, packing, and relocation' },
  { slug: 'waterproofing', name: 'Waterproofing', icon: IconDroplet, description: 'Basement, foundation, and drainage protection' },
  { slug: 'chimney', name: 'Chimney & Fireplace', icon: IconFlame, description: 'Cleaning, repair, and safety inspections' },
  { slug: 'home-security', name: 'Home Security', icon: IconShield, description: 'Alarms, cameras, and smart locks' },
  { slug: 'smart-home', name: 'Smart Home', icon: IconDeviceDesktop, description: 'Automation, devices, and integrations' },
  { slug: 'flooring', name: 'Flooring', icon: IconStack2, description: 'Hardwood, tile, carpet, and refinishing' },
  { slug: 'lawn-care', name: 'Lawn Care', icon: IconScissors, description: 'Mowing, edging, fertilizing, and maintenance' },
];

export default function CategoriesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />

      <main className="flex-1">
        <section className="bg-slate-50 border-b border-slate-100 py-12 text-center">
          <div className="mx-auto max-w-3xl px-4">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Browse Home Service Categories</h1>
            <p className="mt-3 text-lg text-slate-700">
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
                    className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white">
                      <Icon className="h-6 w-6 text-slate-600" stroke={1.5} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600">{cat.name}</h3>
                      <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">{cat.description}</p>
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
                <div key={group.key} className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-base font-semibold text-slate-900">{group.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{group.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {group.services.map((service) => (
                      <Link
                        key={`${group.key}-${service}`}
                        href={`/find-pros?category=${encodeURIComponent(service)}`}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700 hover:border-slate-300 hover:text-slate-900"
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

        <section className="border-t border-slate-100 py-12">
          <div className="mx-auto max-w-2xl px-4">
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <h2 className="text-2xl font-bold text-slate-900">Need something specific?</h2>
              <p className="mt-2 text-slate-500">Search by job type, brand, or problem and we will surface matching providers.</p>
              <Link
                href="/find-pros"
                className="mt-6 inline-block rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                Search all services
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
