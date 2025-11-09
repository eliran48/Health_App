import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { toLocalISODate } from '../utils/date';
import type { Metric, DailyLog } from '../types';
import { db } from '../services/firebase';
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    getDoc, 
    orderBy, 
    limit 
} from 'firebase/firestore';

interface AiCoachChatProps {
    uid: string;
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

// Icon for the send button
const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
);

// Icon for the analyze button
const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.5 21.75l-.398-1.178a3.375 3.375 0 00-2.455-2.456L12.5 18l1.178-.398a3.375 3.375 0 002.455-2.456L16.5 14.25l.398 1.178a3.375 3.375 0 002.456 2.456L20.25 18l-1.178.398a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
);

const fetchDataForContext = async (uid: string): Promise<string> => {
    if (!uid) return "לא מחובר משתמש.";
    
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAgoISO = toLocalISODate(thirtyDaysAgo);

    try {
        const metricsCol = collection(db, 'users', uid, 'metrics');
        const metricsQuery = query(metricsCol, where('date', '>=', thirtyDaysAgoISO));
        const metricsSnapshot = await getDocs(metricsQuery);
        const userMetrics = metricsSnapshot.docs.map(doc => doc.data());

        const logsCol = collection(db, 'users', uid, 'dailyLogs');
        const logsQuery = query(logsCol, where('date', '>=', thirtyDaysAgoISO));
        const logsSnapshot = await getDocs(logsQuery);
        const userLogs = logsSnapshot.docs.map(doc => doc.data());
        
        if (userMetrics.length === 0 && userLogs.length === 0) {
            return "המשתמש עדיין לא הזין נתונים.";
        }
        
        const context = `
            הנה נתוני המדדים השבועיים של המשתמש מהחודש האחרון:
            ${JSON.stringify(userMetrics, null, 2)}

            והנה נתוני הרישומים היומיים של המשתמש מהחודש האחרון:
            ${JSON.stringify(userLogs, null, 2)}
        `;
        return context;
    } catch (error) {
        console.error("Error fetching data for AI context:", error);
        return "שגיאה בטעינת הנתונים.";
    }
};


export default function AiCoachChat({ uid }: AiCoachChatProps) {
    const [chat, setChat] = useState<Chat | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Initialize the chat session
    useEffect(() => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const chatSession = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: `אתה מאמן בריאות אישי, מומחה, תומך ומעודד בשם "ג'מיני פיט". המשימה שלך היא לעזור למשתמשים להבין את הנתונים הבריאותיים שלהם, לענות על שאלותיהם ולספק להם המלצות מותאמות אישית. 
                    תמיד תענה בעברית. תשובותיך צריכות להיות קצרות, מעשיות, ומבוססות על הנתונים שיסופקו לך. 
                    שמור על טון חיובי ומקצועי. כאשר אתה מנתח נתונים, ציין מגמות חיוביות ועודד את המשתמש. 
                    בכל פעם שהמשתמש שואל שאלה, יסופקו לך הנתונים העדכניים שלו. השתמש בנתונים אלו כדי לתת את התשובה הרלוונטית ביותר.`,
                },
            });
            setChat(chatSession);
        } catch (e: any) {
            console.error("Failed to initialize AI Chat:", e);
            const detailedError = `לא ניתן היה לאתחל את הצ'אט עם המאמן. הסיבה: ${e.message || 'שגיאה לא ידועה'}`;
            setError(detailedError);
        }
    }, []);
    
    // Scroll to bottom of chat on new message
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (messageText: string) => {
        if (!chat || !messageText.trim() || !uid) return;

        setLoading(true);
        setError('');
        const userMessage: ChatMessage = { role: 'user', text: messageText };
        setMessages(prev => [...prev, userMessage]);
        setInput('');

        try {
            const dataContext = await fetchDataForContext(uid);
            const promptWithContext = `
                ---
                הקשר: נתוני בריאות של המשתמש
                ${dataContext}
                ---
                השאלה של המשתמש:
                ${messageText}
            `;
            
            const response = await chat.sendMessage({ message: promptWithContext });
            
            const modelMessage: ChatMessage = { role: 'model', text: response.text };
            setMessages(prev => [...prev, modelMessage]);

        } catch (err: any) {
            console.error("Error sending message:", err);
            const detailedError = `אופס, משהו השתבש. הסיבה: ${err.message || 'שגיאה לא ידועה'}`;
            setError(detailedError);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyzeToday = async () => {
        if (!chat || !uid) return;

        setLoading(true);
        setError('');
        const userMessage: ChatMessage = { role: 'user', text: "נתח את היום שלי ותן לי המלצות למחר." };
        setMessages(prev => [...prev, userMessage]);

        try {
            const todayISO = toLocalISODate();
            const logDocRef = doc(db, 'users', uid, 'dailyLogs', todayISO);
            const logDoc = await getDoc(logDocRef);
            const todayLog = logDoc.exists() ? logDoc.data() : null;

            const metricsCol = collection(db, 'users', uid, 'metrics');
            const latestMetricQuery = query(metricsCol, orderBy('date', 'desc'), limit(1));
            const metricsSnapshot = await getDocs(latestMetricQuery);
            const latestMetric = !metricsSnapshot.empty ? metricsSnapshot.docs[0].data() : null;

            if (!todayLog) {
                 const modelMessage: ChatMessage = { role: 'model', text: "לא מצאתי נתונים להיום. אנא ודא שהזנת את הסיכום היומי שלך כדי שאוכל לתת ניתוח." };
                 setMessages(prev => [...prev, modelMessage]);
                 setLoading(false);
                 return;
            }

            const promptForToday = `
                ---
                הקשר: נתוני בריאות של המשתמש להיום (${todayISO})
                
                רישום יומי:
                ${JSON.stringify(todayLog, null, 2)}

                המדד השבועי האחרון שהוזן (לצורך הקשר כללי):
                ${latestMetric ? JSON.stringify(latestMetric, null, 2) : "לא הוזנו מדדים שבועיים."}
                ---
                בקשת המשתמש: נתח את היום שלי ותן לי המלצות למחר.

                בצע את הפעולות הבאות:
                1. סכם בקצרה את היום על סמך הרישום היומי. אם חסרים נתונים ברישום, ציין זאת בעדינות.
                2. ספק 2-3 המלצות קונקרטיות וקלות ליישום עבור מחר. ההמלצות צריכות להתבסס ישירות על הנתונים של היום (לדוגמה, אם צריכת החלבון הייתה נמוכה, המלץ על מאכלים עשירים בחלבון; אם שעת השינה הייתה מאוחרת, המלץ להקדים אותה).
                3. סיים במשפט מעודד וחיובי.
            `;

            const response = await chat.sendMessage({ message: promptForToday });
            const modelMessage: ChatMessage = { role: 'model', text: response.text };
            setMessages(prev => [...prev, modelMessage]);

        } catch (err: any) {
            console.error("Error analyzing today:", err);
            const detailedError = `אופס, משהו השתבש בניתוח היום. הסיבה: ${err.message || 'שגיאה לא ידועה'}`;
            setError(detailedError);
        } finally {
            setLoading(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const suggestedPrompts = [
        "סכם לי את השבוע האחרון",
        "מה אני יכול לשפר השבוע?",
        "בהתבסס על הנתונים שלי, תן לי טיפ אחד",
        "האם יש קשר בין שעות השינה שלי להרגשה הפיזית?",
    ];

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col h-[600px]">
            <h2 className="text-xl font-bold text-gray-800 mb-2">מאמן AI אישי</h2>
            <p className="text-sm text-gray-500 mb-4">שאל כל שאלה על הנתונים שלך וקבל תובנות.</p>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-gray-800'}`}>
                            <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                        </div>
                    </div>
                ))}
                 {loading && (
                    <div className="flex justify-start">
                         <div className="max-w-md p-3 rounded-2xl bg-gray-100 text-gray-800">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                 )}
                 {error && (
                     <div className="flex justify-center">
                        <div className="max-w-md p-3 rounded-2xl bg-red-100 text-red-800 text-sm">
                           <p>{error}</p>
                        </div>
                     </div>
                 )}
                <div ref={chatEndRef} />
            </div>

            {messages.length === 0 && !loading && !error && (
                 <div className="mb-4">
                    <p className="text-sm text-center text-gray-500 mb-2">נסה לשאול משהו, למשל:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {suggestedPrompts.map(prompt => (
                            <button key={prompt} onClick={() => sendMessage(prompt)} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm hover:bg-gray-200 transition-colors">
                                {prompt}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="mt-auto border-t pt-4">
                 <button
                    onClick={handleAnalyzeToday}
                    disabled={loading || !!error}
                    className="w-full mb-3 bg-gray-800 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-black transition-colors disabled:bg-gray-400 text-sm flex items-center justify-center gap-2"
                >
                    <SparklesIcon />
                    ניתוח היום והמלצות למחר
                </button>
                <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="שאל את המאמן..."
                        className="flex-1 border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black w-full"
                        disabled={loading || !!error}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim() || !!error}
                        className="bg-black text-white p-3 rounded-full font-semibold hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0"
                        aria-label="שלח"
                    >
                        <SendIcon />
                    </button>
                </form>
            </div>
        </div>
    );
}
