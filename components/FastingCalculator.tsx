import React, { useState, useMemo } from 'react';
import { addHours } from '../utils/date';

const FASTING_START_TIME_KEY = 'fastingStartTime';

function getInitialStartTime(): string {
    try {
        const savedTime = localStorage.getItem(FASTING_START_TIME_KEY);
        // Basic validation for HH:MM format
        if (savedTime && /^\d{2}:\d{2}$/.test(savedTime)) {
            return savedTime;
        }
    } catch (error) {
        console.error("Failed to read start time from localStorage", error);
    }
    // Return a consistent default if nothing is saved
    return '09:00';
}

export default function FastingCalculator() {
  const [startTime, setStartTime] = useState<string>(getInitialStartTime());
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  
  const eatingEnd = useMemo(() => addHours(startTime, 8), [startTime]);
  const fastingEnd = useMemo(() => addHours(eatingEnd, 16), [eatingEnd]);

  const handleSave = () => {
    try {
      localStorage.setItem(FASTING_START_TIME_KEY, startTime);
      setShowSavedMessage(true);
      setTimeout(() => {
        setShowSavedMessage(false);
      }, 2000); // Hide message after 2 seconds
    } catch (error) {
      console.error("Failed to save start time to localStorage", error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">מחשבון צום 16/8</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">שעת תחילת אכילה</label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              onClick={handleSave}
              className="bg-black text-white px-4 py-2 rounded-xl font-semibold hover:bg-gray-800 transition-colors text-sm whitespace-nowrap"
            >
              שמור
            </button>
          </div>
          {showSavedMessage && <p className="text-green-600 text-xs mt-1">השעה נשמרה!</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">סיום חלון אכילה</label>
          <input
            type="time"
            value={eatingEnd}
            readOnly
            className="w-full border-gray-300 rounded-xl px-3 py-2 bg-gray-100 cursor-not-allowed"
          />
        </div>
        <div className="text-sm text-gray-700 pb-2 md:col-span-2 lg:col-span-1">
            <p>צום עד <strong>{fastingEnd}</strong> למחרת.</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-4">הערה: החישוב הוא בסיסי ואינו מהווה ייעוץ רפואי.</p>
    </div>
  );
}