export interface Metric {
  id: string; // The date string YYYY-MM-DD
  date: string;
  weight: number | null;
  waist: number | null;
  bodyFat: number | null;
  steps: number | null;
  workout: number | null; // minutes
  notes: string;
  workoutType: 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'sports' | null;
  workoutIntensity: 'low' | 'medium' | 'high' | null;
  sleepHours: number | null;
  waterIntake: number | null;
}

export interface DailyLog {
  id: string; // The date string YYYY-MM-DD
  date: string;
  physicalFeeling: 'great' | 'good' | 'okay' | 'bad' | null;
  lastMealTime: string | null;
  fastingSuccess: boolean | null;
  bedtime: string | null;
  steps: number | null;
  proteinIntake: number | null;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: string;
  instructions: string;
  createdAt: string; // ISO date string
}