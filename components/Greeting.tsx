import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';

interface GreetingProps {
  user: User;
}

const FASTING_START_TIME_KEY = 'fastingStartTime';

const timeStringToDate = (timeStr: string, baseDate: Date = new Date()): Date => {
    const date = new Date(baseDate.getTime());
    const [hours, minutes] = timeStr.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date;
}

const formatTimeLeft = (ms: number): string => {
    if (ms < 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function Greeting({ user }: GreetingProps) {
  const [now, setNow] = useState(new Date());

  const greeting = useMemo(() => {
    const hour = now.getHours();
    const name = user.displayName?.split(' ')[0] || '';
    if (hour >= 5 && hour < 12) return `בוקר טוב, ${name}`;
    if (hour >= 12 && hour < 18) return `צהריים טובים, ${name}`;
    if (hour >= 18 && hour < 22) return `ערב טוב, ${name}`;
    return `לילה טוב, ${name}`;
  }, [now, user.displayName]);
  
  const fastingInfo = useMemo(() => {
    try {
        const startTimeStr = localStorage.getItem(FASTING_START_TIME_KEY);
        if (!startTimeStr || !/^\d{2}:\d{2}$/.test(startTimeStr)) {
            return null;
        }

        let currentEatingStart = timeStringToDate(startTimeStr, now);
        if (now < currentEatingStart) {
            currentEatingStart.setDate(currentEatingStart.getDate() - 1);
        }
        
        const currentEatingEnd = new Date(currentEatingStart.getTime());
        currentEatingEnd.setHours(currentEatingStart.getHours() + 8);
        
        const isEatingWindow = now >= currentEatingStart && now <= currentEatingEnd;

        if (isEatingWindow) {
            const timeLeftMs = currentEatingEnd.getTime() - now.getTime();
            return {
                message: "חלון האכילה ייסגר בעוד:",
                timeLeft: formatTimeLeft(timeLeftMs),
            };
        } else {
            let nextEatingStart = timeStringToDate(startTimeStr, now);
            if (now >= currentEatingEnd) {
                nextEatingStart.setDate(nextEatingStart.getDate() + 1);
            }
            
            const timeLeftMs = nextEatingStart.getTime() - now.getTime();
             return {
                message: "ניתן לחזור לאכול בעוד:",
                timeLeft: formatTimeLeft(timeLeftMs),
            };
        }
    } catch (e) {
        console.error("Error calculating fasting time:", e);
        return null;
    }
  }, [now]);


  useEffect(() => {
    const timerId = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
      <h2 className="text-2xl font-bold text-gray-800">{greeting}</h2>
      {fastingInfo && (
        <div className="mt-2">
            <p className="text-gray-600">{fastingInfo.message}</p>
            <p className="text-3xl font-mono font-bold text-black tracking-wider">{fastingInfo.timeLeft}</p>
        </div>
      )}
    </div>
  );
}