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
