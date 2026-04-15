import { Suspense } from 'react';
import { ProProfileClient } from './ProProfileClient';

export default function ProProfilePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-400">Loading...</div>}>
      <ProProfileClient id={params.id} />
    </Suspense>
  );
}
