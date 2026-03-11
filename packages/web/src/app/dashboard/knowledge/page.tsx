'use client';

import { PageHeader } from '@/components/portal/page-header';
import { KnowledgeTab } from './knowledge-tab';

export default function KnowledgePage() {
  return (
    <div className="space-y-6 animate-fade-up max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Knowledge"
        title="Knowledge base"
        subtitle="Teach your AI about services, policies, and FAQs."
      />
      <KnowledgeTab />
    </div>
  );
}
