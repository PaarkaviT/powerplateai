export function calculateCalorieTarget(
  age: number,
  gender: 'male' | 'female' | 'other',
  height_cm: number,
  weight_kg: number,
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active'
): number {
  // BMR calculation using Mifflin-St Jeor formula
  let bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  
  if (gender === 'male') {
    bmr += 5;
  } else if (gender === 'female') {
    bmr -= 161;
  } else {
    // For 'other' or unspecified gender, take the average modifier
    bmr -= 78; 
  }

  // Activity level multipliers (Harris-Benedict factors)
  let multiplier = 1.2; // default sedentary
  if (activity_level === 'lightly_active') {
    multiplier = 1.375;
  } else if (activity_level === 'moderately_active') {
    multiplier = 1.55;
  } else if (activity_level === 'very_active') {
    multiplier = 1.725;
  } else if (activity_level === 'extra_active') {
    multiplier = 1.9;
  }

  return Math.round(bmr * multiplier);
}

export function calculateBMI(height_cm: number, weight_kg: number): number {
  if (!height_cm || !weight_kg || height_cm <= 0) {
    return 0;
  }
  const height_m = height_cm / 100;
  const bmiVal = weight_kg / (height_m * height_m);
  return Math.round(bmiVal * 10) / 10; // Round to 1 decimal place
}

