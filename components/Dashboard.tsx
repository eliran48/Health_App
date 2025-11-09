import React, { useState } from 'react';
import FastingCalculator from './FastingCalculator';
import MetricsPanel from './MetricsPanel';
import WeightChart from './WeightChart';
import ProgressDashboard from './ProgressDashboard';
import Greeting from './Greeting';
import DailyLogPanel from './DailyLogPanel';
import WeeklySummary from './WeeklySummary';
import AiCoachChat from './AiCoachChat';
import RecipeManager from './RecipeManager';
import type { Metric } from '../types';

interface DashboardProps {
  uid: string;
  handleLogout: () => void;
}

export default function Dashboard({ uid, handleLogout }: DashboardProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-gray-800">מעקב בריאות</h1>
          <button onClick={handleLogout} className="text-sm font-semibold text-gray-700 hover:text-black transition-colors">
            התנתק
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        <Greeting />
        <ProgressDashboard metrics={metrics} />
        <WeeklySummary uid={uid} />
        <FastingCalculator />
        <DailyLogPanel uid={uid} />
        <MetricsPanel uid={uid} onMetricsUpdated={setMetrics} />
        <WeightChart metrics={metrics} />
        <RecipeManager uid={uid} />
        <div className="bg-white rounded-2xl shadow-lg p-4 text-sm text-gray-600">
          <p>💡 <strong>טיפ:</strong> כל הנתונים שלך מגובים ובטוחים בחשבונך. תוכל לגשת אליהם מכל מכשיר.</p>
        </div>
        <AiCoachChat uid={uid} />
      </main>
    </div>
  );
}