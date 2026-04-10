import { useState, useEffect } from 'react';
import { Lock, FileKey, ShieldCheck, ShieldX, Play, Key, Server, Building2, Upload, Cpu, AlertTriangle } from 'lucide-react';

// Generates or retrieves a persistent unique hardware ID for this browser/device
function getHardwareId() {
  let hwId = localStorage.getItem('theatreshield_hardware_id');
  if (!hwId) {
    hwId = 'HW-' + Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
    localStorage.setItem('theatreshield_hardware_id', hwId);
  }
  return hwId;
}

export default function Distribution() {
  const [activeTab, setActiveTab] = useState('provider');
  const hardwareId = getHardwareId();
  
  // Provider state
  const [movieTitle, setMovieTitle] = useState('Blockbuster Movie 2026 (Encrypted DCP)');
  const [theatreName, setTheatreName] = useState('Global Cinemas Screen 1');
  const [targetHardwareId, setTargetHardwareId] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [maxUses, setMaxUses] = useState(5);
  const [generatedToken, setGeneratedToken] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Theatre state
  const [kdmToken, setKdmToken] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getTime() - 5 * 60000);
    const until = new Date(now.getTime() + 3 * 3600000);
    const toLocalISO = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    setValidFrom(toLocalISO(from));
    setValidUntil(toLocalISO(until));
    // Pre-fill with current device's hardware ID for demonstration
    setTargetHardwareId(hardwareId);
  }, []);

  const handleGenerateKDM = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setGeneratedToken(null);
    try {
      const response = await fetch('http://localhost:8000/api/kdm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_title: movieTitle,
          theatre_name: theatreName,
          hardware_id: targetHardwareId,  // Binds token to this specific device
          valid_from: new Date(validFrom).toISOString(),
          valid_until: new Date(validUntil).toISOString(),
          max_uses: maxUses,
        })
      });
      const data = await response.json();
      if (data.success) setGeneratedToken(data.token);
      else alert('Error: ' + (data.error || 'Unknown error'));
    } catch (e) {
      console.error("Provider Error:", e);
    }
    setGenerating(false);
  };

  const handleValidateKDM = async (e) => {
    e.preventDefault();
    setValidating(true);
    setValidationResult(null);
    try {
      const response = await fetch('http://localhost:8000/api/kdm/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: kdmToken,
          hardware_id: hardwareId   // Always send this device's ID — server checks it matches
        })
      });
      const data = await response.json();
      setValidationResult(data);
    } catch (e) {
      console.error("Theatre Error:", e);
      setValidationResult({ valid: false, reason: 'Network error. Cannot reach distribution server.' });
    }
    setValidating(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500">
      
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-full border border-indigo-500/20 mb-2">
          <Server className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">KDM Distribution Portal</h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-base leading-relaxed">
          Hardware-bound Key Delivery Messages (KDM) prevent unauthorized playback.
          Tokens are cryptographically locked to a specific theatre's device fingerprint.
        </p>
      </div>

      {/* Device Hardware ID Banner */}
      <div className="bg-gray-900 border border-indigo-500/20 rounded-xl p-4 flex items-center gap-4">
        <div className="p-2 bg-indigo-500/10 rounded-lg">
          <Cpu className="w-5 h-5 text-indigo-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">This Device's Hardware ID</p>
          <p className="text-sm font-mono text-indigo-300 break-all">{hardwareId}</p>
        </div>
        <div className="ml-auto text-xs text-gray-500 text-right shrink-0">
          <p>Unique device fingerprint</p>
          <p>Persisted in localStorage</p>
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <button onClick={() => { setActiveTab('provider'); setValidationResult(null); }}
          className={`px-8 py-3 rounded-full font-bold transition-all ${activeTab === 'provider' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
          Provider Mode
        </button>
        <button onClick={() => { setActiveTab('theatre'); setGeneratedToken(null); }}
          className={`px-8 py-3 rounded-full font-bold transition-all ${activeTab === 'theatre' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
          Theatre Mode
        </button>
      </div>

      {activeTab === 'provider' && (
        <div className="bg-[--color-dark-card] border border-gray-800 p-8 rounded-2xl shadow-xl flex gap-8">
          <div className="flex-1 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-6 h-6 text-indigo-400" />
              <h2 className="text-xl font-bold text-gray-200">Generate Hardware-Bound KDM</h2>
            </div>
            
            <form onSubmit={handleGenerateKDM} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Encrypted Asset Name</label>
                <input type="text" value={movieTitle} onChange={e => setMovieTitle(e.target.value)}
                  className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 focus:border-indigo-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Target Theatre Name</label>
                <input type="text" value={theatreName} onChange={e => setTheatreName(e.target.value)}
                  className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 focus:border-indigo-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Target Device Hardware ID <span className="text-red-400">*</span>
                  <span className="text-gray-600 ml-2">(Token will ONLY work on this exact device)</span>
                </label>
                <input type="text" value={targetHardwareId} onChange={e => setTargetHardwareId(e.target.value)}
                  placeholder="Paste the Hardware ID from the theatre's device"
                  className="w-full bg-black border border-red-900/40 rounded-lg px-4 py-2.5 text-red-300 font-mono text-sm focus:border-red-500 outline-none" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Valid From</label>
                  <input type="datetime-local" value={validFrom} onChange={e => setValidFrom(e.target.value)}
                    className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Valid Until</label>
                  <input type="datetime-local" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                    className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Screening Uses (Anti-Replay)</label>
                <input type="number" min="1" max="50" value={maxUses} onChange={e => setMaxUses(e.target.value)}
                  className="w-32 bg-black/50 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-200 outline-none" />
              </div>
              <button type="submit" disabled={generating}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 px-6 py-3 rounded-lg text-white font-bold flex justify-center items-center gap-2 transition-all">
                <FileKey className="w-5 h-5" /> {generating ? 'Generating Encrypted Key...' : 'Generate Hardware-Bound Token'}
              </button>
            </form>
          </div>
           
          <div className="flex-1 bg-black/30 rounded-xl border border-gray-800 p-6 flex flex-col justify-center items-center text-center">
            {generatedToken ? (
              <div className="space-y-4 animate-in zoom-in duration-300 w-full">
                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto">
                  <Key className="w-8 h-8" />
                </div>
                <h3 className="text-white font-bold text-lg">KDM Token Generated!</h3>
                <p className="text-gray-400 text-sm">This key will <strong className="text-white">ONLY</strong> work when used on device:</p>
                <p className="text-xs font-mono text-indigo-400 bg-indigo-500/5 p-2 rounded border border-indigo-500/20 break-all">
                  {targetHardwareId}
                </p>
                <p className="text-gray-500 text-xs">Share this token with the theatre — but copying it to another device will produce an access denied error:</p>
                <div className="bg-black border border-gray-700 rounded p-3 text-xs font-mono text-emerald-400 break-all select-all text-left">
                  {generatedToken}
                </div>
              </div>
            ) : (
              <div className="text-gray-500 flex flex-col items-center gap-4">
                <FileKey className="w-12 h-12 opacity-40" />
                <p className="text-sm">The generated token will be mathematically bound to the Theatre Hardware ID you specify. Anyone who copies and reuses this token on a different machine will be immediately rejected.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'theatre' && (
        <div className="bg-[--color-dark-card] border border-gray-800 p-8 rounded-2xl shadow-xl">
          <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
            <Building2 className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-gray-200">Theatre Ingest System</h2>
          </div>
          
          {!validationResult?.valid ? (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 flex gap-3">
                <Cpu className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-300 font-medium">Your device will authenticate with:</p>
                  <p className="text-xs font-mono text-indigo-400 mt-1 break-all">{hardwareId}</p>
                  <p className="text-xs text-gray-500 mt-1">The token must have been generated for this exact hardware ID.</p>
                </div>
              </div>

              <form onSubmit={handleValidateKDM} className="bg-black/40 p-6 rounded-xl border border-gray-800 space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Paste KDM Token</label>
                  <input type="text" value={kdmToken} onChange={e => setKdmToken(e.target.value)}
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-emerald-400 font-mono text-sm focus:border-indigo-500 outline-none transition-colors" required />
                </div>
                
                {validationResult && !validationResult.valid && (
                  <div className="flex gap-3 items-start bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <ShieldX className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-red-400 text-sm">{validationResult.reason}</p>
                  </div>
                )}
                
                <button type="submit" disabled={validating}
                  className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 px-6 py-3 rounded-lg text-white font-bold flex justify-center items-center gap-2 transition-all">
                  <ShieldCheck className="w-5 h-5" /> {validating ? 'Verifying...' : 'Authenticate & Unlock Stream'}
                </button>
              </form>
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-4 zoom-in-95 duration-300">
              <div className="mb-4 flex gap-3 items-center bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-emerald-400 font-semibold">Hardware Verification Passed</p>
                  <p className="text-gray-400 text-sm">{validationResult.reason} ({validationResult.screenings_used}/{validationResult.screenings_used + validationResult.screenings_left} screenings used)</p>
                </div>
              </div>
              
              <div className="bg-black/40 rounded-2xl overflow-hidden shadow-2xl relative group">
                <div className="absolute top-6 left-6 z-10 flex items-center gap-2 bg-black/80 px-4 py-2 rounded-lg backdrop-blur-md border border-white/10 shadow-lg">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{validationResult.movie} — Verified Stream</span>
                </div>
                <div className="aspect-[21/9] bg-[url('https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2025&auto=format&fit=crop')] bg-cover bg-center relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/70 group-hover:bg-black/60 transition-all duration-500"></div>
                  <button onClick={() => alert('Secure DCP Decryption Successful. Hardware-bound stream active.')}
                    className="relative z-10 flex flex-col items-center gap-3 px-10 py-5 rounded-3xl font-bold text-lg transition-all duration-300 transform group-hover:scale-105 bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_40px_rgba(16,185,129,0.5)] border border-emerald-400/30">
                    <Play className="w-8 h-8 fill-current" />
                    <span>Start Validated Secure Stream</span>
                  </button>
                </div>
                <div className="bg-emerald-500/10 p-4 flex justify-between items-center text-sm border-t border-emerald-500/20">
                  <span className="text-emerald-400 font-mono">Theatre: {validationResult.theatre}</span>
                  <button onClick={() => setValidationResult(null)}
                    className="text-gray-400 hover:text-white underline text-xs">End Session & Purge Key</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
