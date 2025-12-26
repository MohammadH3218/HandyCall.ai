'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Users, Calendar, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const { company } = useAuthStore();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back to {company?.company_name || 'HandyCall'}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Today's Calls"
          value="0"
          icon={<Phone className="h-8 w-8 text-blue-600" />}
          description="No calls yet today"
        />
        <StatCard
          title="New Leads"
          value="0"
          icon={<Users className="h-8 w-8 text-green-600" />}
          description="Waiting for first lead"
        />
        <StatCard
          title="Appointments"
          value="0"
          icon={<Calendar className="h-8 w-8 text-purple-600" />}
          description="No scheduled appointments"
        />
        <StatCard
          title="Pending Questions"
          value="0"
          icon={<AlertCircle className="h-8 w-8 text-orange-600" />}
          description="No flagged questions"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 text-center py-8">
              No calls yet. Your AI receptionist is ready to answer!
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 text-center py-8">
              No appointments scheduled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <QuickAction
                title="Add Knowledge"
                description="Teach your AI about your services and policies"
                href="/dashboard/knowledge"
              />
              <QuickAction
                title="Configure Settings"
                description="Customize your business hours and AI behavior"
                href="/dashboard/settings"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
          <div>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 transition-colors"
    >
      <h4 className="font-semibold text-gray-900">{title}</h4>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </a>
  );
}
