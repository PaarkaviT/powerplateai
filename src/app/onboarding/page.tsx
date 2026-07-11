'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/Icons';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/Toast';

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'male',
    height_cm: '',
    weight_kg: '',
    activity_level: 'sedentary',
    region_cuisine: 'north-indian',
    health_goals: [] as string[],
    diabetic: false,
    hypertension: false,
    pregnancy: false,
    dietary_preference: 'omnivore',
    allergies: [] as string[],
    custom_allergies: '',
  });

  const cuisinesList = [
    { id: 'north-indian', label: 'North Indian' },
    { id: 'south-indian', label: 'South Indian' },
    { id: 'mediterranean', label: 'Mediterranean' },
    { id: 'east-asian', label: 'East Asian' },
    { id: 'italian', label: 'Italian' },
    { id: 'western', label: 'Western' },
    { id: 'mexican', label: 'Mexican' },
  ];

  const goalsList = [
    { id: 'weight_loss', label: 'Weight Loss' },
    { id: 'muscle_gain', label: 'Muscle Gain' },
    { id: 'improve_energy', label: 'Improve Energy' },
    { id: 'better_digestion', label: 'Better Digestion' },
    { id: 'maintain_weight', label: 'Maintain Weight' },
  ];

  const dietsList = [
    { id: 'omnivore', label: 'Omnivore', desc: 'Balanced standard diet. No restrictions.', icon: '🍽️' },
    { id: 'vegetarian', label: 'Vegetarian', desc: 'Plant-based with dairy. No meat.', icon: '🥦' },
    { id: 'vegan', label: 'Vegan', desc: 'Strictly plant-based. Zero animal products.', icon: '🌱' },
    { id: 'keto', label: 'Keno', desc: 'High-fat, very low-carbohydrate focus.', icon: '🥑' },
    { id: 'gluten-free', label: 'Gluten-Free', desc: 'Excludes wheat, barley, and gluten.', icon: '🌾' },
    { id: 'jain', label: 'Jain', desc: 'Strict vegetarian. No root vegetables (onion, garlic).', icon: '🧄' },
    { id: 'halal', label: 'Halal', desc: 'Enforces halal dietary rules.', icon: '🌙' },
  ];

  const commonAllergies = ['Nuts', 'Dairy', 'Gluten', 'Eggs', 'Shellfish', 'Soy'];

  // Real-time BMI calculation helper
  const getCalculatedBMI = () => {
    const h = Number(formData.height_cm);
    const w = Number(formData.weight_kg);
    if (!h || !w || h <= 0) return null;
    const h_m = h / 100;
    const bmiVal = w / (h_m * h_m);
    const rounded = Math.round(bmiVal * 10) / 10;
    
    let classification = 'Normal';
    let colorClass = 'text-emerald-600 dark:text-emerald-450';
    if (rounded < 18.5) {
      classification = 'Underweight';
      colorClass = 'text-amber-500';
    } else if (rounded >= 25 && rounded < 30) {
      classification = 'Overweight';
      colorClass = 'text-amber-500';
    } else if (rounded >= 30) {
      classification = 'Obese';
      colorClass = 'text-rose-500';
    }
    
    return { value: rounded, classification, colorClass };
  };

  const bmiInfo = getCalculatedBMI();

  const toggleGoal = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      health_goals: prev.health_goals.includes(id)
        ? prev.health_goals.filter((g) => g !== id)
        : [...prev.health_goals, id],
    }));
  };

  const toggleAllergy = (allergy: string) => {
    setFormData((prev) => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter((a) => a !== allergy)
        : [...prev.allergies, allergy],
    }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.name.trim() || !formData.age || !formData.height_cm || !formData.weight_kg) {
        toast('Please fill out all metric inputs first', 'error');
        return;
      }
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleFinish = async () => {
    try {
      const parsedAllergies = [...formData.allergies];
      if (formData.custom_allergies.trim()) {
        const custom = formData.custom_allergies.split(',').map((item) => item.trim());
        parsedAllergies.push(...custom);
      }

      await apiFetch('/api/profile/setup', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          age: Number(formData.age),
          gender: formData.gender,
          height_cm: Number(formData.height_cm),
          weight_kg: Number(formData.weight_kg),
          activity_level: formData.activity_level,
          region_cuisine: formData.region_cuisine,
          health_goals: formData.health_goals,
          diabetic: formData.diabetic,
          hypertension: formData.hypertension,
          pregnancy: formData.gender === 'female' ? formData.pregnancy : false,
          dietary_preference: formData.dietary_preference,
          allergies: parsedAllergies,
        }),
      });

      toast('Onboarding completed! Welcome to Power Plate!', 'success');
      router.push('/feed');
    } catch (err: any) {
      toast(err.message || 'Failed to complete profile onboarding', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-10 min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-150 dark:border-zinc-800 shadow-2xl p-6 sm:p-10 space-y-8">
        
        {/* Header & Step progress bar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
              <span className="font-extrabold text-lg text-orange-600 dark:text-orange-400">Power Plate Setup</span>
            </div>
            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">Step {step} of 4</span>
          </div>
          
          {/* Progress track */}
          <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Content Box */}
        <div className="min-h-[300px]">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Welcome! Let's get to know you</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Enter your name and body metrics to compute your healthy TDEE targets.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-800 text-sm text-zinc-950 dark:text-zinc-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Age (years)</label>
                    <input
                      type="number"
                      required
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="28"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-800 text-sm text-zinc-950 dark:text-zinc-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-800 text-sm text-zinc-950 dark:text-zinc-50"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Height (cm)</label>
                    <input
                      type="number"
                      required
                      value={formData.height_cm}
                      onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                      placeholder="175"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-800 text-sm text-zinc-950 dark:text-zinc-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Weight (kg)</label>
                    <input
                      type="number"
                      required
                      value={formData.weight_kg}
                      onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                      placeholder="70"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-800 text-sm text-zinc-950 dark:text-zinc-50"
                    />
                  </div>
                </div>

                {/* BMI display widget */}
                {bmiInfo && (
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-850 rounded-2xl border border-zinc-150 dark:border-zinc-800 flex items-center justify-between animate-fade-in">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase text-zinc-400">Auto-Computed BMI</p>
                      <p className="text-lg font-black mt-1 text-zinc-800 dark:text-zinc-100">
                        {bmiInfo.value}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-extrabold uppercase text-zinc-400">Classification</p>
                      <span className={`text-xs font-black uppercase tracking-wider block mt-1 ${bmiInfo.colorClass}`}>
                        {bmiInfo.classification}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Activity Level</label>
                    <select
                      value={formData.activity_level}
                      onChange={(e) => setFormData({ ...formData, activity_level: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-800 text-sm text-zinc-950 dark:text-zinc-50"
                    >
                      <option value="sedentary">Sedentary (desk job)</option>
                      <option value="lightly_active">Lightly active (1-3 days/wk)</option>
                      <option value="moderately_active">Moderately active (3-5 days/wk)</option>
                      <option value="very_active">Very active (6-7 days/wk)</option>
                      <option value="extra_active">Extra active (intense training)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Preferred Cuisine</label>
                    <select
                      value={formData.region_cuisine}
                      onChange={(e) => setFormData({ ...formData, region_cuisine: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-800 text-sm text-zinc-950 dark:text-zinc-50"
                    >
                      {cuisinesList.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Fitness Goals & Health checks</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Select what you want to achieve, and check relevant options.</p>
              </div>

              <div className="space-y-4">
                {/* Health goals */}
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Health Goals</label>
                  <div className="flex flex-wrap gap-2.5">
                    {goalsList.map((g) => {
                      const isSelected = formData.health_goals.includes(g.id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => toggleGoal(g.id)}
                          className={`px-5 py-2.5 rounded-full text-xs font-bold border transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/10'
                              : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:bg-zinc-800 dark:border-zinc-850 dark:text-zinc-300'
                          }`}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Health Conditions */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Health Conditions</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-850 border border-zinc-150 dark:border-zinc-800 rounded-2xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.diabetic}
                        onChange={(e) => setFormData({ ...formData, diabetic: e.target.checked })}
                        className="w-4 h-4 accent-orange-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold">Diabetic</p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Requires glucose monitoring</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-850 border border-zinc-150 dark:border-zinc-800 rounded-2xl cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hypertension}
                        onChange={(e) => setFormData({ ...formData, hypertension: e.target.checked })}
                        className="w-4 h-4 accent-orange-500 cursor-pointer"
                      />
                      <div>
                        <p className="text-xs font-bold">Hypertension / Heart</p>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Requires sodium control</p>
                      </div>
                    </label>

                    {/* Show pregnancy checkbox only if gender is female */}
                    {formData.gender === 'female' && (
                      <label className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-850 border border-zinc-150 dark:border-zinc-800 rounded-2xl cursor-pointer col-span-1 sm:col-span-2 animate-fade-in">
                        <input
                          type="checkbox"
                          checked={formData.pregnancy}
                          onChange={(e) => setFormData({ ...formData, pregnancy: e.target.checked })}
                          className="w-4 h-4 accent-orange-500 cursor-pointer"
                        />
                        <div>
                          <p className="text-xs font-bold">Pregnancy</p>
                          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Enforces nutrient-dense diets</p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Your dietary preference</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Choose one preference (you can adjust this later in settings).</p>
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {dietsList.map((d) => {
                  const isSelected = formData.dietary_preference === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, dietary_preference: d.id })}
                      className={`flex items-center text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50/50 border-orange-500 dark:bg-orange-950/30'
                          : 'bg-white border-zinc-150 hover:border-zinc-300 dark:bg-zinc-800 dark:border-zinc-800'
                      }`}
                    >
                      <span className="text-3xl mr-4">{d.icon}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${isSelected ? 'text-orange-700 dark:text-orange-400' : ''}`}>
                          {d.label}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">{d.desc}</p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-xs">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">Any allergies or foods to avoid?</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Select common food allergens, or type custom items below.</p>
              </div>

              <div className="space-y-5">
                <div className="flex flex-wrap gap-2.5">
                  {commonAllergies.map((allergy) => {
                    const isSelected = formData.allergies.includes(allergy);
                    return (
                      <button
                        key={allergy}
                        type="button"
                        onClick={() => toggleAllergy(allergy)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-100 border-orange-300 text-orange-850 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300'
                            : 'bg-white border-zinc-200 text-zinc-605 hover:border-zinc-300 dark:bg-zinc-800 dark:border-zinc-750 dark:text-zinc-400'
                        }`}
                      >
                        {allergy}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-zinc-650 dark:text-zinc-400 mb-1">
                    Other Allergies (Separated by commas)
                  </label>
                  <input
                    type="text"
                    value={formData.custom_allergies}
                    onChange={(e) => setFormData({ ...formData, custom_allergies: e.target.value })}
                    placeholder="e.g., Strawberries, Peanuts"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-800 dark:bg-zinc-800 text-sm text-zinc-950 dark:text-zinc-50"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons footer */}
        <div className="flex items-center justify-between pt-6 border-t border-zinc-100 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 disabled:opacity-0 transition-all dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200 cursor-pointer"
          >
            Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center justify-center px-6 py-3 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-orange-700 hover:shadow-orange-600/10 transition-all cursor-pointer"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="flex items-center justify-center px-8 py-3 bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-orange-700 hover:shadow-orange-600/10 transition-all cursor-pointer"
            >
              Finish Setup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
