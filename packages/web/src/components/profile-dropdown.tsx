'use client';

import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SubscriptionPlan, SubscriptionStatus } from '@handycall/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PLAN_NAMES: Record<SubscriptionPlan, string> = {
  [SubscriptionPlan.STARTER]: 'Starter',
  [SubscriptionPlan.PRO]: 'Pro',
  [SubscriptionPlan.MAX]: 'Max',
};

export function ProfileDropdown() {
  const { user, email, company, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
  };

  // Get user initials for avatar
  const getInitials = () => {
    // Try to get from user object first
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user?.first_name) {
      return user.first_name.substring(0, 2).toUpperCase();
    }
    // Fallback to email
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Get display name
  const getDisplayName = () => {
    // Try to get from user object first
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user?.first_name) {
      return user.first_name;
    }
    // Fallback to email username
    if (email) {
      return email.split('@')[0];
    }
    return 'User';
  };

  // Get plan info
  const getPlanInfo = () => {
    if (!company?.subscription_plan) {
      return { text: 'No Plan', color: 'text-muted-foreground' };
    }

    const planName = PLAN_NAMES[company.subscription_plan as SubscriptionPlan];
    const status = company.subscription_status;

    let statusText = '';
    let color = 'text-muted-foreground';

    if (status === SubscriptionStatus.TRIALING) {
      statusText = ' (Trial)';
      color = 'text-blue-600';
    } else if (status === SubscriptionStatus.ACTIVE) {
      statusText = ' (Active)';
      color = 'text-green-600';
    } else if (status === SubscriptionStatus.PAST_DUE) {
      statusText = ' (Past Due)';
      color = 'text-yellow-600';
    } else if (status === SubscriptionStatus.CANCELED) {
      statusText = ' (Canceled)';
      color = 'text-red-600';
    }

    return { text: `${planName}${statusText}`, color };
  };

  const planInfo = getPlanInfo();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center space-x-3 rounded-lg px-3 py-2 transition-colors duration-200 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring">
          <Avatar className="h-9 w-9 transition-transform duration-200 hover:scale-105">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left md:block">
            <p className="text-sm font-medium text-foreground">{getDisplayName()}</p>
            <p className={`text-xs truncate max-w-[150px] ${planInfo.color}`}>
              {planInfo.text}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
            {email && (
              <p className="text-xs leading-none text-muted-foreground">
                {email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
