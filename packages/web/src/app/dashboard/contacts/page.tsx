'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EmptyState } from '@/components/portal/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/portal/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowUpRight,
  CalendarDays,
  Download,
  Mail,
  Phone,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  User,
} from 'lucide-react';

interface Contact {
  contact_id: string;
  name: string;
  phone: string;
  email?: string;
  source: 'CALL' | 'MANUAL' | 'IMPORT';
  tags?: string[];
  notes?: string;
  created_at: string;
  total_calls?: number;
  last_contact_at?: string;
  sms_opt_in?: boolean;
}

function formatDate(dateString?: string) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function sourceVariant(source: Contact['source']) {
  if (source === 'CALL') return 'info' as const;
  if (source === 'IMPORT') return 'success' as const;
  return 'secondary' as const;
}

export default function ContactsPage() {
  const { toast } = useToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [historyCalls, setHistoryCalls] = useState<any[]>([]);
  const [historyAppointments, setHistoryAppointments] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    tags: '',
  });

  useEffect(() => {
    void loadContacts();
  }, []);

  useEffect(() => {
    if (!selectedContact?.contact_id) {
      setHistoryCalls([]);
      setHistoryAppointments([]);
      return;
    }

    let isActive = true;
    const loadHistory = async () => {
      try {
        setHistoryLoading(true);
        const [callsResult, appointmentsResult] = await Promise.all([
          apiClient.getContactCalls(selectedContact.contact_id, 20),
          apiClient.getContactAppointments(selectedContact.contact_id),
        ]);

        if (!isActive) return;
        setHistoryCalls(callsResult?.calls || []);
        setHistoryAppointments(appointmentsResult?.appointments || []);
      } catch {
        if (!isActive) return;
        setHistoryCalls([]);
        setHistoryAppointments([]);
      } finally {
        if (isActive) setHistoryLoading(false);
      }
    };

    void loadHistory();

    return () => {
      isActive = false;
    };
  }, [selectedContact?.contact_id]);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getContacts(200);
      const next = response.contacts || [];
      setContacts(next);

      if (next.length > 0) {
        setSelectedContact((prev) => prev && next.find((c: Contact) => c.contact_id === prev.contact_id) || next[0]);
      } else {
        setSelectedContact(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((contact) => {
      const text = `${contact.name} ${contact.phone} ${contact.email || ''} ${(contact.tags || []).join(' ')}`.toLowerCase();
      return text.includes(query);
    });
  }, [contacts, searchQuery]);

  const handleCreate = () => {
    setEditingContact(null);
    setFormData({ name: '', phone: '', email: '', notes: '', tags: '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      notes: contact.notes || '',
      tags: (contact.tags || []).join(', '),
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const tags = formData.tags.split(',').map((item) => item.trim()).filter(Boolean);
      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        notes: formData.notes || undefined,
        tags,
      };

      if (editingContact) {
        await apiClient.updateContact(editingContact.contact_id, payload);
      } else {
        await apiClient.createContact(payload);
      }

      setIsDialogOpen(false);
      await loadContacts();
      toast({
        title: editingContact ? 'Contact updated' : 'Contact added',
        description: 'Contact records are up to date.',
      });
    } catch (err: any) {
      toast({
        title: 'Save failed',
        description: err.message || 'Unable to save contact.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await apiClient.deleteContact(deleteTarget.contact_id);
      setDeleteTarget(null);
      await loadContacts();
      toast({ title: 'Contact deleted', description: 'The contact was removed.' });
    } catch (err: any) {
      toast({
        title: 'Delete failed',
        description: err.message || 'Unable to delete contact.',
        variant: 'destructive',
      });
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Contacts" subtitle="There was a problem loading contacts." />
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-destructive">{error}</p>
            <Button className="mt-3" onClick={() => void loadContacts()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Contacts"
        title="Customer directory"
        subtitle="Search contacts, manage tags, and inspect call/message/appointment history from one workspace."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              New contact
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="grid min-h-[640px] grid-cols-1 divide-y divide-border xl:grid-cols-[1fr_360px] xl:divide-x xl:divide-y-0">
            <div className="min-h-0">
              <div className="border-b border-border p-3">
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search name, phone, email, tags"
                  leadingIcon={<Search className="h-4 w-4" />}
                />
              </div>

              <div className="max-h-[580px] overflow-auto">
                {isLoading ? (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <Skeleton key={index} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredContacts.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Last contact</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.map((contact) => (
                        <TableRow
                          key={contact.contact_id}
                          data-state={selectedContact?.contact_id === contact.contact_id ? 'selected' : undefined}
                          onClick={() => setSelectedContact(contact)}
                          className="cursor-pointer"
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{contact.name}</p>
                              <p className="text-xs text-muted-foreground">{contact.email || 'No email'}</p>
                            </div>
                          </TableCell>
                          <TableCell>{contact.phone}</TableCell>
                          <TableCell>
                            <Badge variant={sourceVariant(contact.source)}>{contact.source}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(contact.last_contact_at || contact.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleEdit(contact);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDeleteTarget(contact);
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-3">
                    <EmptyState
                      icon={<User className="h-6 w-6" />}
                      title="No contacts"
                      description="Create a contact manually or wait for new calls and messages."
                      action={
                        <Button onClick={handleCreate}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add contact
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            <aside className="bg-[#0f1115] p-4">
              {selectedContact ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-[#13161b] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{selectedContact.name}</p>
                        <p className="text-xs text-muted-foreground">Created {formatDate(selectedContact.created_at)}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(selectedContact)}>
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                      <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {selectedContact.phone}</p>
                      <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {selectedContact.email || 'No email'}</p>
                      <p className="flex items-center gap-2"><Tag className="h-3.5 w-3.5" /> {(selectedContact.tags || []).join(', ') || 'No tags'}</p>
                      <p className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> SMS opt-in: {selectedContact.sms_opt_in ? 'Yes' : 'Unknown'}</p>
                    </div>

                    {selectedContact.notes ? (
                      <p className="mt-3 rounded-md border border-border bg-[#0f1115] p-2 text-xs text-muted-foreground">
                        {selectedContact.notes}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3 rounded-lg border border-border bg-[#13161b] p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-faint">History</p>
                    {historyLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs font-medium text-foreground">Calls ({historyCalls.length})</p>
                          <div className="mt-2 space-y-1">
                            {historyCalls.slice(0, 3).map((call) => (
                              <div key={call.call_id} className="rounded-md border border-border bg-[#0f1115] px-2 py-2 text-xs text-muted-foreground">
                                {formatDate(call.created_at)}  -  {call.caller_phone}
                              </div>
                            ))}
                            {!historyCalls.length ? <p className="text-xs text-text-faint">No recent calls.</p> : null}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-foreground">Appointments ({historyAppointments.length})</p>
                          <div className="mt-2 space-y-1">
                            {historyAppointments.slice(0, 3).map((apt) => (
                              <div key={apt.appointment_id} className="rounded-md border border-border bg-[#0f1115] px-2 py-2 text-xs text-muted-foreground">
                                <p className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {formatDate(apt.scheduled_start || apt.scheduled_time)}</p>
                              </div>
                            ))}
                            {!historyAppointments.length ? <p className="text-xs text-text-faint">No appointments.</p> : null}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <Button variant="danger" size="sm" onClick={() => setDeleteTarget(selectedContact)}>
                    <Trash2 className="h-4 w-4" />
                    Delete contact
                  </Button>
                </div>
              ) : (
                <EmptyState
                  icon={<User className="h-6 w-6" />}
                  title="No contact selected"
                  description="Select a row to view full contact history and notes."
                />
              )}
            </aside>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Edit contact' : 'Create contact'}</DialogTitle>
            <DialogDescription>Store contact details for follow-ups and bookings.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={formData.name} onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={formData.phone} onChange={(event) => setFormData((prev) => ({ ...prev, phone: event.target.value }))} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))} />
            </div>
            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input id="tags" value={formData.tags} placeholder="vip, install, follow-up" onChange={(event) => setFormData((prev) => ({ ...prev, tags: event.target.value }))} />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={3} value={formData.notes} onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={!formData.name || !formData.phone}>
              {editingContact ? 'Save changes' : 'Create contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete contact</DialogTitle>
            <DialogDescription>
              Remove {deleteTarget?.name || 'this contact'} from your directory and history shortcuts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

