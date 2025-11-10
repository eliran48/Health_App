import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { toLocalISODate } from '../utils/date';
import type { Metric, DailyLog } from '../types';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface WeeklySummaryProps {
    uid: string;
}

export default function WeeklySummary({ uid }: WeeklySummaryProps) {
    const [summary, setSummary] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const generateSummary = useCallback(async () => {
        if (!uid) {
            setError("יש להתחבר כדי ליצור סיכום.");
            return;
        }
        setLoading(true);
        setError('');
        setSummary('');

        try {
            // 1. Check for API Key
            if (!process.env.API_KEY) {
                throw new Error("מפתח ה-API של Gemini אינו מוגדר. יש להגדיר את המשתנה API_KEY בהגדרות הפרויקט בפלטפורמת האירוח שלך (לדוגמה, Vercel).");
            }

            // 2. Fetch data from the last 7 days from Firestore
            const today = new Date();
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 7);
            const sevenDaysAgoISO = toLocalISODate(sevenDaysAgo);

            const metricsCol = collection(db, 'users', uid, 'metrics');
            const metricsQuery = query(metricsCol, where('date', '>=', sevenDaysAgoISO));
            const metricsSnapshot = await getDocs(metricsQuery);
            const weekMetrics = metricsSnapshot.docs.map(doc => doc.data());

            const logsCol = collection(db, 'users', uid, 'dailyLogs');
            const logsQuery = query(logsCol, where('date', '>=', sevenDaysAgoISO));
            const logsSnapshot = await getDocs(logsQuery);
            const weekLogs = logsSnapshot.docs.map(doc => doc.data());
            
            if (weekMetrics.length === 0 && weekLogs.length === 0) {
                setError("לא נמצאו נתונים מהשבוע האחרון כדי ליצור סיכום.");
                setLoading(false);
                return;
            }

            // 3. Initialize the Gemini API
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            // 4. Create the prompt
            const prompt = `
                אתה מאמן בריאות אישי, תומך ומעודד. המשימה שלך היא לנתח את הנתונים הבריאותיים של המשתמש מהשבוע האחרון ולספק לו סיכום קצר, תובנות והמלצות. כתוב את התשובה בעברית.

                הנתונים מחולקים לשני סוגים: מדדים שבועיים ורישומים יומיים.
                
                הנה נתוני המדדים השבועיים (שנמדדו פעם בשבוע):
                ${JSON.stringify(weekMetrics, null, 2)}

                והנה נתוני הרישומים היומיים מהשבוע האחרון:
                ${JSON.stringify(weekLogs, null, 2)}

                בהתבסס על הנתונים האלה, אנא ספק:
                1.  **סיכום כללי קצר:** התייחס למגמת המשקל (אם קיימת), ולמדדים בולטים אחרים כמו צעדים או אימונים.
                2.  **תובנה אחת או שתיים:** מצא קשר מעניין בין הנתונים. למשל, האם יש קשר בין הרגשה פיזית טובה לכמות צעדים גבוהה? האם הצלחה בצום קשורה לשעת שינה?
                3.  **המלצה אחת קטנה ומעשית לשבוע הבא:** הצעה קונקרטית לשיפור, המבוססת על הנתונים.
                4.  **סיום מעודד:** סיים במשפט חיובי ומחזק.

                הקפד על טון חיובי ומקצועי. השתמש בפורמט Markdown בסיסי (כותרות עם ##, הדגשות עם **, ורשימות) כדי שהתצוגה תהיה ברורה.
            `;

            // 5. Call the Gemini API
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setSummary(response.text);

        } catch (err: any) {
            console.error("Error generating summary:", err);
            const detailedError = `אירעה שגיאה ביצירת הסיכום. הסיבה: ${err.message || 'שגיאה לא ידועה'}`;
            setError(detailedError);
        } finally {
            setLoading(false);
        }

    }, [uid]);

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">סיכום שבועי חכם</h2>
                    <p className="text-sm text-gray-600">קבל ניתוח ותובנות על ההתקדמות שלך בעזרת AI.</p>
                </div>
                <button
                    onClick={generateSummary}
                    disabled={loading}
                    className="mt-3 md:mt-0 bg-black text-white px-5 py-2 rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:bg-gray-400 w-full md:w-auto"
                >
                    {loading ? 'יוצר סיכום...' : 'צור סיכום שבועי'}
                </button>
            </div>

            {error && <div className="mt-4 bg-red-100 border border-red-300 text-red-800 p-3 rounded-lg text-sm">{error}</div>}
            
            {summary && (
                <div className="mt-4 border-t pt-4 space-y-2">
                    <div 
                        className="prose prose-sm max-w-none" 
                        style={{ whiteSpace: 'pre-wrap' }}
                        dangerouslySetInnerHTML={{ __html: summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/## (.*)/g, '<h3 class="text-md font-bold mt-2">$1</h3>') }}
                    />
                </div>
            )}
        </div>
    );
}