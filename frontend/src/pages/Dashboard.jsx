import { useState, useEffect, useRef } from 'react';
import { Camera, AlertCircle, AlertTriangle, ShieldAlert, ShieldCheck, Trash2, Power, Upload, Video, Maximize, Activity } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

const THEATRE_SCREENS = [
  { id: 1, name: 'Screen 1 - IMAX', cameras: ['Front Center AI', 'Rear Wide', 'Balcony'] },
  { id: 2, name: 'Screen 2 - Dolby', cameras: ['Left Gallery', 'Right Gallery'] },
  { id: 3, name: 'Screen 3 - Standard', cameras: ['Center Overview'] },
];

export default function Dashboard() {
  const [alerts, setAlerts] = useState([]);
  const [theatreMode, setTheatreMode] = useState(true);
  const [model, setModel] = useState(null);
  const [modelLoading, setModelLoading] = useState(true);
  const [telemetry, setTelemetry] = useState({ fps: 0, objects: 0, classes: [] });
  const [evidenceFlash, setEvidenceFlash] = useState(false);
  const [selectedAlertIndex, setSelectedAlertIndex] = useState(0);
  const [videoSrc, setVideoSrc] = useState(null);
  const [activeScreen, setActiveScreen] = useState(THEATRE_SCREENS[0].id);
  const [activeCamera, setActiveCamera] = useState(THEATRE_SCREENS[0].cameras[0]);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const latestPredictionsRef = useRef([]); // Forensic Sync persistence
  
  const threatenedSeatsRef = useRef(new Map()); 
  const animationFrameRef = useRef(null);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/alerts');
      const data = await response.json();
      if (data.alerts) setAlerts(data.alerts);
    } catch (e) {
      console.error('Failed to fetch alerts', e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        const loadedModel = await cocoSsd.load({ base: 'mobilenet_v2' });
        setModel(loadedModel);
        setModelLoading(false);
      } catch (err) {
        console.error("Failed to load TFJS Model", err);
      }
    };
    loadModel();
    return () => {
       if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  useEffect(() => {
    if (model && theatreMode && !modelLoading) {
       detectFrame();
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [model, theatreMode, modelLoading]);

  const captureEvidence = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    // High-Resolution Forensic Capture Engine (KEPT)
    const video = videoRef.current;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    
    const predictions = latestPredictionsRef.current;
    predictions.forEach(p => {
       const isPrimaryDevice = ['cell phone', 'tablet', 'laptop'].includes(p.class);
       const isSuspectObject = ['remote', 'handbag', 'book', 'monitor'].includes(p.class);
       if (isPrimaryDevice || isSuspectObject) {
         const [x, y, w, h] = p.bbox;
         tempCtx.strokeStyle = '#ef4444';
         tempCtx.lineWidth = Math.max(4, tempCanvas.width / 400);
         tempCtx.strokeRect(x, y, w, h);
         tempCtx.fillStyle = '#ef4444';
         const fontSize = Math.max(16, tempCanvas.width / 100);
         tempCtx.font = `bold ${fontSize}px Inter`;
         tempCtx.fillText(`IDENTIFIED: ${p.class.toUpperCase()}`, x, y > fontSize ? y - 10 : fontSize);
       }
    });
    
    setEvidenceFlash(true);
    setTimeout(() => setEvidenceFlash(false), 300);
    return tempCanvas.toDataURL('image/jpeg', 0.85);
  };

  const triggerRealAlert = async (confidence, seatId, evidenceData) => {
    try {
      await fetch('http://localhost:8000/api/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `CRITICAL: Illegal Recording Confirmed`,
          confidence: Math.round(confidence * 100),
          duration: 5.0,
          seat_number: seatId,
          evidence_image: evidenceData
        })
      });
      fetchAlerts();
    } catch (e) {
      console.error('Failed to trigger alert', e);
    }
  };

  const clearLogs = async () => {
    try {
      await fetch('http://localhost:8000/api/alerts', { method: 'DELETE' });
      setAlerts([]);
    } catch (e) {
      setAlerts([]);
    }
  };

  const [videoError, setVideoError] = useState(false);

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setVideoError(false);
    }
  };

  const handleVideoError = () => {
    console.warn("Video load failed.");
    setVideoError(true);
  };

  const detectFrame = async () => {
    if (canvasRef.current && model && theatreMode) {
      const startTime = performance.now();
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const video = videoRef.current;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      
      let predictions = [];
      if (video && video.readyState >= 2 && !video.paused) {
        predictions = await model.detect(video, 20, 0.05);
        latestPredictionsRef.current = predictions;
      }
      
      const videoScaling = () => {
        if (!video || !video.videoWidth) return { scaleX: 1, scaleY: 1, dx: 0, dy: 0 };
        const videoRatio = video.videoWidth / video.videoHeight;
        const canvasRatio = canvas.width / canvas.height;
        let scale;
        if (videoRatio > canvasRatio) {
          scale = canvas.height / video.videoHeight;
        } else {
          scale = canvas.width / video.videoWidth;
        }
        return {
          scaleX: scale,
          scaleY: scale,
          dx: (canvas.width - video.videoWidth * scale) / 2,
          dy: (canvas.height - video.videoHeight * scale) / 2
        };
      };

      const { scaleX, scaleY, dx, dy } = videoScaling();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const numRows = 3; const numCols = 4;
      const cellWidth = canvas.width / numCols;
      const cellHeight = canvas.height / numRows;
      const currentTracking = threatenedSeatsRef.current;
      const now = Date.now();
      const activeThreats = [];

      predictions.forEach(prediction => {
        const [x, y, width, height] = prediction.bbox;
        const sx = x * scaleX + dx; 
        const sy = y * scaleY + dy; 
        const sw = width * scaleX; 
        const sh = height * scaleY;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.setLineDash([5, 5]); ctx.lineWidth = 1;
        ctx.strokeRect(sx, sy, sw, sh);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; ctx.font = '10px Inter';
        ctx.fillText(prediction.class.toUpperCase(), sx + 5, sy + 15);

        const isPrimaryDevice = ['cell phone', 'tablet', 'laptop'].includes(prediction.class);
        const isSuspectObject = ['remote', 'handbag', 'book', 'monitor'].includes(prediction.class);
        const cx = sx + sw / 2; const cy = sy + sh / 2;
        const rID = Math.floor(cy / cellHeight || 0);
        const cID = Math.floor(cx / cellWidth || 0);
        const seatId = `Sector-${Math.max(0, Math.min(numRows-1, rID))}${Math.max(0, Math.min(numCols-1, cID))}`;

        const isAlreadyTracked = currentTracking.has(seatId);
        const maintenanceThreshold = isAlreadyTracked ? 0.15 : 0.40;
        const isLegitThreat = (isPrimaryDevice || isSuspectObject) && prediction.score >= maintenanceThreshold;
        
        if (isLegitThreat) { 
           let isTracked = isAlreadyTracked;
           if (!isTracked) {
              const neighborSeats = [];
              for(let dr=-1; dr<=1; dr++) {
                for(let dc=-1; dc<=1; dc++) {
                  const nr = rID + dr; const nc = cID + dc;
                  if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols) neighborSeats.push(`Sector-${nr}${nc}`);
                }
              }
              const recentNeighbor = neighborSeats.find(n => currentTracking.has(n) && (now - currentTracking.get(n).lastSeen < 2000));
              if (recentNeighbor) {
                const history = currentTracking.get(recentNeighbor);
                currentTracking.set(seatId, { ...history, lastSeen: now });
                currentTracking.delete(recentNeighbor); 
                isTracked = true;
              }
           }
           const behavior = isTracked && (now - currentTracking.get(seatId).firstSeen > 5000) ? 'RECORDING CONFIRMED' : 'SUSPICIOUS ACTIVITY';
           activeThreats.push({ seatId, score: prediction.score, cx, cy, behavior });
           ctx.strokeStyle = behavior === 'RECORDING CONFIRMED' ? '#ef4444' : '#f59e0b';
           ctx.lineWidth = behavior === 'RECORDING CONFIRMED' ? 4 : 2;
           ctx.strokeRect(sx, sy, sw, sh);
           ctx.fillStyle = behavior === 'RECORDING CONFIRMED' ? '#ef4444' : '#f59e0b';
           ctx.font = 'bold 16px Inter';
           ctx.fillText(`${behavior}: SEAT ${seatId}`, sx, sy > 20 ? sy - 8 : 20);
        }
      });

      setTelemetry({
        fps: Math.round(1000 / (performance.now() - startTime)),
        objects: predictions.filter(p => p.score >= 0.40).length,
        classes: Array.from(new Set(predictions.filter(p => p.score >= 0.40).map(p => p.class)))
      });

      activeThreats.forEach(threat => {
          if (currentTracking.has(threat.seatId)) {
              let record = currentTracking.get(threat.seatId);
              record.lastSeen = now;
              if (threat.score > record.maxConf) record.maxConf = threat.score;
              if (!record.alerted && (now - record.firstSeen > 5000)) {
                 record.alerted = true;
                 const evidence = captureEvidence();
                 triggerRealAlert(record.maxConf, threat.seatId, evidence);
              }
              if (!record.alerted) {
                 const durationMs = now - record.firstSeen;
                 const fillRatio = Math.min(durationMs / 5000, 1.0);
                 ctx.fillStyle = `rgba(245, 158, 11, 0.4)`; 
                 ctx.beginPath(); ctx.arc(threat.cx, threat.cy, 30 * fillRatio, 0, 2 * Math.PI); ctx.fill();
                 ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
                 ctx.fillStyle = 'white'; ctx.font = 'bold 12px Inter';
                 ctx.fillText(`VERIFYING: ${(durationMs/1000).toFixed(1)}s`, threat.cx - 30, threat.cy + 5);
              }
          } else {
              currentTracking.set(threat.seatId, { firstSeen: now, lastSeen: now, maxConf: threat.score, alerted: false });
          }
      });
      currentTracking.forEach((val, key) => { if (now - val.lastSeen > 2000) currentTracking.delete(key); });
    }
    animationFrameRef.current = requestAnimationFrame(detectFrame);
  };

  const handleVideoPlay = () => {
    detectFrame();
  };

  const selectedScreen = THEATRE_SCREENS.find(s => s.id === activeScreen);

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] p-4 md:p-6 lg:p-8 gap-6 max-w-[1700px] mx-auto animate-in fade-in pb-20">
      
      {/* Sidebar: Navigation for Multi-Camera */}
      <aside className="w-64 flex flex-col gap-4">
        <div className="bg-[--color-dark-card] border border-gray-800 rounded-xl p-4 shadow-xl">
           <h2 className="text-gray-400 uppercase tracking-widest text-xs font-bold mb-4">Select Feed</h2>
           <div className="space-y-4">
             {THEATRE_SCREENS.map(screen => (
               <div key={screen.id} className="space-y-1">
                 <button 
                  onClick={() => { setActiveScreen(screen.id); setActiveCamera(screen.cameras[0]); }}
                  className={`w-full text-left font-semibold text-sm px-3 py-2 rounded-lg transition-colors ${activeScreen === screen.id ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-800'}`}
                 >
                   {screen.name}
                 </button>
                 {activeScreen === screen.id && (
                   <div className="pl-4 space-y-1 mt-1 border-l-2 border-indigo-500/30 ml-2 animate-in slide-in-from-top-1 duration-200">
                     {screen.cameras.map((cam, idx) => (
                       <button
                        key={idx}
                        onClick={() => setActiveCamera(cam)}
                        className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${activeCamera === cam ? 'text-indigo-400 bg-indigo-500/10' : 'text-gray-500 hover:text-gray-300'}`}
                       >
                         • {cam}
                       </button>
                     ))}
                   </div>
                 )}
               </div>
             ))}
           </div>
        </div>
        
        <div className={`p-4 rounded-xl border transition-colors ${theatreMode ? 'bg-[--color-dark-card] border-gray-700' : 'bg-gray-800 border-gray-600'}`}>
           <h2 className="text-gray-400 uppercase tracking-widest text-xs font-bold mb-3">AI Engine Status</h2>
           <div className="flex items-center gap-3">
              <button 
                onClick={() => setTheatreMode(!theatreMode)}
                className={`p-2 rounded-full transition-colors ${theatreMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-gray-600 text-gray-500'}`}
              >
                <Power className="w-5 h-5" />
              </button>
              <div>
                <p className="text-sm font-semibold text-gray-200">{theatreMode ? 'Active' : 'Paused'}</p>
                <p className="text-xs text-gray-500">Spatial Map Engine</p>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-6 min-h-0 overflow-y-auto p-4 md:p-0">
        
        {/* Top Video Analysis Frame - RESTORED ORIGINAL SIZE */}
        <div className="bg-[--color-dark-card] border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col min-h-[520px] lg:h-[60%]">
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-3">
              <Camera className="w-5 h-5 text-indigo-400" />
              <div>
                <h2 className="font-bold text-gray-200 tracking-wide">{selectedScreen?.name}</h2>
                <p className="text-xs text-gray-500 font-mono">LIVE // {activeCamera}</p>
              </div>
            </div>
            {modelLoading ? (
               <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded font-mono animate-pulse border border-yellow-500/30">Booting AI Models...</span>
            ) : (
               <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded font-mono border border-emerald-500/20 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                 Neural Mesh Active
               </span>
            )}
          </div>

            <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
              {/* Telemetry Bar */}
              {model && (
                <div className="absolute top-0 left-0 right-0 z-40 bg-black/60 backdrop-blur px-4 py-2 flex items-center justify-between border-b border-white/5">
                  <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${modelLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'}`}></div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{modelLoading ? 'Calibrating AI...' : 'Neural Engine Online'}</span>
                    </div>
                    {videoSrc && (
                      <>
                        <div className="h-4 w-px bg-white/10"></div>
                        <div className="flex items-center gap-3 font-mono text-[10px]">
                            <span className="text-gray-500 uppercase">Inference:</span>
                            <span className={`text-green-400 font-bold`}>{telemetry.fps}ms</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[10px]">
                            <span className="text-gray-500 uppercase">Input:</span>
                            <span className="text-indigo-400 font-bold">{telemetry.objects} Objects</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {telemetry.classes.map(cls => (
                      <span key={cls} className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[9px] text-indigo-300 font-bold uppercase">{cls}</span>
                    ))}
                  </div>
                </div>
              )}

              {!videoSrc ? (
                 <div className="text-center p-8 border-2 border-dashed border-gray-700/50 rounded-2xl w-full max-w-sm absolute z-20">
                    <Video className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-300 font-medium mb-1">No video feed detected.</p>
                    <p className="text-gray-500 text-sm mb-6">Select a local video file to begin forensic analysis.</p>
                    <div className="flex flex-col gap-3">
                      <label className="cursor-pointer inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-lg font-bold transition-all hover:scale-105 shadow-xl hover:shadow-indigo-500/20">
                         <Upload className="w-5 h-5" /> Load Security Footage
                         <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleVideoUpload} />
                      </label>
                    </div>
                 </div>
              ) : (
              <>
                <video 
                  ref={videoRef}
                  src={videoSrc}
                  autoPlay
                  muted
                  loop
                  controls
                  onPlay={handleVideoPlay}
                  onError={handleVideoError}
                  crossOrigin="anonymous"
                  className="absolute inset-0 w-full h-full object-cover z-10 opacity-70 mix-blend-screen"
                />
                <div className="absolute inset-0 z-15 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%]"></div>
                {evidenceFlash && <div className="absolute inset-0 z-50 bg-white/40 animate-out fade-out duration-300 pointer-events-none" />}
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-20 pointer-events-none object-cover" />
              </>
            )}

            {/* SECURE MONITORING label - Always show when AI is ready */}
            {!modelLoading && (
              <div className="absolute top-12 right-4 z-30 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-md backdrop-blur border border-white/10 shadow-lg">
                <Maximize className="w-3 h-3 text-red-500" />
                <span className="text-[10px] font-mono text-white uppercase tracking-[0.2em]">SECURE MONITORING ACTIVE</span>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-black flex items-center justify-between border-t border-gray-800">
             <div className="flex gap-4">
               <span className="text-xs text-gray-500 font-mono italic">Visual Evidence Preferred Mode</span>
               <span className="text-xs text-red-500/70 font-mono">Incident Verification Buffer: 5s</span>
             </div>
             {videoSrc && (
                 <label className="cursor-pointer text-xs font-bold text-gray-400 hover:text-white uppercase transition-colors">
                   Change Source
                   <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleVideoUpload} />
                 </label>
             )}
          </div>
        </div>

        {/* Bottom Alerts Frame */}
        <div className="bg-[--color-dark-card] border border-gray-800 rounded-xl overflow-hidden shadow-xl flex-1 flex flex-col min-h-0">
          <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-black/30">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <h2 className="font-semibold text-gray-200 uppercase tracking-widest text-[10px]">High Priority Intelligence</h2>
            </div>
          </div>
          <div className="p-3 flex-1 flex flex-col justify-center bg-gradient-to-b from-gray-900 to-[#0c0c0c] border-b border-gray-800 overflow-hidden min-h-[220px]">
             {alerts.length > 0 ? (
               <div className="animate-in fade-in zoom-in-95 duration-500 flex flex-col md:flex-row gap-4 h-full">
                  {alerts[selectedAlertIndex]?.evidence_image ? (
                    <div className="relative w-full md:w-1/2 h-full rounded-lg overflow-hidden border border-red-500/40 shadow-2xl group">
                       <img src={alerts[selectedAlertIndex].evidence_image} className="w-full h-full object-cover grayscale-[20%] contrast-125 transition-transform duration-700 group-hover:scale-110" alt="Violation Evidence" />
                       <div className="absolute top-0 left-0 bg-red-600 text-white text-[9px] font-bold px-2 py-1 uppercase tracking-widest shadow-lg">HISTORICAL EVIDENCE #{alerts.length - selectedAlertIndex}</div>
                       <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => window.open(alerts[selectedAlertIndex].evidence_image)} className="bg-black/60 text-white p-1 rounded backdrop-blur border border-white/20"><Maximize className="w-3 h-3" /></button>
                       </div>
                       <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2"><p className="text-[10px] text-white font-mono">{alerts[selectedAlertIndex].timestamp} // CONFIDENCE: {alerts[selectedAlertIndex].confidence}%</p></div>
                    </div>
                  ) : (
                    <div className="w-full md:w-1/2 h-full rounded-lg bg-gray-950 flex items-center justify-center border border-gray-800 italic text-gray-600 text-xs">Incidental data captured. No high-res image.</div>
                  )}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-4 h-4 text-red-500 animate-pulse" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">{selectedAlertIndex === 0 ? "Latest Investigation" : "Archive Review"}</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-white/5 p-3 rounded-lg border border-white/5 shadow-inner">
                        <p className="text-xs text-white opacity-80 mb-2">{alerts[selectedAlertIndex].message}</p>
                        <div className="flex justify-between items-center bg-black/40 p-1.5 rounded">
                          <span className="text-[9px] text-gray-400 uppercase font-mono">Location Sector</span>
                          <span className="text-xs font-mono text-red-400 font-bold tracking-widest">{alerts[selectedAlertIndex].seat_number}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                         <button className="flex-1 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold py-2 rounded uppercase tracking-tighter transition-all hover:scale-[1.02]">Dispatch Security</button>
                         <button className="flex-1 bg-white/10 hover:bg-white/20 text-white text-[9px] font-bold py-2 rounded uppercase tracking-tighter transition-all">Export Log</button>
                      </div>
                    </div>
                  </div>
               </div>
             ) : (
               <div className="text-center text-gray-500 flex flex-col items-center gap-2">
                 <ShieldCheck className="w-8 h-8 opacity-20" />
                 <p className="text-xs">Monitoring active. Forensic capture engine ready.</p>
               </div>
             )}
          </div>
          <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-black/30">
            <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-400" /><h2 className="font-semibold text-gray-200 uppercase tracking-widest text-[10px]">Session Activity Log</h2></div>
            <button onClick={clearLogs} className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"><Trash2 className="w-3 h-3" /> Purge Records</button>
          </div>
          <div className="p-0 overflow-y-auto flex-1 bg-black/20">
             {alerts.length > 0 ? (
               <ul className="divide-y divide-gray-800/30 font-inter">
                 {alerts.map((alert, i) => (
                   <li key={i} onClick={() => setSelectedAlertIndex(i)} className={`px-5 py-3 hover:bg-indigo-600/10 transition-all cursor-pointer flex items-center gap-4 ${selectedAlertIndex === i ? 'bg-indigo-600/20 border-l-2 border-indigo-500' : ''}`}>
                     {alert.evidence_image ? (<div className="w-16 h-10 rounded border border-white/10 overflow-hidden flex-shrink-0"><img src={alert.evidence_image} className="w-full h-full object-cover grayscale-[50%]" alt="Thumb" /></div>) : (<div className="w-16 h-10 rounded bg-gray-900 border border-white/5 flex items-center justify-center flex-shrink-0"><ShieldAlert className="w-3 h-3 text-gray-700" /></div>)}
                     <div className="flex-1 min-w-0">
                       <div className="flex justify-between items-center mb-0.5"><p className={`text-[10px] font-bold uppercase tracking-tight ${selectedAlertIndex === i ? 'text-indigo-400' : 'text-gray-400'}`}>{alert.message}</p><span className="text-[9px] font-mono text-gray-500">{alert.timestamp}</span></div>
                       <p className="text-[11px] text-gray-500 truncate">Sector: <span className="text-gray-300">{alert.seat_number}</span> // Conf: <span className="text-gray-300">{alert.confidence}%</span></p>
                     </div>
                   </li>
                 ))}
               </ul>
             ) : (
               <div className="p-8 text-center text-gray-500 text-sm h-full flex flex-col items-center justify-center gap-3"><ShieldCheck className="w-10 h-10 opacity-20 mb-2" /><p className="font-medium text-gray-400">Database is empty.</p><p className="text-xs">Any devices recording for longer than 5 seconds will appear here permanently.</p></div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
