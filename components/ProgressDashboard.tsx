import React, { useMemo } from 'react';
import type { Metric } from '../types';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { toLocalISODate, getWeekStartDate } from '../utils/date';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ProgressDashboardProps {
  metrics: Metric[];
}

const StatCard: React.FC<{ title: string; value: string | number; unit?: string }> = ({ title, value, unit }) => (
  <div className="bg-gray-50 rounded-xl p-4 text-center flex flex-col justify-center">
    <p className="text-sm text-gray-500 font-medium">{title}</p>
    <p className="text-3xl font-bold text-gray-800">
      {value}
      {unit && <span className="text-lg ml-1">{unit}</span>}
    </p>
  </div>
);

export default function ProgressDashboard({ metrics }: ProgressDashboardProps) {
  const stats = useMemo(() => {
    const sortedMetrics = [...metrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const metricsWithWeight = sortedMetrics.filter(m => m.weight != null);
    const metricsWithWorkout = sortedMetrics.filter(m => m.workout != null && m.workout > 0);
    const metricsWithSteps = sortedMetrics.filter(m => m.steps != null && m.steps > 0);

    let totalWeightLoss = 0;
    if (metricsWithWeight.length >= 2) {
      const firstWeight = metricsWithWeight[0].weight!;
      const lastWeight = metricsWithWeight[metricsWithWeight.length - 1].weight!;
      totalWeightLoss = firstWeight - lastWeight;
    }
    
    const totalWorkouts = metricsWithWorkout.length;
    
    const totalWorkoutMinutes = metricsWithWorkout.reduce((sum, m) => sum + (m.workout || 0), 0);
    const avgWorkoutTime = totalWorkouts > 0 ? Math.round(totalWorkoutMinutes / totalWorkouts) : 0;
    
    const totalSteps = metricsWithSteps.reduce((sum, m) => sum + (m.steps || 0), 0);
    const avgWeeklySteps = metricsWithSteps.length > 0 ? Math.round(totalSteps / metricsWithSteps.length) : 0;
    
    const workoutBreakdown = metricsWithWorkout.reduce((acc, m) => {
        const type = m.workoutType || 'general';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Streak calculation
    let currentStreak = 0;
    if (sortedMetrics.length > 0) {
      const dates = sortedMetrics.map(m => new Date(m.date)).sort((a,b) => b.getTime() - a.getTime());
      
      const today = new Date();
      const thisWeekStart = getWeekStartDate(today);
      const lastWeekStart = getWeekStartDate(new Date(new Date().setDate(today.getDate() - 7)));
      
      // Check if the most recent entry is for this week or last week to be considered active
      if (toLocalISODate(dates[0]) === toLocalISODate(thisWeekStart) || toLocalISODate(dates[0]) === toLocalISODate(lastWeekStart)) {
          currentStreak = 1;
          for (let i = 0; i < dates.length - 1; i++) {
              const current = dates[i];
              const next = dates[i+1];
              const diffTime = current.getTime() - next.getTime();
              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays === 7) {
                  currentStreak++;
              } else {
                  break;
              }
          }
      }
    }


    return {
      totalWeightLoss: totalWeightLoss.toFixed(1),
      totalWorkouts,
      avgWorkoutTime,
      avgWeeklySteps: avgWeeklySteps.toLocaleString(),
      currentStreak,
      workoutBreakdown
    };
  }, [metrics]);

  const workoutTypeMap: Record<string, string> = {
    strength: 'כוח',
    cardio: 'אירובי',
    hiit: 'HIIT',
    flexibility: 'גמישות/יוגה',
    sports: 'ספורט',
    general: 'כללי',
  };

  const pieData = {
      labels: Object.keys(stats.workoutBreakdown).map(key => workoutTypeMap[key] || key),
      datasets: [
        {
          data: Object.values(stats.workoutBreakdown),
          backgroundColor: [
            '#1f2937', // gray-800
            '#6b7280', // gray-500
            '#d1d5db', // gray-300
            '#9ca3af', // gray-400
            '#4b5563', // gray-600
          ],
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">סיכום התקדמות</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="ירידה כוללת במשקל" value={stats.totalWeightLoss} unit='ק"ג' />
        <StatCard title="רצף עדכונים" value={stats.currentStreak} unit='שבועות' />
        <StatCard title="ממוצע צעדים שבועי" value={stats.avgWeeklySteps} />
        <StatCard title="זמן אימון ממוצע" value={stats.avgWorkoutTime} unit='דקות' />
      </div>
       {stats.totalWorkouts > 0 && (
         <div className="mt-6">
            <h3 className="text-lg font-semibold text-center text-gray-700 mb-3">התפלגות אימונים</h3>
            <div className="max-w-xs mx-auto">
                 <Pie data={pieData} options={{
                     plugins: {
                         legend: {
                             position: 'bottom',
                             labels: {
                               font: { family: "'Assistant', sans-serif"}
                             }
                         }
                     }
                 }} />
            </div>
         </div>
       )}
    </div>
  );
}