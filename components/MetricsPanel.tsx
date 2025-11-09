import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Metric } from '../types';
import { toLocalISODate, getWeekStartDate } from '../utils/date';
import { db } from '../services/firebase';
import { 
    collection, 
    query, 
    orderBy, 
    limit, 
    getDocs, 
    doc, 
    setDoc, 
    deleteDoc 
} from 'firebase/firestore';

// --- Icon Components ---
const IconWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden="true">{children}</div>
);

const WeightIcon = () => (
  <IconWrapper>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.036.218c-2.21 0-4.24-1.02-5.5-2.571m-6.38 8.026c-.483-.174-.711-.703-.59-1.202L9 4.97m-3 .52c-1.01.143-2.01.317-3 .52m3-.52l-2.62 10.726c-.122.499.106 1.028.589 1.202a5.988 5.988 0 002.036.218c2.21 0 4.24-1.02 5.5-2.571m0 0c1.26-1.551 3.29-2.571 5.5-2.571 1.01 0 2.01.115 3 .333m-9.333 0c1.472.583 3.047.884 4.667.884 1.619 0 3.194-.3 4.667-.884m-9.333 0l-4.667 4.667m4.667-4.667l4.667 4.667" />
    </svg>
  </IconWrapper>
);

const StepsIcon = () => (
  <IconWrapper>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 3.75l3 3m0 0l3-3m-3 3v11.25m0-11.25a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM12.75 20.25a.75.75 0 110-1.5.75.75 0 010 1.5zM12.75 16.5a.75.75 0 110-1.5.75.75 0 010 1.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 6.75l-3 3m0 0l-3-3m3 3v11.25" />
    </svg>
  </IconWrapper>
);


const WorkoutIcon = () => (
  <IconWrapper>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  </IconWrapper>
);

const SleepIcon = () => (
    <IconWrapper>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
        </svg>
    </IconWrapper>
);

const WaterIcon = () => (
    <IconWrapper>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.622a22.864 22.864 0 013-1.05 22.864 22.864 0 013 1.05 8.287 8.287 0 002.962-2.574z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.375a3.75 3.75 0 013.75 3.75v.375m-7.5 0v-.375A3.75 3.75 0 0112 6.375z" />
        </svg>
    </IconWrapper>
);

interface MetricsPanelProps {
  onMetricsUpdated: (metrics: Metric[]) => void;
  uid: string;
}

export default function MetricsPanel({ onMetricsUpdated, uid }: MetricsPanelProps) {
  const [selectedDate, setSelectedDate] = useState<string>(toLocalISODate());
  const [formState, setFormState] = useState({
    weight: '',
    waist: '',
    bodyFat: '',
    steps: '',
    workout: '',
    workoutType: '',
    workoutIntensity: '',
    sleepHours: '',
    waterIntake: '',
    notes: '',
  });
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekStartDate = useMemo(() => {
    if (!selectedDate) return '';
    const [year, month, day] = selectedDate.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const startOfWeek = getWeekStartDate(dateObj);
    return toLocalISODate(startOfWeek);
  }, [selectedDate]);

  const loadMetrics = useCallback(async () => {
    if (!uid) return;
    try {
      const metricsCol = collection(db, 'users', uid, 'metrics');
      const q = query(metricsCol, orderBy('date', 'desc'), limit(30));
      const snapshot = await getDocs(q);
      const loadedMetrics = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Metric));
      setMetrics(loadedMetrics);
      onMetricsUpdated(loadedMetrics);
    } catch (error) {
      console.error("Failed to load metrics from Firestore:", error);
      setError("שגיאה בטעינת הנתונים.");
    }
  }, [uid, onMetricsUpdated]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);
  
  const resetForm = useCallback(() => {
    setFormState({
        weight: '',
        waist: '',
        bodyFat: '',
        steps: '',
        workout: '',
        workoutType: '',
        workoutIntensity: '',
        sleepHours: '',
        waterIntake: '',
        notes: '',
    });
  }, []);

  useEffect(() => {
    const existingMetricForWeek = metrics.find(m => m.id === weekStartDate);
    if (existingMetricForWeek) {
        setFormState({
            weight: existingMetricForWeek.weight?.toString() ?? '',
            waist: existingMetricForWeek.waist?.toString() ?? '',
            bodyFat: existingMetricForWeek.bodyFat?.toString() ?? '',
            steps: existingMetricForWeek.steps?.toString() ?? '',
            workout: existingMetricForWeek.workout?.toString() ?? '',
            workoutType: existingMetricForWeek.workoutType ?? '',
            workoutIntensity: existingMetricForWeek.workoutIntensity ?? '',
            sleepHours: existingMetricForWeek.sleepHours?.toString() ?? '',
            waterIntake: existingMetricForWeek.waterIntake?.toString() ?? '',
            notes: existingMetricForWeek.notes ?? '',
        });
    } else {
        resetForm();
    }
  }, [weekStartDate, metrics, resetForm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  async function handleSave() {
    if (!uid) return;
    setError(null);
    setSaving(true);
    try {
      const payload: Omit<Metric, 'id'> = {
        date: weekStartDate,
        weight: formState.weight ? Number(formState.weight) : null,
        waist: formState.waist ? Number(formState.waist) : null,
        bodyFat: formState.bodyFat ? Number(formState.bodyFat) : null,
        steps: formState.steps ? Number(formState.steps) : null,
        workout: formState.workout ? Number(formState.workout) : null,
        workoutType: (formState.workoutType as Metric['workoutType']) || null,
        workoutIntensity: (formState.workoutIntensity as Metric['workoutIntensity']) || null,
        sleepHours: formState.sleepHours ? Number(formState.sleepHours) : null,
        waterIntake: formState.waterIntake ? Number(formState.waterIntake) : null,
        notes: formState.notes || '',
      };
      
      const metricDoc = doc(db, 'users', uid, 'metrics', weekStartDate);
      await setDoc(metricDoc, payload, { merge: true });
      loadMetrics();
    } catch (e: any) {
      setError(e?.message || 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!uid) return;
    if (window.confirm('האם למחוק את הרשומה?')) {
      try {
        const docToDelete = doc(db, 'users', uid, 'metrics', id);
        await deleteDoc(docToDelete);
        loadMetrics();
      } catch (error) {
        console.error("Error deleting metric: ", error);
        setError("שגיאה במחיקת הרשומה.");
      }
    }
  }

  const workoutTypeMap = {
    strength: 'כוח',
    cardio: 'אירובי',
    hiit: 'HIIT',
    flexibility: 'גמישות/יוגה',
    sports: 'ספורט',
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">עדכון מדדים שבועי</h2>
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">בחירת תאריך בשבוע הרצוי</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full border-gray-300 rounded-xl px-3 py-2"/>
          {weekStartDate && (
            <p className="text-xs text-gray-500 mt-1">
                הנתונים יישמרו עבור השבוע המתחיל ביום ראשון, {weekStartDate}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 border-t pt-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">מדדי גוף</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="number" name="weight" placeholder='משקל (ק"ג)' step="0.1" value={formState.weight} onChange={handleInputChange} className="w-full border-gray-300 rounded-xl px-3 py-2"/>
          <input type="number" name="waist" placeholder='היקף בטן (ס"מ)' step="0.1" value={formState.waist} onChange={handleInputChange} className="w-full border-gray-300 rounded-xl px-3 py-2"/>
          <input type="number" name="bodyFat" placeholder='אחוז שומן (%)' step="0.1" value={formState.bodyFat} onChange={handleInputChange} className="w-full border-gray-300 rounded-xl px-3 py-2"/>
        </div>
      </div>
      <div className="mt-4 border-t pt-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">פעילות גופנית</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          <input type="number" name="steps" placeholder="צעדים" value={formState.steps} onChange={handleInputChange} className="w-full border-gray-300 rounded-xl px-3 py-2"/>
          <select name="workoutType" value={formState.workoutType} onChange={handleInputChange} className="w-full border-gray-300 rounded-xl px-3 py-2">
            <option value="">בחר סוג אימון</option>
            <option value="strength">כוח</option>
            <option value="cardio">אירובי</option>
            <option value="hiit">HIIT</option>
            <option value="flexibility">גמישות/יוגה</option>
            <option value="sports">ספורט</option>
          </select>
          <select name="workoutIntensity" value={formState.workoutIntensity} onChange={handleInputChange} className="w-full border-gray-300 rounded-xl px-3 py-2">
            <option value="">בחר רמת מאמץ</option>
            <option value="low">נמוכה</option>
            <option value="medium">בינונית</option>
            <option value="high">גבוהה</option>
          </select>
          <input type="number" name="workout" placeholder="משך (דקות)" value={formState.workout} onChange={handleInputChange} className="w-full border-gray-300 rounded-xl px-3 py-2"/>
        </div>
      </div>
      <div className="mt-4 border-t pt-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">מדדי איכות חיים</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="number" name="sleepHours" placeholder='שעות שינה' step="0.5" value={formState.sleepHours} onChange={handleInputChange} className="w-full border-gray-300 rounded-xl px-3 py-2"/>
          <input type="number" name="waterIntake" placeholder='צריכת מים (ליטר)' step="0.1" value={formState.waterIntake} onChange={handleInputChange} className="w-full border-gray-300 rounded-xl px-3 py-2"/>
        </div>
      </div>
      <div className="mt-4">
        <textarea name="notes" value={formState.notes} onChange={handleInputChange} className="w-full border-gray-300 rounded-xl px-3 py-2" rows={2} placeholder="הערות..." />
      </div>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      <div className="mt-4 flex gap-2">
        <button onClick={handleSave} disabled={saving} className="bg-black text-white px-6 py-2 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:bg-gray-400">{saving ? 'שומר…' : 'שמירה'}</button>
        <button onClick={() => {
            resetForm();
            setSelectedDate(toLocalISODate());
        }} className="border border-gray-300 px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors">איפוס</button>
      </div>

      <h3 className="text-lg font-bold mt-8 mb-3 text-gray-800">היסטוריית מדדים (30 שבועות אחרונים)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-right whitespace-nowrap">
          <thead className="text-gray-500">
            <tr className="border-b">
              <th className="py-2 px-2 font-semibold">תאריך</th>
              <th className="py-2 px-2 font-semibold">משקל</th>
              <th className="py-2 px-2 font-semibold">צעדים</th>
              <th className="py-2 px-2 font-semibold">שינה</th>
              <th className="py-2 px-2 font-semibold">אימון</th>
              <th className="py-2 px-2 font-semibold text-left"></th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((row) => (
              <tr key={row.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-2 align-middle">{row.date}</td>
                <td className="py-3 px-2 align-middle">
                    <div className="flex items-center gap-2">
                        <WeightIcon />
                        <span>{row.weight ?? '—'}</span>
                    </div>
                </td>
                <td className="py-3 px-2 align-middle">
                    <div className="flex items-center gap-2">
                        <StepsIcon />
                        <span>{row.steps ?? '—'}</span>
                    </div>
                </td>
                 <td className="py-3 px-2 align-middle">
                    <div className="flex items-center gap-2">
                        <SleepIcon />
                        <span>{row.sleepHours ?? '—'}</span>
                    </div>
                </td>
                <td className="py-3 px-2 align-middle">
                    <div className="flex items-center gap-2">
                        <WorkoutIcon />
                        {row.workout ? (
                           <span>{row.workout} דק' - {workoutTypeMap[row.workoutType as keyof typeof workoutTypeMap] || 'כללי'}</span>
                        ) : '—'}
                    </div>
                </td>
                <td className="py-3 px-2 text-left align-middle">
                  <button onClick={() => handleDelete(row.id)} className="text-red-500 hover:text-red-700 text-xs">מחק</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {metrics.length === 0 && <p className="text-center text-gray-500 py-4">אין עדיין נתונים.</p>}
      </div>
    </div>
  );
}
