import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

export default function DynamicGreeting() {
  const [greeting, setGreeting] = useState('');

  const getGreetingText = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // Convert time limits to total minutes
    // Jam 05:00 - 10:59 -> 5:00 (300 mins) to 10:59 (659 mins)
    // Jam 11:00 - 14:59 -> 11:00 (660 mins) to 14:59 (899 mins)
    // Jam 15:00 - 18:29 -> 15:00 (900 mins) to 18:29 (1109 mins)
    // Jam 18:30 - 23:59 -> 18:30 (1110 mins) to 23:59 (1439 mins)
    // Jam 00:00 - 04:59 -> 00:00 (0 mins) to 04:59 (299 mins)

    if (totalMinutes >= 300 && totalMinutes < 660) {
      return "Selamat pagi! Jangan lupa sarapan dan sikat gigi ya! ☀️";
    } else if (totalMinutes >= 660 && totalMinutes < 900) {
      return "Selamat siang! Tetap semangat pantau data kesehatan giginya! 🌤️✨";
    } else if (totalMinutes >= 900 && totalMinutes < 1110) {
      return "Selamat sore! Udah mandi sore belum nih? Seger banget pasti! 🌆";
    } else if (totalMinutes >= 1110 && totalMinutes <= 1439) {
      return "Selamat malam! Jangan lupa sikat gigi sebelum tidur ya, abis ini langsung bobo! 🌙✨";
    } else {
      return "Wah, begadang ya? Jangan lupa istirahat, matanya dijaga ya! 🦉💤";
    }
  };

  useEffect(() => {
    // Initial check
    setGreeting(getGreetingText());

    // Check periodically (every 10 seconds)
    const interval = setInterval(() => {
      setGreeting(getGreetingText());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="flex items-center gap-2.5 bg-white/40 dark:bg-slate-900/35 border border-white/50 dark:border-white/10 px-4 py-2.5 rounded-2xl shadow-2xs backdrop-blur-md w-fit animate-fadeIn"
      id="dynamic-greeting-card"
    >
      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse flex items-center justify-center">
        <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-900" />
      </div>
      <span className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
        Sistem Deteksi Waktu:
      </span>
      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
        {greeting}
      </span>
    </div>
  );
}
