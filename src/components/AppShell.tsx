'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icons } from './Icons';
import { ToastContainer, toast } from './Toast';
import { apiFetch, clearAuthToken } from '@/lib/api';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      clearAuthToken();
      toast('Signed out successfully!', 'success');
      router.push('/');
    } catch (err) {
      clearAuthToken();
      router.push('/');
    }
  };

  const isAuthPage = pathname === '/';
  const isOnboardingPage = pathname === '/onboarding';
  const isCookingMode = pathname?.includes('/cooking') || false;

  const hideNavigation = isAuthPage || isOnboardingPage || isCookingMode;

  useEffect(() => {
    if (isAuthPage) {
      setLoading(false);
      return;
    }

    // Check if the user is authenticated and fetch their profile
    apiFetch('/api/auth/me')
      .then((data) => {
        if (data.profile) {
          setProfile(data.profile);
          // If profile onboarding is not complete, redirect to onboarding wizard
          if (!data.profile.onboarding_complete && !isOnboardingPage) {
            router.push('/onboarding');
          }
        } else {
          // Redirect to onboarding if authenticated but profile row is missing
          if (!isOnboardingPage) {
            router.push('/onboarding');
          }
        }
      })
      .catch((err) => {
        console.error('AppShell authentication failed:', err);
        // apiFetch automatically redirects to '/' if unauthorized
      })
      .finally(() => {
        setLoading(false);
      });
  }, [pathname, isAuthPage, isOnboardingPage, router]);

  if (loading && !isAuthPage) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-emerald-50/20 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Icons.Logo className="animate-spin text-emerald-600" size={48} />
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Loading Power Plate...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: 'Feed', href: '/feed', icon: Icons.Home },
    { name: 'Planner', href: '/planner', icon: Icons.Calendar },
    { name: 'Tracker', href: '/tracker', icon: Icons.ChartBar },
    { name: 'Contribute', href: '/contribute', icon: Icons.PlusCircle },
    { name: 'Profile', href: '/profile', icon: Icons.User },
    { name: 'Premium 👑', href: '/premium', icon: Icons.Star },
  ];

  return (
    <div className="flex flex-1 min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      {/* Desktop Sidebar */}
      {!hideNavigation && (
        <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-3 px-6 h-16 border-b border-zinc-100 dark:border-zinc-800/80">
            <img src="/logo.png" alt="Power Plate Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-extrabold tracking-tight text-orange-600 dark:text-orange-400">Power Plate</span>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-450 border-r-2 border-orange-500'
                      : 'text-zinc-650 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon size={20} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          {profile && (
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-750 dark:text-orange-400 flex items-center justify-center font-bold text-lg border border-orange-200/50 dark:border-orange-900/30">
                {profile.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate leading-none mb-1">{profile.name}</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate leading-none">{profile.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                title="Log Out"
              >
                <Icons.LogOut size={18} />
              </button>
            </div>
          )}
        </aside>
      )}

      {/* Main Content shell */}
      <div className={`flex flex-col flex-1 ${!hideNavigation ? 'md:pl-64' : ''}`}>
        {/* Top bar header */}
        {!hideNavigation && (
          <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between px-6">
            <div className="flex items-center gap-2 md:hidden">
              <img src="/logo.png" alt="Power Plate Logo" className="w-7 h-7 object-contain" />
              <span className="text-lg font-black tracking-tight text-orange-600 dark:text-orange-400">Power Plate</span>
            </div>
            
            <div className="hidden md:block">
              <h2 className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100">
                {pathname === '/feed' && 'Discover Healthy Recipes'}
                {pathname === '/planner' && 'Weekly Meal Planner'}
                {pathname === '/tracker' && 'Nutrition & Meal Tracker'}
                {pathname === '/contribute' && 'Contribute a Recipe'}
                {pathname === '/profile' && 'Account Settings'}
                {pathname === '/premium' && 'Premium Upgrades'}
              </h2>
            </div>

            {profile && (
              <div className="hidden md:flex items-center gap-3">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Welcome, <strong className="text-zinc-700 dark:text-zinc-200">{profile.name}</strong>
                </span>
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-750 dark:text-orange-400 flex items-center justify-center font-bold text-sm border border-orange-200/50 dark:border-orange-900/30">
                  {profile.name?.[0]?.toUpperCase()}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                  title="Log Out"
                >
                  <Icons.LogOut size={16} />
                </button>
              </div>
            )}
            
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-750 dark:text-orange-400 flex items-center justify-center font-bold text-sm border border-orange-200/50 dark:border-orange-900/30">
                {profile?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                title="Log Out"
              >
                <Icons.LogOut size={16} />
              </button>
            </div>
          </header>
        )}

        {/* Content canvas */}
        <main className={`flex-1 flex flex-col ${!hideNavigation ? 'p-4 sm:p-6 md:p-8 pb-20 md:pb-8' : ''}`}>
          {children}
        </main>

        {/* Mobile Navigation bar */}
        {!hideNavigation && (
          <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-100 dark:border-zinc-800/80 flex justify-between items-center py-1 px-2 md:hidden shadow-2xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-xl transition-all duration-200 flex-1 min-w-[48px] text-center ${
                    isActive
                      ? 'text-orange-600 dark:text-orange-400 font-black scale-105'
                      : 'text-zinc-400 hover:text-zinc-950 dark:text-zinc-500 dark:hover:text-zinc-200'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-[9px] font-extrabold tracking-tight">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <ToastContainer />
    </div>
  );
}
