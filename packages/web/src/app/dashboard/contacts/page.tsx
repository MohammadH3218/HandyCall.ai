'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Users, Plus, Edit2, Trash2, Search, Phone as PhoneIcon, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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
}

export default function ContactsPage() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    tags: '',
  });

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.getContacts(100);
      setContacts(response.contacts || []);
    } catch (err: any) {
      console.error('Error loading contacts:', err);
      setError(err.message || 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadContacts();
      return;
    }

    try {
      setIsLoading(true);
      const results = await apiClient.searchContacts(searchQuery);
      setContacts(results || []);
    } catch (err: any) {
      console.error('Error searching contacts:', err);
      setError(err.message || 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

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
      tags: contact.tags?.join(', ') || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const tags = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);
      const data = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        notes: formData.notes || undefined,
        tags,
      };

      if (editingContact) {
        await apiClient.updateContact(editingContact.contact_id, data);
      } else {
        await apiClient.createContact(data);
      }

      setIsDialogOpen(false);
      loadContacts();
      toast({
        title: editingContact ? 'Contact updated' : 'Contact added',
        description: 'Your contact list is up to date.',
      });
    } catch (err: any) {
      console.error('Error saving contact:', err);
      toast({
        title: 'Save failed',
        description: err.message || 'Failed to save contact',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (contact: Contact) => {
    setDeleteTarget(contact);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.deleteContact(deleteTarget.contact_id);
      setDeleteOpen(false);
      setDeleteTarget(null);
      loadContacts();
      toast({ title: 'Contact deleted', description: 'The contact has been removed.' });
    } catch (err: any) {
      console.error('Error deleting contact:', err);
      toast({
        title: 'Delete failed',
        description: err.message || 'Failed to delete contact',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'CALL': return 'bg-blue-100 text-blue-700';
      case 'MANUAL': return 'bg-purple-100 text-purple-700';
      case 'IMPORT': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button onClick={loadContacts} className="mt-2 text-sm text-red-600 hover:text-red-800 underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display text-slate-900">Contacts</h1>
          <p className="mt-2 text-slate-600">Keep your customers organized and reachable.</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 min-w-[220px]"
        />
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contacts ({contacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : contacts.length > 0 ? (
            <div className="space-y-4">
              {contacts.map((contact) => (
                <div
                  key={contact.contact_id}
                  className="border border-emerald-100/70 bg-white/80 rounded-xl p-4 shadow-sm hover:-translate-y-[1px] hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">{contact.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${getSourceColor(contact.source)}`}>
                          {contact.source}
                        </span>
                      </div>

                      <div className="space-y-1 mb-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <PhoneIcon className="h-4 w-4" />
                          <span>{contact.phone}</span>
                        </div>
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Mail className="h-4 w-4" />
                            <span>{contact.email}</span>
                          </div>
                        )}
                      </div>

                      {contact.notes && (
                        <p className="text-sm text-slate-600 mb-2">{contact.notes}</p>
                      )}

                      {contact.tags && contact.tags.length > 0 && (
                        <div className="flex gap-2 mb-2">
                          {contact.tags.map((tag, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Added: {formatDate(contact.created_at)}</span>
                        {contact.total_calls !== undefined && (
                          <span>{contact.total_calls} calls</span>
                        )}
                        {contact.last_contact_at && (
                          <span>Last contact: {formatDate(contact.last_contact_at)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(contact)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(contact)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No contacts yet</h3>
              <p className="text-sm text-gray-500 mb-6">
                Contacts will be automatically created from calls, or you can add them manually.
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Contact
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Edit Contact' : 'Create Contact'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Additional information..."
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., vip, urgent, prospect"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!formData.name || !formData.phone}>
                {editingContact ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete contact</DialogTitle>
            <DialogDescription>
              This will permanently remove {deleteTarget?.name ?? 'this contact'} from your list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
