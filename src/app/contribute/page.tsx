'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icons } from '@/components/Icons';
import { apiFetch } from '@/lib/api';
import { toast } from '@/components/Toast';

export default function Contribute() {
  const router = useRouter();
  
  // Recipe form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prepTime, setPrepTime] = useState('30');
  const [servings, setServings] = useState('2');
  const [imageUrl, setImageUrl] = useState('');

  // Ingredients and Steps lists
  const [ingredients, setIngredients] = useState<any[]>([
    { name: '', quantity: '', unit: 'g' }
  ]);
  const [steps, setSteps] = useState<string[]>(['']);

  // Nutrition Macros & cost
  const [calories, setCalories] = useState('350');
  const [protein, setProtein] = useState('20');
  const [carbs, setCarbs] = useState('40');
  const [fat, setFat] = useState('12');
  const [sugar, setSugar] = useState('5');
  const [sodium, setSodium] = useState('300');

  // Metadata tags
  const [dietaryTag, setDietaryTag] = useState('omnivore');
  const [glycemicIndex, setGlycemicIndex] = useState('medium');
  const [bmiRange, setBmiRange] = useState('all');
  const [genderNote, setGenderNote] = useState('general');
  const [tagsText, setTagsText] = useState('');

  // Loading flags
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AI Recipe Autofill States
  const [aiConcept, setAiConcept] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const handleAiGenerateRecipe = async () => {
    if (!aiConcept.trim()) {
      toast('Please enter a recipe concept first!', 'error');
      return;
    }
    setIsAiGenerating(true);
    try {
      const data = await apiFetch('/api/recipes/ai-generate', {
        method: 'POST',
        body: JSON.stringify({ concept: aiConcept }),
      });

      setName(data.name || '');
      setDescription(data.description || '');
      
      if (data.ingredients && Array.isArray(data.ingredients)) {
        setIngredients(data.ingredients);
      }
      if (data.steps && Array.isArray(data.steps)) {
        setSteps(data.steps);
      }
      
      setCalories(String(data.calories || '350'));
      setProtein(String(data.protein_g || '20'));
      setCarbs(String(data.carbs_g || '40'));
      setFat(String(data.fat_g || '12'));
      setSugar(String(data.sugar_g || '5'));
      setSodium(String(data.sodium_mg || '300'));
      
      setDietaryTag(data.dietary_tag || 'omnivore');
      setGlycemicIndex(data.glycemic_index || 'medium');
      setBmiRange(data.bmi_range || 'all');
      setGenderNote(data.gender_note || 'general');
      
      if (data.tags && Array.isArray(data.tags)) {
        setTagsText(data.tags.join(', '));
      }
      
      setImageUrl(data.image_url || '');

      toast('Recipe and AI Image successfully generated!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to auto-populate recipe details', 'error');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Dynamic ingredient modifiers
  const handleIngredientChange = (idx: number, field: string, val: string) => {
    const updated = [...ingredients];
    updated[idx][field] = val;
    setIngredients(updated);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '', unit: 'g' }]);
  };

  const removeIngredient = (idx: number) => {
    if (ingredients.length === 1) return;
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  // Dynamic steps modifiers
  const handleStepChange = (idx: number, val: string) => {
    const updated = [...steps];
    updated[idx] = val;
    setSteps(updated);
  };

  const addStep = () => {
    setSteps([...steps, '']);
  };

  const removeStep = (idx: number) => {
    if (steps.length === 1) return;
    setSteps(steps.filter((_, i) => i !== idx));
  };

  // AI Auto-Tagging Trigger
  const handleAiSuggestTags = async () => {
    if (!name.trim()) {
      toast('Please enter a recipe title first', 'error');
      return;
    }
    const filledIngredients = ingredients.filter(i => i.name.trim() !== '');
    if (filledIngredients.length === 0) {
      toast('Please add at least one ingredient first', 'error');
      return;
    }
    const filledSteps = steps.filter(s => s.trim() !== '');
    if (filledSteps.length === 0) {
      toast('Please add at least one cooking step first', 'error');
      return;
    }

    setIsAiLoading(true);
    try {
      const response = await apiFetch('/api/recipes/ai-tag', {
        method: 'POST',
        body: JSON.stringify({
          name,
          ingredients: filledIngredients,
          steps: filledSteps,
        })
      });

      // Populate AI suggestions into form states
      if (response.dietary_tag) setDietaryTag(response.dietary_tag);
      if (response.glycemic_index) setGlycemicIndex(response.glycemic_index);
      if (response.bmi_range) setBmiRange(response.bmi_range);
      if (response.gender_note) setGenderNote(response.gender_note);
      if (response.tags && Array.isArray(response.tags)) {
        setTagsText(response.tags.join(', '));
      }

      toast('🤖 AI Suggested tags loaded successfully!', 'success');
    } catch (err: any) {
      toast(err.message || 'AI suggest failed', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const filledIngredients = ingredients.filter(i => i.name.trim() !== '');
    const filledSteps = steps.filter(s => s.trim() !== '');

    if (!name.trim() || filledIngredients.length === 0 || filledSteps.length === 0) {
      toast('Please complete Name, Ingredients, and Steps sections', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedTags = tagsText
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);

      // Add meal type tag automatically based on choices
      const finalTags = [...parsedTags];
      
      const payload = {
        name,
        description,
        image_url: imageUrl.trim() || null,
        prep_time_mins: Number(prepTime),
        servings: Number(servings),
        ingredients: filledIngredients.map(i => ({
          name: i.name,
          quantity: i.quantity ? Number(i.quantity) : null,
          unit: i.unit,
        })),
        steps: filledSteps,
        nutrition: {
          calories: Number(calories),
          protein_g: Number(protein),
          carbs_g: Number(carbs),
          fat_g: Number(fat),
          fiber_g: 4, // default fallback
        },
        dietary_tag: dietaryTag,
        tags: finalTags,
        glycemic_index: glycemicIndex,
        sugar_g: Number(sugar),
        sodium_mg: Number(sodium),
        difficulty: 'medium', // standard fallback
        audience_type: 'adults', // standard fallback
        cost_to_make: 0,
        bmi_range: bmiRange,
        gender_note: genderNote,
      };

      await apiFetch('/api/recipes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast('Recipe posted successfully! Thank you!', 'success');
      router.push('/feed');
    } catch (err: any) {
      toast(err.message || 'Failed to submit recipe', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 pb-20">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-sm">
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* AI Recipe Autofill Section */}
          <div className="bg-orange-50/50 dark:bg-orange-950/10 border border-orange-200/50 dark:border-orange-900/30 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">✨</span>
              <div>
                <h4 className="text-xs font-black text-orange-800 dark:text-orange-400 uppercase tracking-wide">AI Recipe Autofill</h4>
                <p className="text-[10px] text-zinc-500">Enter a concept and let Gemini 2.5 Pro write the ingredients, steps, macros, and generate a matching AI food image!</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={aiConcept}
                onChange={(e) => setAiConcept(e.target.value)}
                placeholder="e.g., Vegan Sweet Potato Curry with Lentils"
                className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-850 dark:bg-zinc-850 text-xs bg-white"
              />
              <button
                type="button"
                onClick={handleAiGenerateRecipe}
                disabled={isAiGenerating}
                className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5"
              >
                {isAiGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>Generate ✨</>
                )}
              </button>
            </div>
          </div>

          {/* Core Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 border-b pb-2">1. General Information</h3>
            
            <div>
              <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Recipe Title</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Avocado Salmon Salad"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-850 dark:bg-zinc-850 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Short Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of your healthy meal..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-850 dark:bg-zinc-850 text-sm"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Time (mins)</label>
                <input
                  type="number"
                  required
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-850 dark:bg-zinc-850 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Servings</label>
                <input
                  type="number"
                  required
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-850 dark:bg-zinc-850 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-zinc-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Image Link (optional)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:border-zinc-850 dark:bg-zinc-850 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Ingredients list */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">2. Ingredients</h3>
              <button
                type="button"
                onClick={addIngredient}
                className="text-xs font-extrabold text-orange-600 hover:text-orange-700 cursor-pointer"
              >
                + Add Ingredient
              </button>
            </div>

            <div className="space-y-2">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    required
                    value={ing.name}
                    onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                    placeholder="e.g., Avocado"
                    className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-850 text-xs"
                  />
                  <input
                    type="number"
                    value={ing.quantity}
                    onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="w-16 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-850 text-xs"
                  />
                  <input
                    type="text"
                    value={ing.unit}
                    onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                    placeholder="Unit (e.g., g, tbsp)"
                    className="w-24 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-850 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(idx)}
                    disabled={ingredients.length === 1}
                    className="p-2 hover:bg-rose-50 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                  >
                    <Icons.Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Preparation steps */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">3. Cooking Steps</h3>
              <button
                type="button"
                onClick={addStep}
                className="text-xs font-extrabold text-orange-600 hover:text-orange-700 cursor-pointer"
              >
                + Add Step
              </button>
            </div>

            <div className="space-y-2.5">
              {steps.map((stepVal, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <span className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-2">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    required
                    value={stepVal}
                    onChange={(e) => handleStepChange(idx, e.target.value)}
                    placeholder={`e.g., Slice the avocado and toast the bread...`}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-850 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    disabled={steps.length === 1}
                    className="p-2.5 hover:bg-rose-50 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer mt-1"
                  >
                    <Icons.Trash size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Nutrition Snapshot */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 border-b pb-2">4. Nutrition Values</h3>
            
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-zinc-500 mb-1">Calories (kcal)</label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-850 text-xs text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-zinc-500 mb-1">Protein (g)</label>
                <input
                  type="number"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-850 text-xs text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-zinc-500 mb-1">Carbs (g)</label>
                <input
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-850 text-xs text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-zinc-500 mb-1">Fats (g)</label>
                <input
                  type="number"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-850 text-xs text-center"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-zinc-500 mb-1">Sugar (g)</label>
                <input
                  type="number"
                  value={sugar}
                  onChange={(e) => setSugar(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-850 text-xs text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-zinc-500 mb-1">Sodium (mg)</label>
                <input
                  type="number"
                  value={sodium}
                  onChange={(e) => setSodium(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-850 text-xs text-center"
                />
              </div>
            </div>
          </div>

          {/* AI Suggest Tags & Metadata */}
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50">5. Tags & Classification</h3>
              <button
                type="button"
                onClick={handleAiSuggestTags}
                disabled={isAiLoading}
                className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 text-xs font-black rounded-xl transition-all cursor-pointer flex justify-center items-center gap-1"
              >
                {isAiLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border border-orange-600 border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>🤖</span>
                    <span>AI Suggest Tags</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-zinc-500 mb-1 uppercase tracking-wider">Dietary tag</label>
                <select
                  value={dietaryTag}
                  onChange={(e) => setDietaryTag(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-850 text-xs focus:outline-none"
                >
                  <option value="omnivore">Omnivore (Non-Vegetarian)</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="keto">Keto</option>
                  <option value="gluten-free">Gluten-Free</option>
                  <option value="jain">Jain</option>
                  <option value="halal">Halal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-zinc-500 mb-1 uppercase tracking-wider">Glycemic index</label>
                <select
                  value={glycemicIndex}
                  onChange={(e) => setGlycemicIndex(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-850 text-xs focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-zinc-500 mb-1 uppercase tracking-wider">Recommended BMI Range</label>
                <select
                  value={bmiRange}
                  onChange={(e) => setBmiRange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-850 text-xs focus:outline-none"
                >
                  <option value="all">Suitable for All</option>
                  <option value="underweight">Underweight</option>
                  <option value="normal">Normal</option>
                  <option value="overweight">Overweight</option>
                  <option value="obese">Obese</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-extrabold text-zinc-500 mb-1 uppercase tracking-wider">Gender Demographics Note</label>
                <select
                  value={genderNote}
                  onChange={(e) => setGenderNote(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-850 dark:bg-zinc-850 text-xs focus:outline-none"
                >
                  <option value="general">Suitable for All</option>
                  <option value="pregnancy">Recommended for Women (Pregnancy/Cycle support)</option>
                  <option value="male">Recommended for Men</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-zinc-500 mb-1.5 uppercase tracking-wider">Additional tags (Separated by commas)</label>
              <input
                type="text"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="e.g., breakfast, high-protein, mango, summer"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none dark:border-zinc-850 dark:bg-zinc-850 text-xs"
              />
            </div>
          </div>

          {/* Form buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-3 border border-zinc-200 hover:bg-zinc-50 rounded-xl text-sm font-bold text-zinc-500 hover:text-zinc-800 transition-all dark:border-zinc-800 dark:hover:bg-zinc-800/50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-orange-600/10 disabled:opacity-50 transition-all flex justify-center items-center cursor-pointer"
            >
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Post Recipe'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
