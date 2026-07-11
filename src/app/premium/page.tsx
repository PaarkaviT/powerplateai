'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/Toast';

export default function Premium() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchProfile = () => {
    setLoading(true);
    apiFetch('/api/profile')
      .then((data) => setProfile(data))
      .catch((err) => toast(err.message || 'Failed to load profile status', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSetPremium = async (premiumState: boolean) => {
    setUpdating(true);
    try {
      const updated = await apiFetch('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          is_premium: premiumState
        })
      });
      setProfile(updated);
      toast(
        premiumState 
          ? 'Congratulations! You are now a Premium Member! 👑🌟' 
          : 'Downgraded to Basic Free Plan.', 
        'success'
      );
      // Force reload page state
      window.location.reload();
    } catch (err: any) {
      toast(err.message || 'Failed to update subscription tier', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isPremiumActive = !!profile?.is_premium;

  return (
    <div className="max-w-xl mx-auto space-y-8 py-4 text-left">
      {/* Tier Status card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Current Account Tier</h3>
            <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1 flex items-center gap-2">
              {isPremiumActive ? (
                <>
                  <span>PowerPlate Premium</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 font-extrabold uppercase animate-pulse">
                    Active 👑
                  </span>
                </>
              ) : (
                <>
                  <span>PowerPlate Basic</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400 font-extrabold uppercase">
                    Free
                  </span>
                </>
              )}
            </p>
          </div>
          <span className="text-4xl">{isPremiumActive ? '🌟' : '🥗'}</span>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {isPremiumActive 
            ? 'Thank you for supporting PowerPlate! You have complete, unrestricted access to all smart features, meal calendars, and coaching utilities.' 
            : 'Unlock the full power of healthy eating. Upgrade to Premium to experience weekly meal logging, custom nutrient constraints, and AI feedback coaching.'}
        </p>

        {isPremiumActive ? (
          <button
            onClick={() => handleSetPremium(false)}
            disabled={updating}
            className="w-full py-3 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-800 transition-all dark:border-zinc-800 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-300 cursor-pointer"
          >
            {updating ? 'Processing...' : 'Downgrade to Basic (Free) Plan'}
          </button>
        ) : (
          <button
            onClick={() => handleSetPremium(true)}
            disabled={updating}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex justify-center items-center cursor-pointer"
          >
            {updating ? 'Upgrading...' : 'Upgrade to Premium - $9.99/mo (Mock Unlock) 👑'}
          </button>
        )}
      </div>

      {/* Feature comparison table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">Plan Comparison</h3>
          <p className="text-xs text-zinc-450 dark:text-zinc-500 mt-1">See what features are included in each subscription plan tier</p>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
          {/* Feature 1 */}
          <div className="py-3.5 flex justify-between items-center text-xs">
            <div>
              <p className="font-extrabold text-zinc-800 dark:text-zinc-200">Discover Recipes & Community Contribution</p>
              <p className="text-[10px] text-zinc-450 mt-0.5">Explore main feed and contribute recipes</p>
            </div>
            <div className="flex items-center gap-6 font-bold">
              <span className="text-emerald-600 dark:text-emerald-450">Free</span>
              <span className="text-emerald-600 dark:text-emerald-450">Premium</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="py-3.5 flex justify-between items-center text-xs">
            <div>
              <p className="font-extrabold text-zinc-800 dark:text-zinc-200">Weekly Meal Planner & Drag-and-Drop</p>
              <p className="text-[10px] text-zinc-450 mt-0.5">Schedule meals and balance calorie goals</p>
            </div>
            <div className="flex items-center gap-6 font-bold">
              <span className="text-zinc-400">Locked 🔒</span>
              <span className="text-emerald-600 dark:text-emerald-450">Premium</span>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="py-3.5 flex justify-between items-center text-xs">
            <div>
              <p className="font-extrabold text-zinc-800 dark:text-zinc-200">AI Smart Nutrition Coach & Portion Sizing</p>
              <p className="text-[10px] text-zinc-450 mt-0.5">Custom meal swap tips and side pairing guides</p>
            </div>
            <div className="flex items-center gap-6 font-bold">
              <span className="text-zinc-400">Locked 🔒</span>
              <span className="text-emerald-600 dark:text-emerald-450">Premium</span>
            </div>
          </div>

          {/* Feature 4 */}
          <div className="py-3.5 flex justify-between items-center text-xs">
            <div>
              <p className="font-extrabold text-zinc-800 dark:text-zinc-200">Advanced Nutritional Ceiling Filters</p>
              <p className="text-[10px] text-zinc-450 mt-0.5">Set sugar, sodium, and glycemic limits in feed</p>
            </div>
            <div className="flex items-center gap-6 font-bold">
              <span className="text-zinc-400">Locked 🔒</span>
              <span className="text-emerald-600 dark:text-emerald-450">Premium</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
