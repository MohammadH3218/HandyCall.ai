'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone } from 'lucide-react';

export default function CallsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Calls</h1>
        <p className="mt-2 text-gray-600">View and manage your call history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No calls yet</h3>
            <p className="text-sm text-gray-500">
              Your AI receptionist will handle calls automatically when your business is unavailable.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
