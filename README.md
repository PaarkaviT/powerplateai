# Power Plate 🥗💪

Power Plate is a premium, AI-driven web application designed to help users calculate nutrition requirements, track meals, plan weekly schedules, manage family profiles, and receive smart nutrition coaching.

## Features

- **Onboarding & Personalization:** Compute daily calorie targets using Harris-Benedict formulas and track BMI, cuisine preferences, and health conditions.
- **Weekly Meal Planner:** Drag-and-drop planning tool to organize breakfast, lunch, dinner, and snacks, verified against your daily nutrient limits.
- **Nutrition Tracker:** Log actual consumed food and compare totals against sugar (warning above 35g) and sodium (warning above 1500mg) limits.
- **AI Smart Nutrition Coach:** Get custom recommendations on portion sizes, healthy swaps, and side dish pairings relative to your TDEE.
- **Family Accounts:** Switch target profiles dynamically (e.g. eating parameters optimized for Dad who has hypertension or Mom with diabetes) and see immediate Body-Match % recalculations.
- **Monetization Tier (Freemium):** Easily mock upgrade or downgrade your account tier via the **Premium 👑** manager tab to test tier lock gates.

## Technologies Used

- **Framework:** Next.js (App Router, Turbopack)
- **Styling:** Tailwind CSS & Vanilla CSS
- **Database:** Supabase (PostgreSQL with RLS policy locks)
- **AI Engine:** OpenAI API suggestions integration

## Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Database Schema:**
   Run the schema definitions in `supabase_schema.sql` inside your Supabase SQL Editor.

3. **Set Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   OPENAI_API_KEY=your-openai-key
   ```

4. **Launch Dev Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) or [http://localhost:3001](http://localhost:3001) in your browser.
