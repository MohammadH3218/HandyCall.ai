'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global app error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6 py-16">
          <div className="w-full rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-600">
              Application Error
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              Something crashed on this page
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The app hit a client-side error while rendering. The details below should help us
              identify the exact cause quickly.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Error Message
              </p>
              <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">
                {error?.message || 'Unknown client-side error'}
              </pre>
              {error?.digest ? (
                <>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Digest
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">
                    {error.digest}
                  </pre>
                </>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Try again
              </button>
              <a
                href="/pro/login"
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to login
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
