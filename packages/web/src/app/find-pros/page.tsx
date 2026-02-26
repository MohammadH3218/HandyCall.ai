'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Star, MapPin, CheckCircle, ChevronRight } from 'lucide-react';

type Provider = {
  company_id: string;
  company_name: string;
  public_slug?: string;
  public_description?: string;
  profile_photo_url?: string;
  categories: string[];
  overall_rating: number;
  total_reviews: number;
  verified: boolean;
  city?: string;
  state?: string;
};

const CATEGORIES = [
  'Plumbing', 'HVAC', 'Electrical', 'Pest Control',
  'Cleaning', 'Landscaping', 'Roofing', 'Painting',
  'Appliance Repair', 'Handyman',
];

export default function FindProsPage() {
  const [results, setResults] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (category) params.set('category', category);
      const res = await fetch(`/api/proxy/marketplace/search?${params.toString()}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch { setResults([]); }
    setLoading(false);
  }, [query, category]);

  useEffect(() => { void search(); }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Find Home Service Pros</h1>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search by name or service..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
              />
            </div>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All services</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button onClick={search} className="bg-emerald-600 hover:bg-emerald-700">Search</Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1,2,3,4].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200" />)}
          </div>
        ) : !searched || results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg font-semibold text-slate-600">
              {searched ? 'No providers found. Try a different search.' : 'Search for home service pros near you.'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">{results.length} providers found</p>
            <div className="grid gap-4 md:grid-cols-2">
              {results.map((p) => (
                <Link
                  key={p.company_id}
                  href={`/pros/${p.public_slug || p.company_id}`}
                  className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-200 hover:shadow-md transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-lg font-bold text-emerald-700 shrink-0">
                      {p.company_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{p.company_name}</h3>
                        {p.verified && <CheckCircle className="h-4 w-4 text-emerald-600" />}
                      </div>
                      {p.overall_rating > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-semibold text-slate-800">{p.overall_rating}</span>
                          <span className="text-xs text-slate-500">({p.total_reviews} reviews)</span>
                        </div>
                      )}
                      {p.city && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-500">{p.city}{p.state ? `, ${p.state}` : ''}</span>
                        </div>
                      )}
                      {p.public_description && (
                        <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">{p.public_description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {p.categories.slice(0, 3).map((c) => (
                          <span key={c} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{c.replace(/_/g, ' ')}</span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
