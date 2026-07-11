'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/Icons';
import { apiFetch, setAuthToken, getAuthToken } from '@/lib/api';
import { toast } from '@/components/Toast';

export default function Home() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // If the browser has a stored auth token, try to validate it
    const token = getAuthToken();
    if (token) {
      apiFetch('/api/auth/me')
        .then((data) => {
          if (data.profile?.onboarding_complete) {
            router.push('/feed');
          } else {
            router.push('/onboarding');
          }
        })
        .catch(() => {
          // Stale token, display login panels
          setCheckingAuth(false);
        });
    } else {
      setCheckingAuth(false);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast('Please enter both email and password', 'error');
      return;
    }

    setLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

    try {
      const data = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (isLogin) {
        setAuthToken(data.token);
        toast('Welcome to Power Plate!', 'success');
        
        // Query profile onboarding status to route correctly
        const meData = await apiFetch('/api/auth/me');
        if (meData.profile?.onboarding_complete) {
          router.push('/feed');
        } else {
          router.push('/onboarding');
        }
      } else {
        toast('Registration complete! Please sign in.', 'success');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      toast(err.message || 'Authentication error', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-orange-50/20 dark:bg-zinc-950">
        <img src="/logo.png" alt="Power Plate Logo" className="w-16 h-16 object-contain animate-pulse mb-3" />
        <p className="text-sm font-medium text-orange-855 dark:text-orange-300">Resuming session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-screen -m-4 sm:-m-6 md:-m-8 bg-zinc-50 dark:bg-zinc-950 animate-fade-in">
      {/* Design Side Panel */}
      <div className="flex flex-col justify-center items-center md:w-1/2 p-8 bg-gradient-to-tr from-orange-600 via-orange-500 to-amber-500 text-white select-none">
        <div className="max-w-md text-center md:text-left space-y-6">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">
              <img src="/logo.png" alt="Power Plate Logo" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Power Plate</h1>
          </div>
          <h2 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
            Eat Smarter.<br />Live Healthier.
          </h2>
          <p className="text-orange-50 text-base font-medium leading-relaxed opacity-95">
            Get personalized nutrition plans, weekly meal grids, and daily glycemic index tracking customized for your body metrics.
          </p>
        </div>
      </div>

      {/* Login / Registration Panel */}
      <div className="flex flex-col justify-center items-center md:w-1/2 p-6 sm:p-12 bg-white dark:bg-zinc-950">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {isLogin ? 'Sign in to your account' : 'Start your health journey'}
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {isLogin ? "Don't have an account? " : 'Already registered? '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setPassword('');
                }}
                className="font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 cursor-pointer"
              >
                {isLogin ? 'Sign up here' : 'Log in here'}
              </button>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-900 text-sm text-zinc-950 dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-900 text-sm text-zinc-950 dark:text-zinc-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? (
                <div className="w-5.5 h-5.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isLogin ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
