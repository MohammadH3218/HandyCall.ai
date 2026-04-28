'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { IconArrowRight, IconListCheck, IconMessage, IconUser, IconClock, IconBriefcase } from '@tabler/icons-react';

export default function ProDashboardPage() {
  const [pro, setPro] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .getMyPro()
      .then((data) => setPro(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isPendingReview = pro?.status === 'PENDING_REVIEW';
  const isActive = pro?.status === 'ACTIVE';

  return (
    <div className="px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[26px] font-bold text-slate-900">
          {pro?.first_name ? `Welcome back, ${pro.first_name}` : 'Your dashboard'}
        </h1>
        <p className="mt-1 text-[15px] text-slate-400">
          {isPendingReview
            ? 'Your application is under review. We\'ll notify you within 1–2 business days.'
            : isActive
            ? 'Your listing is live. New job requests will appear here.'
            : 'Get started by completing your profile.'}
        </p>
      </div>

      {/* Status banner */}
      {isPendingReview && (
        <div className="mb-8 flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-5 py-4">
          <IconClock className="h-5 w-5 shrink-0 text-amber-500" stroke={1.5} />
          <div>
            <p className="text-[14px] font-semibold text-amber-800">Application pending review</p>
            <p className="text-[13px] text-amber-600">
              Our team reviews every profile to ensure quality. You'll receive an email once approved.
            </p>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickCard
          href="/pro/dashboard/jobs-board"
          icon={IconBriefcase}
          title="Jobs Board"
          description="Browse open job posts from customers in your area"
          highlight
        />
        <QuickCard
          href="/pro/dashboard/requests"
          icon={IconListCheck}
          title="Direct requests"
          description="View and respond to requests sent to you"
        />
        <QuickCard
          href="/pro/dashboard/messages"
          icon={IconMessage}
          title="Messages"
          description="Chat with customers"
        />
        <QuickCard
          href="/pro/dashboard/profile"
          icon={IconUser}
          title="My profile"
          description="Edit your listing, services, and availability"
        />
      </div>
    </div>
  );
}

function QuickCard({
  href,
  icon: Icon,
  title,
  description,
  highlight = false,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col gap-3 rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
        highlight
          ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-400'
          : 'border-border/80 bg-white hover:border-emerald-200'
      }`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${highlight ? 'bg-emerald-100' : 'bg-emerald-50'}`}>
        <Icon className="h-5 w-5 text-emerald-600" stroke={1.5} />
      </div>
      <div className="flex-1">
        <p className="text-[15px] font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-[13px] text-slate-400">{description}</p>
      </div>
      <div className="flex items-center gap-1 text-[13px] font-medium text-emerald-600 opacity-0 transition group-hover:opacity-100">
        Go <IconArrowRight className="h-3.5 w-3.5" stroke={2} />
      </div>
    </Link>
  );
}
