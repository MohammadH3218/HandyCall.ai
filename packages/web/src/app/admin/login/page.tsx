'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { IconEye, IconEyeOff, IconLoader2 } from '@tabler/icons-react';

function AdminLoginInner() {
  const router = useRouter();

  // Step: 'login' | 'set-password'
  const [step, setStep] = useState<'login' | 'set-password'>('login');

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Set-password form (NEW_PASSWORD_REQUIRED)
  const [displayName, setDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [challengeSession, setChallengeSession] = useState('');
  const [challengeEmail, setChallengeEmail] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        pool_type: 'admin',
        redirect: false,
      });

      if (result?.error) {
        if (result.error.startsWith('NEW_PASSWORD_REQUIRED:')) {
          const encoded = result.error.slice('NEW_PASSWORD_REQUIRED:'.length);
          const payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
          setChallengeSession(payload.session);
          setChallengeEmail(payload.email || email);
          setStep('set-password');
          return;
        }
        const msg = result.error.toLowerCase();
        if (msg.includes('invalid') || msg.includes('incorrect') || msg.includes('notauthorized')) {
          setError('Incorrect email or password.');
        } else {
          setError(result.error);
        }
        return;
      }

      if (result?.ok) {
        router.replace('/admin');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email: challengeEmail,
        password: '', // unused for this flow
        pool_type: 'admin_change_password',
        session_token: challengeSession,
        new_password: newPassword,
        display_name: displayName.trim(),
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      if (result?.ok) {
        router.replace('/admin');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / wordmark */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-extrabold tracking-tight text-slate-900">
            Handy<span className="text-emerald-600">Call</span>
          </span>
          <p className="mt-1 text-[13px] font-medium uppercase tracking-widest text-slate-400">
            Admin Portal
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          {step === 'login' ? (
            <>
              <h1 className="text-[18px] font-bold text-slate-900">Sign in</h1>
              <p className="mt-1 text-[13px] text-slate-400">Enter your admin credentials</p>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    placeholder="admin@handycall.org"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword
                        ? <IconEyeOff className="h-4 w-4" stroke={1.8} />
                        : <IconEye className="h-4 w-4" stroke={1.8} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-[14px] font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60"
                >
                  {isLoading ? (
                    <><IconLoader2 className="h-4 w-4 animate-spin" />Signing in...</>
                  ) : 'Sign in'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-[18px] font-bold text-slate-900">Set up your account</h1>
              <p className="mt-1 text-[13px] text-slate-400">
                Choose a permanent password and enter your name.
              </p>

              {error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSetPassword} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Your name
                  </label>
                  <input
                    type="text"
                    autoComplete="name"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-11 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword
                        ? <IconEyeOff className="h-4 w-4" stroke={1.8} />
                        : <IconEye className="h-4 w-4" stroke={1.8} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Confirm password
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Repeat password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-[14px] font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60"
                >
                  {isLoading ? (
                    <><IconLoader2 className="h-4 w-4 animate-spin" />Setting up...</>
                  ) : 'Complete setup'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50" />}>
      <AdminLoginInner />
    </Suspense>
  );
}
