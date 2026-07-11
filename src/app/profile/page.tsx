'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/Icons';
import { apiFetch, clearAuthToken } from '@/lib/api';
import { toast } from '@/components/Toast';

export default function Profile() {
  const router = useRouter();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Family Profiles state
  const [family, setFamily] = useState<any[]>([]);
  const [loadingFamily, setLoadingFamily] = useState(true);
  const [famName, setFamName] = useState('');
  const [famDiet, setFamDiet] = useState('nonvegetarian');
  const [famDiabetic, setFamDiabetic] = useState(false);
  const [famHypertension, setFamHypertension] = useState(false);
  const [addingFam, setAddingFam] = useState(false);

  // Form Fields State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('sedentary');
  const [diet, setDiet] = useState('nonvegetarian');
  const [allergiesText, setAllergiesText] = useState('');
  const [regionCuisine, setRegionCuisine] = useState('north-indian');
  
  // Health Conditions
  const [diabetic, setDiabetic] = useState(false);
  const [hypertension, setHypertension] = useState(false);
  const [pregnancy, setPregnancy] = useState(false);

  const cuisinesList = [
    { id: 'north-indian', label: 'North Indian' },
    { id: 'south-indian', label: 'South Indian' },
    { id: 'mediterranean', label: 'Mediterranean' },
    { id: 'east-asian', label: 'East Asian' },
    { id: 'italian', label: 'Italian' },
    { id: 'western', label: 'Western' },
    { id: 'mexican', label: 'Mexican' },
  ];

  const loadFamilyProfiles = () => {
    setLoadingFamily(true);
    apiFetch('/api/profile/family')
      .then((data) => setFamily(data || []))
      .catch((err) => console.error('Failed to load family:', err))
      .finally(() => setLoadingFamily(false));
  };

  useEffect(() => {
    apiFetch('/api/profile')
      .then((data) => {
        setProfile(data);
        setName(data.name || '');
        setAge(data.age !== null ? String(data.age) : '');
        setGender(data.gender || 'male');
        setHeight(data.height_cm !== null ? String(data.height_cm) : '');
        setWeight(data.weight_kg !== null ? String(data.weight_kg) : '');
        setActivityLevel(data.activity_level || 'sedentary');
        setDiet(data.dietary_preference || 'nonvegetarian');
        setAllergiesText(data.allergies ? data.allergies.join(', ') : '');
        setRegionCuisine(data.region_cuisine || 'north-indian');
        setDiabetic(!!data.diabetic);
        setHypertension(!!data.hypertension);
        setPregnancy(!!data.pregnancy);
      })
      .catch((err) => {
        toast(err.message || 'Failed to load profile settings', 'error');
      })
      .finally(() => {
        setLoading(false);
      });

    loadFamilyProfiles();
  }, []);

  const handleAddFamilyMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!famName.trim()) {
      toast('Family member name is required', 'error');
      return;
    }
    setAddingFam(true);
    try {
      const newFam = await apiFetch('/api/profile/family', {
        method: 'POST',
        body: JSON.stringify({
          name: famName,
          dietary_preference: famDiet,
          diabetic: famDiabetic,
          hypertension: famHypertension,
          allergies: []
        })
      });
      toast(`Added family member: ${newFam.name}! 🥗`, 'success');
      setFamily((prev) => [...prev, newFam]);
      setFamName('');
      setFamDiet('nonvegetarian');
      setFamDiabetic(false);
      setFamHypertension(false);
    } catch (err: any) {
      toast(err.message || 'Failed to add family member', 'error');
    } finally {
      setAddingFam(false);
    }
  };

  const handleDeleteFamilyMember = async (id: string) => {
    if (!confirm('Are you sure you want to remove this family member profile?')) return;
    try {
      await apiFetch(`/api/profile/family/${id}`, { method: 'DELETE' });
      toast('Family profile deleted successfully', 'success');
      setFamily((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      toast(err.message || 'Failed to delete family profile', 'error');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age) {
      toast('Name and age are required', 'error');
      return;
    }

    setSaving(true);
    
    // Parse allergies list
    const parsedAllergies = allergiesText
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    try {
      const data = await apiFetch('/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          age: Number(age),
          gender,
          height_cm: height ? Number(height) : null,
          weight_kg: weight ? Number(weight) : null,
          activity_level: activityLevel,
          dietary_preference: diet,
          allergies: parsedAllergies,
          region_cuisine: regionCuisine,
          diabetic,
          hypertension,
          pregnancy: gender === 'female' ? pregnancy : false,
        }),
      });

      toast('Profile updated successfully!', 'success');
      setProfile(data);
    } catch (err: any) {
      toast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      clearAuthToken();
      toast('Signed out successfully!', 'success');
      router.push('/');
    } catch (err: any) {
      clearAuthToken();
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs text-zinc-500">Retrieving account settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      
      {/* Prominent Daily Calorie Target and BMI display cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {profile && profile.daily_calorie_target && (
          <div className="bg-gradient-to-r from-orange-500 to-orange-650 border border-orange-450 rounded-3xl p-5 text-white shadow-md flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider opacity-85">Settings</p>
              <h3 className="text-lg font-black mt-0.5">Personal Profile</h3>
              <h3 className="text-2xl font-black mt-1">
                {profile.daily_calorie_target.toLocaleString()} kcal
              </h3>
            </div>
            <span className="text-2xl select-none">🔥</span>
          </div>
        )}

        {profile && profile.bmi && (
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 border border-teal-450 rounded-3xl p-5 text-white shadow-md flex justify-between items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-85">Body Mass Index (BMI)</p>
              <h3 className="text-2xl font-black mt-1">
                {profile.bmi}
              </h3>
            </div>
            <span className="text-2xl select-none">🩺</span>
          </div>
        )}
      </div>

      {/* Profile Edit Form */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
              Display Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-900 text-sm text-zinc-950 dark:text-zinc-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Age (Years)
              </label>
              <input
                type="number"
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g., 28"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-900 text-sm text-zinc-950 dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Gender Identity
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-900 text-sm text-zinc-950 dark:text-zinc-50"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Height (cm)
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="175"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-900 text-sm text-zinc-950 dark:text-zinc-50"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wider">Weight (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="70"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-900 text-sm text-zinc-950 dark:text-zinc-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Physical Activity
              </label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-900 text-sm text-zinc-950 dark:text-zinc-50"
              >
                <option value="sedentary">Sedentary - Desk job, mostly sitting, little or no exercise</option>
                <option value="lightly_active">Lightly Active - Desk job with light exercise or walking 1–3 days/week</option>
                <option value="moderately_active">Moderately Active - Regular exercise 3–5 days/week or a job involving frequent walking/standing</option>
                <option value="very_active">Highly Active - Physical job and/or intense exercise 6–7 days/week</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Cuisine Preference
              </label>
              <select
                value={regionCuisine}
                onChange={(e) => setRegionCuisine(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-900 text-sm text-zinc-950 dark:text-zinc-50"
              >
                {cuisinesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Dietary Focus
              </label>
              <select
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-900 text-sm text-zinc-950 dark:text-zinc-50"
              >
                <option value="omnivore">Nonvegetarian</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="keto">Keto</option>
                <option value="gluten-free">Gluten-Free</option>
                <option value="jain">Jain</option>
                <option value="halal">Halal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Allergies & Exclusions
              </label>
              <input
                type="text"
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                placeholder="e.g., Nuts, Eggs"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-900 text-sm text-zinc-950 dark:text-zinc-50"
              />
            </div>
          </div>

          {/* Health Conditions Checkboxes */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Health Conditions</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-850 border border-zinc-150 dark:border-zinc-850 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={diabetic}
                  onChange={(e) => setDiabetic(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold">Diabetic</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-850 border border-zinc-150 dark:border-zinc-800 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={hypertension}
                  onChange={(e) => setHypertension(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold">Hypertension</p>
                </div>
              </label>

              {gender === 'female' && (
                <label className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-850 border border-zinc-150 dark:border-zinc-800 rounded-2xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pregnancy}
                    onChange={(e) => setPregnancy(e.target.checked)}
                    className="w-4 h-4 accent-orange-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold">Pregnancy</span>
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-50 transition-colors flex justify-center items-center cursor-pointer"
            >
              {saving ? <div className="w-5.5 h-5.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-5 py-3 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-sm font-bold text-zinc-500 hover:text-zinc-800 transition-colors dark:border-zinc-800 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200"
            >
              Log Out
            </button>
          </div>
        </form>
      </div>

      {/* 2. FAMILY PROFILES MANAGEMENT SECTION */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6 text-left">
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-1.5 text-zinc-900 dark:text-zinc-50">
            <span>👨‍👩‍👧‍👦</span> Family Member Profiles
          </h3>
          <p className="text-xs text-zinc-450 dark:text-zinc-500 mt-1">
            Add profiles for family members (e.g. Dad, Mom, Child) to check recipes against their custom health targets.
          </p>
        </div>

        {/* List of family members */}
        {loadingFamily ? (
          <div className="py-4 flex justify-center">
            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : family.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {family.map((member) => (
              <div 
                key={member.id} 
                className="p-4 bg-zinc-50 dark:bg-zinc-850/50 border border-zinc-150 dark:border-zinc-800/80 rounded-2xl flex justify-between items-center"
              >
                <div>
                  <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    {member.name}
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-orange-100 dark:bg-orange-950 text-orange-750 font-bold uppercase">
                      {member.dietary_preference}
                    </span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {member.diabetic && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 font-bold uppercase">
                        Diabetic
                      </span>
                    )}
                    {member.hypertension && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold uppercase">
                        Hypertension
                      </span>
                    )}
                    {!member.diabetic && !member.hypertension && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-semibold uppercase">
                        No Conditions
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteFamilyMember(member.id)}
                  className="p-2 text-zinc-400 hover:text-rose-500 cursor-pointer"
                  title="Remove Profile"
                >
                  <Icons.Trash size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-zinc-450 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            No family profiles added yet. Use the form below to add one.
          </div>
        )}

        {/* Add family member form */}
        <form onSubmit={handleAddFamilyMember} className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 space-y-4">
          <p className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">Add Family Member</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Name</label>
              <input
                type="text"
                required
                value={famName}
                onChange={(e) => setFamName(e.target.value)}
                placeholder="e.g. Dad, Mom"
                className="w-full px-4 py-2 rounded-xl border border-zinc-250 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-800 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Dietary Preference</label>
              <select
                value={famDiet}
                onChange={(e) => setFamDiet(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-zinc-250 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-800 text-xs"
              >
                <option value="omnivore">Nonvegetarian</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="keto">Keto</option>
                <option value="gluten-free">Gluten-Free</option>
                <option value="jain">Jain</option>
                <option value="halal">Halal</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-350 cursor-pointer">
              <input
                type="checkbox"
                checked={famDiabetic}
                onChange={(e) => setFamDiabetic(e.target.checked)}
                className="w-4 h-4 accent-orange-500 cursor-pointer"
              />
              Diabetic
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-350 cursor-pointer">
              <input
                type="checkbox"
                checked={famHypertension}
                onChange={(e) => setFamHypertension(e.target.checked)}
                className="w-4 h-4 accent-orange-500 cursor-pointer"
              />
              Hypertension / Heart
            </label>
          </div>

          <button
            type="submit"
            disabled={addingFam}
            className="w-full sm:w-auto px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 transition-colors flex justify-center items-center cursor-pointer"
          >
            {addingFam ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '+ Add Family Member'}
          </button>
        </form>
      </div>

    </div>
  );
}
