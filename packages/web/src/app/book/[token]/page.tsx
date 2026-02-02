'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type AppointmentInfo = {
  appointment_id: string;
  scheduled_start: number;
  scheduled_end: number;
  status: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: { street?: string; city?: string; state?: string; zip?: string };
  notes?: string;
};

type BookingInfo = {
  mode?: 'book' | 'manage';
  company_name: string;
  service_type?: string;
  timezone?: string;
  phone_number?: string;
  email?: string;
  appointment?: AppointmentInfo;
  collected_info?: Record<string, any>;
  intake_schema?: {
    required?: string[];
    optional?: string[];
    labels?: Record<string, string>;
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const KNOWN_FIELDS = new Set([
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

function formatDateInputValue(timestamp: number, timeZone?: string) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function formatTimeInputValue(timestamp: number, timeZone?: string) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    const hour = parts.find((p) => p.type === 'hour')?.value || '00';
    const minute = parts.find((p) => p.type === 'minute')?.value || '00';
    return `${hour}:${minute}`;
  } catch {
    return date.toISOString().slice(11, 16);
  }
}

export default function BookingPage() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';

  const [info, setInfo] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [linkClosed, setLinkClosed] = useState(false);

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
  const [cancelReason, setCancelReason] = useState('');

  const refreshInfo = useCallback(async () => {
    if (!token || !API_BASE) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/public/booking/${token}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || 'Failed to load booking details');
      }
      setInfo(data);
      setLinkClosed(false);

      const appointment = data?.appointment as AppointmentInfo | undefined;
      const collected = data?.collected_info || {};

      setFullName(
        appointment?.contact_name ||
          collected?.full_name ||
          collected?.name ||
          ''
      );
      setEmail(appointment?.contact_email || data?.email || '');
      setPhone(appointment?.contact_phone || data?.phone_number || '');

      const address = appointment?.address || {};
      const fallbackAddress = typeof collected?.address === 'string' ? collected.address : '';
      setStreet(address.street || fallbackAddress || '');
      setCity(address.city || '');
      setState(address.state || '');
      setZip(address.zip || collected?.zip || '');

      if (appointment?.scheduled_start) {
        setDate(formatDateInputValue(appointment.scheduled_start, data?.timezone));
        setTime(formatTimeInputValue(appointment.scheduled_start, data?.timezone));
      }

      const required = data?.intake_schema?.required || [];
      const optional = data?.intake_schema?.optional || [];
      const all = Array.from(new Set([...(required || []), ...(optional || [])]));
      const customKeys = all.filter((field: string) => !KNOWN_FIELDS.has(String(field).toLowerCase()));
      const nextCustom: Record<string, string> = {};
      for (const key of customKeys) {
        const value = collected?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          nextCustom[key] = String(value);
        }
      }
      setCustomFields(nextCustom);
    } catch (err: any) {
      setError(err?.message || 'Unable to load booking info');
      setInfo(null);
    } finally {
      setLoading(false);
    };
  }, [token]);

  useEffect(() => {
    void refreshInfo();
  }, [refreshInfo]);

  const fields = useMemo(() => {
    const required = info?.intake_schema?.required || [];
    const optional = info?.intake_schema?.optional || [];
    const all = Array.from(new Set([...required, ...optional]));
    return { required, optional, all };
  }, [info]);

  const labels = info?.intake_schema?.labels || {};
  const labelFor = (key: string) => labels[key] || titleize(key);

  const customKeys = fields.all.filter((f) => !KNOWN_FIELDS.has(String(f).toLowerCase()));

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
      setNotice(null);
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
      setNotice('Booking confirmed. Check your email for your confirmation link.');
      await refreshInfo();
    } catch (err: any) {
      setError(err?.message || 'Unable to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setUpdating(true);
      setError(null);
      setNotice(null);
      const payload = {
        full_name: fullName || undefined,
        email: email || undefined,
        phone_number: phone || undefined,
        address: {
          street: street || undefined,
          city: city || undefined,
          state: state || undefined,
          zip: zip || undefined,
        },
        custom_fields: customFields,
      };
      const res = await fetch(`${API_BASE}/public/booking/${token}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || 'Unable to update appointment');
      }
      setNotice('Details updated.');
      if (data?.appointment) {
        setInfo((prev) => (prev ? { ...prev, appointment: data.appointment } : prev));
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to update appointment');
    } finally {
      setUpdating(false);
    }
  };

  const handleReschedule = async () => {
    try {
      setRescheduling(true);
      setError(null);
      setNotice(null);
      const payload = {
        preferred_date: date || undefined,
        preferred_time: time || undefined,
      };
      const res = await fetch(`${API_BASE}/public/booking/${token}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || 'Unable to reschedule appointment');
      }
      setNotice('Appointment rescheduled.');
      if (data?.appointment) {
        setInfo((prev) => (prev ? { ...prev, appointment: data.appointment } : prev));
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to reschedule appointment');
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      setCancelling(true);
      setError(null);
      setNotice(null);
      const payload = {
        reason: cancelReason || undefined,
      };
      const res = await fetch(`${API_BASE}/public/booking/${token}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || 'Unable to cancel appointment');
      }
      setNotice('Appointment cancelled. This link is now closed.');
      setLinkClosed(true);
    } catch (err: any) {
      setError(err?.message || 'Unable to cancel appointment');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Loading booking form...</CardTitle>
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

  if (error && !info) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Booking Link Unavailable</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{error}</p>
              <p className="text-gray-600 mt-2">
                If you still need help, please call the business directly.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const mode = info?.mode === 'manage' ? 'manage' : 'book';
  const appointment = info?.appointment;
  const appointmentLabel = appointment
    ? formatSlotLabel(new Date(appointment.scheduled_start).toISOString(), info?.timezone)
    : '';

  if (mode === 'manage') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manage your appointment</h1>
            <p className="text-gray-600 mt-2">{info?.company_name}</p>
          </div>

          {notice ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : null}

          {appointment ? (
            <Card>
              <CardHeader>
                <CardTitle>Current Appointment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-gray-700">
                <div>
                  <span className="font-medium">Status:</span> {appointment.status}
                </div>
                <div>
                  <span className="font-medium">Scheduled:</span> {appointmentLabel}
                </div>
                {appointment.contact_name ? (
                  <div>
                    <span className="font-medium">Name:</span> {appointment.contact_name}
                  </div>
                ) : null}
                {appointment.contact_email ? (
                  <div>
                    <span className="font-medium">Email:</span> {appointment.contact_email}
                  </div>
                ) : null}
                {appointment.contact_phone ? (
                  <div>
                    <span className="font-medium">Phone:</span> {appointment.contact_phone}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {linkClosed ? (
            <Card>
              <CardHeader>
                <CardTitle>Link Closed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">This booking link is no longer active.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Update Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Street</Label>
                      <Input value={street} onChange={(e) => setStreet(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input value={state} onChange={(e) => setState(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Zip</Label>
                      <Input value={zip} onChange={(e) => setZip(e.target.value)} />
                    </div>
                  </div>

                  {customKeys.length ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {customKeys.map((key) => (
                        <div className="space-y-2" key={key}>
                          <Label>
                            {labelFor(key)}
                            {isRequired(key) ? ' *' : ''}
                          </Label>
                          <Input
                            value={customFields[key] || ''}
                            onChange={(e) => handleCustomChange(key, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <Button onClick={handleUpdate} disabled={updating}>
                    {updating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Reschedule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>New Date</Label>
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>New Time</Label>
                      <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                    </div>
                  </div>
                  <Button onClick={handleReschedule} disabled={rescheduling}>
                    {rescheduling ? 'Rescheduling...' : 'Reschedule Appointment'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cancel Appointment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Reason (optional)</Label>
                    <Textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Let us know why you're cancelling"
                    />
                  </div>
                  <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
                    {cancelling ? 'Cancelling...' : 'Cancel Appointment'}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
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
            {notice ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded">
                {notice}
              </div>
            ) : null}
            {error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            ) : null}

            {requiresName || fields.required.length === 0 ? (
              <div className="space-y-2">
                <Label>Full Name {requiresName ? '*' : ''}</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            ) : null}

            {requiresEmail || fields.required.length === 0 ? (
              <div className="space-y-2">
                <Label>Email {requiresEmail ? '*' : ''}</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            {requiresAddress ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Street</Label>
                  <Input value={street} onChange={(e) => setStreet(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={state} onChange={(e) => setState(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Zip</Label>
                  <Input value={zip} onChange={(e) => setZip(e.target.value)} />
                </div>
              </div>
            ) : requiresZip ? (
              <div className="space-y-2">
                <Label>Zip Code</Label>
                <Input value={zip} onChange={(e) => setZip(e.target.value)} />
              </div>
            ) : null}

            {customKeys.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {customKeys.map((key) => (
                  <div className="space-y-2" key={key}>
                    <Label>
                      {labelFor(key)}
                      {isRequired(key) ? ' *' : ''}
                    </Label>
                    <Input
                      value={customFields[key] || ''}
                      onChange={(e) => handleCustomChange(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {requiresTime || fields.required.length === 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>
            ) : null}

            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Booking...' : 'Confirm Appointment'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
