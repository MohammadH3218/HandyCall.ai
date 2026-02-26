'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-slate-100 text-slate-700',
};

export default function PortalBookingsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: integrate with customer booking API when portal auth is implemented
    setLoading(false);
    setBookings([]);
  }, [tab]);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
        <p className="mt-1 text-muted-foreground">View and manage your service appointments.</p>
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit mb-6">
        {(['upcoming', 'past'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-5 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-white shadow-sm text-slate-900' : 'text-muted-foreground hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="h-5 w-48 rounded bg-slate-200 mb-2" />
              <div className="h-4 w-64 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-4 font-medium text-slate-900">No {tab} bookings</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === 'upcoming'
              ? 'Book a service pro to get started.'
              : 'Your completed appointments will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking: any) => (
            <div key={booking.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{booking.service_name}</h3>
                  <p className="text-sm text-muted-foreground">{booking.provider_name}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[booking.status] || STATUS_COLORS.pending}`}>
                  {booking.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {new Date(booking.scheduled_at).toLocaleString()}
                </span>
                {booking.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {booking.address}
                  </span>
                )}
                {booking.provider_phone && (
                  <a href={`tel:${booking.provider_phone}`} className="flex items-center gap-1.5 hover:text-emerald-600">
                    <Phone className="h-4 w-4" />
                    {booking.provider_phone}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
