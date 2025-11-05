import React, { useState } from 'react';
import { signOut, User } from 'firebase/auth';
import { auth } from '../services/firebase';
import FastingCalculator from './FastingCalculator';
import MetricsPanel from './MetricsPanel';
import WeightChart from './WeightChart';
import ProgressDashboard from './ProgressDashboard'; // Import the new component
import type { Metric } from '../types';

interface DashboardProps {
  user: User;
}

export default function Dashboard({ user }: DashboardProps) {
  const [metrics, setMetrics] = useState<Metric[]>([]);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-gray-800">מעקב בריאות</h1>
          <button
            onClick={() => signOut(auth)}
            className="bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-black transition-colors"
          >
            התנתקות
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-6">
        <ProgressDashboard metrics={metrics} />
        <FastingCalculator />
        <MetricsPanel uid={user.uid} onMetricsUpdated={setMetrics} />
        <WeightChart metrics={metrics} />
        <div className="bg-white rounded-2xl shadow-lg p-4 text-sm text-gray-600">
          <p>💡 <strong>טיפ:</strong> ניתן להרחיב את המעקב ולהוסיף מדדים נוספים (כמו לחץ דם, שעות שינה, אחוזי מים וכו') על ידי הוספת שדות חדשים בטופס ושמירתם למסמך היומי במסד הנתונים.</p>
        </div>
      </main>
    </div>
  );
}
