import { useState, useEffect } from 'react';
import { Lock, Play, Clock, ShieldCheck, ShieldX } from 'lucide-react';

export default function SecurePlayback() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Set window from 6 PM to 9 PM
  const startHour = 18; // 6 PM
  const endHour = 21; // 9 PM
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = currentTime.getHours();
  // We apply the allowed check based on the current hour.
  const isAllowed = currentHour >= startHour && currentHour < endHour;

  const handlePlay = () => {
    if (!isAllowed) {
      alert("Access Denied: Attempting to play outside allowed time window.");
      return;
    }
    alert("Decrypting stream... Secure playback started.");
  };

  // Convert to formatted string 
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
      
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20 mb-2 shadow-[0_0_30px_rgba(79,70,229,0.15)]">
          <Lock className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Secure Theatre Playback</h1>
        <p className="text-gray-400 max-w-lg mx-auto text-lg">
          Digital cinema packages (DCP) are encrypted and can only be decrypted 
          during authorized showtime windows.
        </p>
      </div>

      {/* Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[--color-dark-card] border border-gray-800 p-6 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <div className="bg-gray-800 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium tracking-wide">Current Local Time</p>
              <p className="text-2xl font-mono text-gray-200 mt-1">{formatTime(currentTime)}</p>
            </div>
          </div>
        </div>

        <div className={`border p-6 rounded-xl flex items-center justify-between shadow-lg transition-colors ${isAllowed ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${isAllowed ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              {isAllowed ? <ShieldCheck className="w-6 h-6 text-green-400" /> : <ShieldX className="w-6 h-6 text-red-500" />}
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium tracking-wide">Showtime Window Status</p>
              <p className="text-lg font-medium mt-1">
                {isAllowed ? (
                  <span className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]">Access Granted</span>
                ) : (
                  <span className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">Access Denied</span>
                )}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-widest">Allowed Window</p>
            <p className="text-base font-mono text-gray-300 mt-1">18:00 - 21:00</p>
          </div>
        </div>
      </div>

      {/* Movie Player Card */}
      <div className="bg-[--color-dark-card] border border-gray-800 rounded-2xl overflow-hidden mt-8 shadow-2xl relative group">
        <div className="absolute top-6 left-6 z-10 flex items-center gap-2 bg-black/80 px-4 py-2 rounded-lg backdrop-blur-md border border-white/10 shadow-lg">
           <Lock className="w-4 h-4 text-emerald-400" />
           <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Encrypted Movie File</span>
        </div>

        <div className="aspect-[21/9] bg-gray-900 bg-[url('https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2025&auto=format&fit=crop')] bg-cover bg-center relative flex items-center justify-center">
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/70 group-hover:bg-black/60 transition-all duration-500"></div>
            
            <button 
              onClick={handlePlay}
              className={`relative z-10 flex items-center gap-3 px-10 py-5 rounded-full font-bold text-lg transition-all duration-300 transform group-hover:scale-105 ${
                isAllowed 
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_40px_rgba(79,70,229,0.5)] border border-indigo-400/30' 
                  : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed shadow-none hover:scale-100'
              }`}
            >
              <Play className={`w-7 h-7 ${isAllowed ? 'fill-current' : 'fill-none'}`} />
              {isAllowed ? 'Start Secure Playback' : 'Outside Showtime Window'}
            </button>
        </div>

        {!isAllowed && (
          <div className="p-4 bg-red-500/10 border-t border-red-500/20 text-center animate-pulse">
             <p className="text-red-400 text-sm font-medium flex items-center justify-center gap-2">
                <ShieldX className="w-5 h-5" />
                Playback blocked. System time is currently outside the authorized timeframe.
             </p>
          </div>
        )}
      </div>

    </div>
  );
}
