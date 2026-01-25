'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Plus, Edit2, Trash2, X, MapPin } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ServiceAreaTab } from './service-area-tab';

interface KnowledgeItem {
  knowledge_id: string;
  title: string;
  content: string;
  type: 'FAQ' | 'SERVICE' | 'POLICY' | 'PRODUCT' | 'SAFETY';
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  tags?: string[];
  created_at: number;
  updated_at: number;
}

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'service-area'>('knowledge');

  // Knowledge Items State
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    content: string;
    type: 'FAQ' | 'SERVICE' | 'POLICY' | 'PRODUCT' | 'SAFETY';
    tags: string;
  }>({
    title: '',
    content: '',
    type: 'FAQ',
    tags: '',
  });

  useEffect(() => {
    if (activeTab === 'knowledge') {
      loadItems();
    }
  }, [activeTab]);

  const loadItems = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await apiClient.getKnowledgeItems();
      setItems(data || []);
    } catch (err: any) {
      console.error('Error loading knowledge items:', err);
      setError(err.message || 'Failed to load knowledge items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    setFormData({ title: '', content: '', type: 'FAQ', tags: '' });
    setIsDialogOpen(true);
  };

  const handleEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      content: item.content,
      type: item.type,
      tags: item.tags?.join(', ') || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const tags = formData.tags.split(',').map((t) => t.trim()).filter(Boolean);
      const data = {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        tags,
      };

      if (editingItem) {
        await apiClient.updateKnowledgeItem(editingItem.knowledge_id, data);
      } else {
        await apiClient.createKnowledgeItem(data);
      }

      setIsDialogOpen(false);
      loadItems();
    } catch (err: any) {
      console.error('Error saving knowledge item:', err);
      alert(err.message || 'Failed to save knowledge item');
    }
  };

  const handleDelete = async (knowledgeId: string) => {
    if (!confirm('Are you sure you want to delete this knowledge item?')) return;

    try {
      await apiClient.deleteKnowledgeItem(knowledgeId);
      loadItems();
    } catch (err: any) {
      console.error('Error deleting knowledge item:', err);
      alert(err.message || 'Failed to delete knowledge item');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'FAQ': return 'bg-blue-100 text-blue-700';
      case 'SERVICE': return 'bg-green-100 text-green-700';
      case 'POLICY': return 'bg-purple-100 text-purple-700';
      case 'PRODUCT': return 'bg-orange-100 text-orange-700';
      case 'SAFETY': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-8 animate-fade-in max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="mt-2 text-gray-600">Teach your AI about your services, policies, and service areas.</p>
        </div>
        {activeTab === 'knowledge' && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Knowledge
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 mb-8">
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`flex items-center px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'knowledge'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Q&A and Info
        </button>
        <button
          onClick={() => setActiveTab('service-area')}
          className={`flex items-center px-4 py-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'service-area'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
        >
          <MapPin className="h-4 w-4 mr-2" />
          Service Area
        </button>
      </div>

      {activeTab === 'knowledge' && (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
              <button onClick={loadItems} className="mt-2 text-sm text-red-600 hover:text-red-800 underline">
                Try again
              </button>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Your Knowledge Items ({items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-6 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                    </div>
                  ))}
                </div>
              ) : items.length > 0 ? (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.knowledge_id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{item.title}</h3>
                            <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(item.type)}`}>
                              {item.type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{item.content}</p>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {item.tags.map((tag, idx) => (
                                <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.knowledge_id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No knowledge items yet</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Add FAQs, service information, and policies to help your AI answer customer questions.
                  </p>
                  <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Item
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'service-area' && (
        <ServiceAreaTab />
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Knowledge Item' : 'Create Knowledge Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., What are your business hours?"
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'FAQ' | 'SERVICE' | 'POLICY' | 'PRODUCT' | 'SAFETY' })}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="FAQ">FAQ</option>
                <option value="SERVICE">Service</option>
                <option value="POLICY">Policy</option>
                <option value="PRODUCT">Product</option>
                <option value="SAFETY">Safety</option>
              </select>
            </div>
            <div>
              <Label htmlFor="content">Content</Label>
              <textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Enter detailed information..."
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., hours, contact, support"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!formData.title || !formData.content}>
                {editingItem ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
