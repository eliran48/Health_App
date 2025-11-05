
import React, { useState, useEffect, useCallback } from 'react';
// Fix: Use Firebase v8 compat imports to fix module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { db } from '../services/firebase';
import type { DailyLog } from '../types';
import { toLocalISODate } from '../utils/date';

const feelingOptions: { value: 'great' | 'good' | 'okay' | 'bad'; label: string }[] = [
  { value: 'great', label: 'מעולה' },
  { value: 'good', label: 'טוב' },
  { value: 'okay', label: 'בסדר' },
  { value: 'bad', label: 'לא משהו' },
];

const feelingMap = {
    great: 'מעולה',
    good: 'טוב',
    okay: 'בסדר',
    bad: 'לא משהו',
};

interface DailyLogPanelProps {
  uid: string;
}

export default function DailyLogPanel({ uid }: DailyLogPanelProps) {
    const [selectedDate, setSelectedDate] = useState<string>(toLocalISODate());
    const [formState, setFormState] = useState({
        physicalFeeling: null as 'great' | 'good' | 'okay' | 'bad' | null,
        lastMealTime: '',
        fastingSuccess: null as boolean | null,
        bedtime: '',
        steps: '' as string | number,
        proteinIntake: '' as string | number,
    });
    const [recentLogs, setRecentLogs] = useState<DailyLog[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadRecentLogs = useCallback(async () => {
        // Fix: Use Firebase v8 firestore syntax.
        const logsRef = db.collection('users').doc(uid).collection('dailyLogs');
        const q = logsRef.orderBy('date', 'desc').limit(7);
        const snap = await q.get();
        const newLogs: DailyLog[] = [];
        snap.forEach((d) => newLogs.push({ id: d.id, ...d.data() } as DailyLog));
        setRecentLogs(newLogs);
    }, [uid]);

    useEffect(() => {
        loadRecentLogs();
    }, [loadRecentLogs]);

    const resetForm = useCallback(() => {
        setFormState({
            physicalFeeling: null,
            lastMealTime: '',
            fastingSuccess: null,
            bedtime: '',
            steps: '',
            proteinIntake: '',
        });
    }, []);

    useEffect(() => {
        const loadLogForDate = async () => {
            if (!selectedDate) return;
            // Fix: Use Firebase v8 firestore syntax.
            const logRef = db.collection('users').doc(uid).collection('dailyLogs').doc(selectedDate);
            const docSnap = await logRef.get();
            if (docSnap.exists) {
                const data = docSnap.data() as DailyLog;
                setFormState({
                    physicalFeeling: data.physicalFeeling ?? null,
                    lastMealTime: data.lastMealTime ?? '',
                    fastingSuccess: data.fastingSuccess ?? null,
                    bedtime: data.bedtime ?? '',
                    steps: data.steps ?? '',
                    proteinIntake: data.proteinIntake ?? '',
                });
            } else {
                resetForm();
            }
        };
        loadLogForDate();
    }, [selectedDate, uid, resetForm]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'fastingSuccess') {
            setFormState(prev => ({ ...prev, fastingSuccess: value === 'true' }));
        } else {
            setFormState(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleFeelingClick = (feeling: 'great' | 'good' | 'okay' | 'bad') => {
        setFormState(prev => ({...prev, physicalFeeling: feeling}));
    };

    const handleSave = async () => {
        setError(null);
        setSaving(true);
        try {
            const payload = {
                date: selectedDate,
                physicalFeeling: formState.physicalFeeling,
                lastMealTime: formState.lastMealTime || null,
                fastingSuccess: formState.fastingSuccess,
                bedtime: formState.bedtime || null,
                steps: formState.steps !== '' ? Number(formState.steps) : null,
                proteinIntake: formState.proteinIntake !== '' ? Number(formState.proteinIntake) : null,
                // Fix: Use Firebase v8 serverTimestamp.
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            };

            // Fix: Use Firebase v8 firestore syntax.
            await db.collection('users').doc(uid).collection('dailyLogs').doc(selectedDate).set(payload, { merge: true });
            await loadRecentLogs();
        } catch (e: any) {
            setError(e?.message || 'שגיאה בשמירה');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('האם למחוק את הרשומה היומית?')) {
            // Fix: Use Firebase v8 firestore syntax.
            await db.collection('users').doc(uid).collection('dailyLogs').doc(id).delete();
            await loadRecentLogs();
            if (selectedDate === id) {
                resetForm();
            }
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">סיכום יומי</h2>
            
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">תאריך</label>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"/>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">איך הרגשת מבחינה פיזית היום?</label>
                    <div className="flex flex-wrap gap-2">
                        {feelingOptions.map(opt => (
                            <button 
                                key={opt.value} 
                                onClick={() => handleFeelingClick(opt.value)}
                                type="button"
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${formState.physicalFeeling === opt.value ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">האם הצלחת לשמור על צום 16/8?</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="fastingSuccess" value="true" checked={formState.fastingSuccess === true} onChange={handleInputChange} className="focus:ring-black h-4 w-4 text-black border-gray-300" />
                            <span>כן</span>
                        </label>
                         <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="fastingSuccess" value="false" checked={formState.fastingSuccess === false} onChange={handleInputChange} className="focus:ring-black h-4 w-4 text-black border-gray-300" />
                            <span>לא</span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="lastMealTime" className="block text-sm font-medium text-gray-700 mb-1">שעת ארוחה אחרונה</label>
                        <input type="time" id="lastMealTime" name="lastMealTime" value={formState.lastMealTime || ''} onChange={handleInputChange} className="w-full border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"/>
                    </div>
                     <div>
                        <label htmlFor="bedtime" className="block text-sm font-medium text-gray-700 mb-1">שעת שינה</label>
                        <input type="time" id="bedtime" name="bedtime" value={formState.bedtime || ''} onChange={handleInputChange} className="w-full border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"/>
                    </div>
                    <div>
                        <label htmlFor="steps" className="block text-sm font-medium text-gray-700 mb-1">כמות צעדים</label>
                        <input type="number" id="steps" name="steps" value={formState.steps} onChange={handleInputChange} className="w-full border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black" placeholder="לדוגמה: 10000" />
                    </div>
                     <div>
                        <label htmlFor="proteinIntake" className="block text-sm font-medium text-gray-700 mb-1">כמות חלבון יומית (גרם)</label>
                        <input type="number" id="proteinIntake" name="proteinIntake" value={formState.proteinIntake} onChange={handleInputChange} className="w-full border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black" placeholder="לדוגמה: 120" />
                    </div>
                </div>
            </div>

            {error && <div className="text-red-600 text-sm mt-4">{error}</div>}
            <div className="mt-6 flex gap-2">
                <button onClick={handleSave} disabled={saving} className="bg-black text-white px-6 py-2 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:bg-gray-400">{saving ? 'שומר…' : 'שמירה'}</button>
                <button onClick={() => {
                    setSelectedDate(toLocalISODate());
                    resetForm();
                }} className="border border-gray-300 px-4 py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors">איפוס</button>
            </div>

            <h3 className="text-lg font-bold mt-8 mb-3 text-gray-800">היסטוריית רישומים (7 ימים אחרונים)</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-right whitespace-nowrap">
                    <thead className="text-gray-500">
                        <tr className="border-b">
                            <th className="py-2 px-2 font-semibold">תאריך</th>
                            <th className="py-2 px-2 font-semibold">הרגשה</th>
                            <th className="py-2 px-2 font-semibold">צום 16/8</th>
                            <th className="py-2 px-2 font-semibold">צעדים</th>
                             <th className="py-2 px-2 font-semibold">חלבון (ג')</th>
                            <th className="py-2 px-2 font-semibold text-left"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentLogs.map((log) => (
                            <tr key={log.id} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-2">{log.date}</td>
                                <td className="py-3 px-2">{log.physicalFeeling ? feelingMap[log.physicalFeeling] : '—'}</td>
                                <td className="py-3 px-2">{log.fastingSuccess === true ? '✅' : log.fastingSuccess === false ? '❌' : '—'}</td>
                                <td className="py-3 px-2">{log.steps ?? '—'}</td>
                                <td className="py-3 px-2">{log.proteinIntake ?? '—'}</td>
                                <td className="py-3 px-2 text-left">
                                    <button onClick={() => handleDelete(log.id)} className="text-red-500 hover:text-red-700 text-xs">מחק</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {recentLogs.length === 0 && <p className="text-center text-gray-500 py-4">אין עדיין רישומים.</p>}
            </div>
        </div>
    );
}