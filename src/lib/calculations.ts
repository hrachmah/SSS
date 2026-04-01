import { Gender, UserProfile, MacroType } from "../types";

export function calculateBMR(weight: number, height: number, age: number, gender: Gender): number {
  if (gender === 'M') {
    return (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    return (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }
}

export function calculateTDEE(bmr: number, multiplier: number): number {
  return bmr * multiplier;
}

export function calculateTargetCalories(tdee: number, bmr: number, gender: Gender): number {
  const target = tdee - 500;
  const min = gender === 'M' ? 1500 : 1200;
  // User says: "tidak kurang dari BMR"
  return Math.max(target, bmr, min);
}

export function calculateMacros(calories: number, type: MacroType) {
  let p = 0.25, f = 0.3, c = 0.45; // Moderate/Balanced (FatSecret standard is ~55% C, but for diet 45% is better)

  if (type === 'Lower') {
    // Low Carb / Keto-ish or High Protein
    p = 0.4; f = 0.4; c = 0.2;
  } else if (type === 'Higher') {
    // High Carb / Standard
    p = 0.2; f = 0.25; c = 0.55;
  }

  return {
    protein: Math.round((calories * p) / 4),
    fat: Math.round((calories * f) / 9),
    carbs: Math.round((calories * c) / 4)
  };
}

export function getPhase(weekNumber: number): 'Strict' | 'Santuy' {
  // Weeks 1-2: Strict
  // Weeks 3-4: Santuy
  // Rotation every 2 weeks
  const cycle = Math.ceil(weekNumber / 2);
  return cycle % 2 === 1 ? 'Strict' : 'Santuy';
}

export function getWeekNumber(startDate: Date, currentDate: Date): number {
  const diffTime = Math.abs(currentDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.ceil((diffDays || 1) / 7);
}

export function getDayOfProgram(startDate: Date, currentDate: Date): number {
  const diffTime = currentDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}
