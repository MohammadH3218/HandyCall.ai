'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

type BookingInfo = {
  company_name: string;
  service_type?: string;
  timezone?: string;
  phone_number?: string;
  intake_schema?: {
    required?: string[];
    optional?: string[];
    labels?: Record<string, string>;
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

function titleize(input: string) {
  return String(input || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatSlotLabel(slotIso: string, timeZone?: string) {
  const date = new Date(slotIso);
  if (!Number.isFinite(date.getTime())) return slotIso;
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return slotIso;
  }
}

export default function BookingPage() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';

  const [info, setInfo] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ start_time: string } | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token || !API_BASE) return;
    let alive = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/public/booking/${token}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || data?.error?.message || 'Failed to load booking details');
        }
        if (!alive) return;
        setInfo(data);
        if (data?.phone_number) setPhone(data.phone_number);
        if (data?.email) setEmail(data.email);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message || 'Unable to load booking info');
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [token]);

  const fields = useMemo(() => {
    const required = info?.intake_schema?.required || [];
    const optional = info?.intake_schema?.optional || [];
    const all = Array.from(new Set([...required, ...optional]));
    return { required, optional, all };
  }, [info]);

  const labels = info?.intake_schema?.labels || {};
  const labelFor = (key: string) => labels[key] || titleize(key);

  const known = new Set([
    'full_name',
    'name',
    'email',
    'phone',
    'phone_number',
    'phone_number_verification',
    'address',
    'service_address',
    'location_address',
    'pickup_location',
    'dropoff_location',
    'zip',
    'zipcode',
    'preferred_time',
  ]);

  const customKeys = fields.all.filter((f) => !known.has(String(f).toLowerCase()));

  const isRequired = (key: string) =>
    fields.required.some((f) => String(f).toLowerCase() === String(key).toLowerCase());

  const requiresAddress = fields.all.some((f) =>
    ['address', 'service_address', 'location_address', 'pickup_location', 'dropoff_location'].includes(
      String(f).toLowerCase()
    )
  );
  const requiresZip = fields.all.some((f) => ['zip', 'zipcode'].includes(String(f).toLowerCase()));
  const requiresEmail = fields.all.some((f) => String(f).toLowerCase() === 'email');
  const requiresName = fields.all.some((f) => ['full_name', 'name'].includes(String(f).toLowerCase()));
  const requiresTime = fields.all.some((f) => String(f).toLowerCase() === 'preferred_time');

  const handleCustomChange = (key: string, value: string) => {
    setCustomFields((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        full_name: fullName || undefined,
        email: email || undefined,
        phone_number: phone || undefined,
        preferred_date: date || undefined,
        preferred_time: time || undefined,
        address: {
          street: street || undefined,
          city: city || undefined,
          state: state || undefined,
          zip: zip || undefined,
        },
        zip: zip || undefined,
        custom_fields: customFields,
      };
      const res = await fetch(`${API_BASE}/public/booking/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || 'Unable to book appointment');
      }
      setSubmitted({ start_time: data?.start_time || '' });
    } catch (err: any) {
      setError(err?.message || 'Unable to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Loading booking form…</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Booking Confirmed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                You&apos;re all set with {info?.company_name}. Your appointment is confirmed for{' '}
                <strong>{formatSlotLabel(submitted.start_time, info?.timezone)}</strong>.
              </p>
              <p className="text-gray-600 mt-2">You will receive a confirmation SMS shortly.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{info?.company_name}</h1>
          <p className="text-gray-600 mt-2">Complete your booking to lock in a service time.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            ) : null}

            {requiresName ? (
              <div>
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
              </div>
            ) : null}

            <div>
              <Label>Phone number</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" />
            </div>

            {requiresEmail ? (
              <div>
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
              </div>
            ) : null}

            {requiresAddress ? (
              <div className="space-y-3">
                <Label>Service address</Label>
                <Input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Street address" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                  <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
                  <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP" />
                </div>
              </div>
            ) : requiresZip ? (
              <div>
                <Label>ZIP code</Label>
                <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP" />
              </div>
            ) : null}

            {requiresTime ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Preferred date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div>
                  <Label>Preferred time</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>
            ) : null}

            {customKeys.length ? (
              <div className="space-y-4">
                {customKeys.map((key) => {
                  const lower = String(key).toLowerCase();
                  if (lower === 'severity') {
                    return (
                      <div key={key}>
                        <Label>{labelFor(key)}</Label>
                        <select
                          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={customFields[key] || ''}
                          onChange={(e) => handleCustomChange(key, e.target.value)}
                        >
                          <option value="">Select severity</option>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                        </select>
                      </div>
                    );
                  }
                  return (
                    <div key={key}>
                      <Label>{labelFor(key)}</Label>
                      <Input
                        value={customFields[key] || ''}
                        onChange={(e) => handleCustomChange(key, e.target.value)}
                        placeholder={labelFor(key)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}

            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Booking…' : 'Confirm booking'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
