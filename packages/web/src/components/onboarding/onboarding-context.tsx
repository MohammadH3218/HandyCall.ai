'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { computeOnboardingStatus } from '@/lib/setup-status';
import { UserRole } from '@/types/shared';

type OnboardingStatus = {
  profile: boolean;
  billing: boolean;
  companyProfile: boolean;
  serviceArea: boolean;
  marketplaceProfile: boolean;
  calendar: boolean;
};

type OnboardingContextValue = {
  loading: boolean;
  isAuthenticated: boolean;
  userRole: UserRole | null;
  company: any | null;
  status: OnboardingStatus;
  refreshAll: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { company, isAuthenticated, isLoading, checkAuth, userRole, user, email } = useAuthStore();
  const [dataLoading, setDataLoading] = useState(false);

  const refreshAll = async () => {
    if (!isAuthenticated || userRole === UserRole.ADMIN) return;
    setDataLoading(true);
    try {
      await checkAuth();
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated && userRole !== UserRole.ADMIN) {
      refreshAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, userRole]);

  const status = useMemo<OnboardingStatus>(() => {
    return computeOnboardingStatus({
      company,
      userFirstName: user?.first_name,
      userLastName: user?.last_name,
      userEmail: email,
    });
  }, [company, email, user?.first_name, user?.last_name]);

  const loading = isLoading || dataLoading;

  return (
    <OnboardingContext.Provider
      value={{
        loading,
        isAuthenticated,
        userRole,
        company,
        status,
        refreshAll,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
