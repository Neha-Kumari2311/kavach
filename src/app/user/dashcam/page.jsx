'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { buildWhatsAppSOSLinks } from '@/lib/whatsappSOS';

// Gesture detection (simplified — same classifyGesture from DashcamView)
const SOS_HOLD_SECONDS = 3;
const SOS_COOLDOWN_SECONDS = 30;

function classifyGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;
  const WRIST = 0, INDEX_MCP = 5, THUMB_TIP = 4, THUMB_IP = 3;
  const INDEX_TIP = 8, INDEX_PIP = 6, MIDDLE_TIP = 12, MIDDLE_PIP = 10;
  const RING_TIP = 16, RING_PIP = 14, PINKY_TIP = 20, PINKY_PIP = 18;

  const isRightHand = landmarks[WRIST].x < landmarks[INDEX_MCP].x;
  const thumbExtended = isRightHand ? landmarks[THUMB_TIP].x > landmarks[THUMB_IP].x : landmarks[THUMB_TIP].x < landmarks[THUMB_IP].x;
  const indexExtended = landmarks[INDEX_TIP].y < landmarks[INDEX_PIP].y;
  const middleExtended = landmarks[MIDDLE_TIP].y < landmarks[MIDDLE_PIP].y;
  const ringExtended = landmarks[RING_TIP].y < landmarks[RING_PIP].y;
  const pinkyExtended = landmarks[PINKY_TIP].y < landmarks[PINKY_PIP].y;

  // SOS: thumb tucked, 4 fingers up
  if (!thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended) {
    return { label: 'SOS', confidence: 0.92 };
  }
  return null;
}

export default function DashcamPage() {
  const [vehicleNo, setVehicleNo] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [error, setError] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const sosStartRef = useRef(null);
  const sosCooldownRef = useRef(0);

  // Start camera + AI detection
  const startDashcam = useCallback(async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      setCameraActive(true);

      // Load AI model FIRST, then start detection
      const vision = await import('@mediapipe/tasks-vision');
      const { HandLandmarker, FilesetResolver } = vision;
      const filesetResolver = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
      const handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' },
        runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.5, minTrackingConfidence: 0.4,
      });
      handLandmarkerRef.current = handLandmarker;
      console.log('[Dashcam] AI model loaded successfully');
    } catch (err) {
      console.error('[Dashcam] Error:', err);
      setError(err.name === 'NotAllowedError' ? 'Camera permission denied.' : 'Failed to start: ' + err.message);
    }
  }, []);

  // Attach stream to video AND start detection loop once model is ready
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  // Detection loop — runs continuously when camera is active
  useEffect(() => {
    if (!cameraActive) return;

    const detect = () => {
      const video = videoRef.current;
      const handLandmarker = handLandmarkerRef.current;

      if (!video || !handLandmarker || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const results = handLandmarker.detectForVideo(video, performance.now());
        if (results.landmarks?.length > 0) {
          const gesture = classifyGesture(results.landmarks[0]);
          if (gesture?.label === 'SOS') {
            const now = Date.now() / 1000;
            if (sosStartRef.current === null) sosStartRef.current = now;
            const held = now - sosStartRef.current;
            if (held >= SOS_HOLD_SECONDS && (now - sosCooldownRef.current) > SOS_COOLDOWN_SECONDS) {
              sosCooldownRef.current = now;
              triggerSOS();
            }
          } else {
            sosStartRef.current = null;
          }
        } else {
          sosStartRef.current = null;
        }
      } catch (e) {}

      animFrameRef.current = requestAnimationFrame(detect);
    };

    // Wait a bit for model to load then start loop
    const timer = setTimeout(() => {
      animFrameRef.current = requestAnimationFrame(detect);
    }, 2000);

    return () => {
      clearTimeout(timer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cameraActive]);

  // Stop dashcam
  const stopDashcam = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (handLandmarkerRef.current) { handLandmarkerRef.current.close(); handLandmarkerRef.current = null; }
    setCameraActive(false);
  }, []);

  const [sosMessage, setSosMessage] = useState('');

  // Trigger SOS + create incident
  const triggerSOS = useCallback(async () => {
    if (sosTriggered) return;
    setSosTriggered(true);
    setSosMessage('');
    try {
      let latitude = 0, longitude = 0;
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
        latitude = pos.coords.latitude; longitude = pos.coords.longitude;
      } catch (e) {}

      // Report incident to company
      if (vehicleNo && companyId) {
        await fetch('/api/incidents', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicleId: vehicleNo, companyId, latitude, longitude, gestureDetected: 'SOS' }),
        });
      }

      // Trigger WhatsApp SOS — auto-open WhatsApp links
      const sosRes = await fetch('/api/sos/trigger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ latitude, longitude }) });
      const sosData = await sosRes.json();

      if (sosData.contacts?.length > 0) {
        // Build emergency message
        const mapLink = latitude ? `https://maps.google.com/?q=${latitude},${longitude}` : '';
        const userName = sosData.userName || 'User';
        const emergencyMsg = `🚨 EMERGENCY SOS from ${userName}!\n\nI need immediate help!\n${mapLink ? '\n📍 My location:\n' + mapLink : ''}\n\nSent via KAVACH Safety`;

        // Open WhatsApp for first contact immediately (this works because it's in response to gesture detection)
        const firstPhone = sosData.contacts[0].phone.replace(/[^0-9+]/g, '');
        const firstWhatsapp = `https://wa.me/${firstPhone.startsWith('+') ? firstPhone.slice(1) : '91' + firstPhone}?text=${encodeURIComponent(emergencyMsg)}`;
        
        // Use location.href for first (won't be blocked)
        window.open(firstWhatsapp, '_blank');

        // Store links for remaining contacts to show as buttons
        const remainingLinks = sosData.contacts.slice(1).map(contact => {
          const phone = contact.phone.replace(/[^0-9+]/g, '');
          return {
            name: contact.name,
            phone: contact.phone,
            whatsapp: `https://wa.me/${phone.startsWith('+') ? phone.slice(1) : '91' + phone}?text=${encodeURIComponent(emergencyMsg)}`,
            sms: `sms:${phone}?body=${encodeURIComponent(emergencyMsg)}`,
          };
        });

        if (remainingLinks.length > 0) {
          // Try to open rest with delays (may be blocked by popup blocker)
          remainingLinks.forEach((link, i) => {
            setTimeout(() => { try { window.open(link.whatsapp, '_blank'); } catch(e){} }, (i + 1) * 2000);
          });
        }

        setSosMessage(`✅ WhatsApp opened for ${sosData.contacts.length} contact(s). Company notified. Check for popup blocker if links didn't open.`);
      } else {
        setSosMessage('⚠️ Company notified. No trusted contacts found — add contacts in Contacts tab.');
      }

      setTimeout(() => setSosTriggered(false), 10000);
    } catch (err) {
      setSosMessage('❌ Failed to send SOS. Check internet connection.');
      setTimeout(() => setSosTriggered(false), 5000);
    }
  }, [vehicleNo, companyId, sosTriggered]);

  // Cleanup
  useEffect(() => { return () => stopDashcam(); }, [stopDashcam]);

  // ═══ Fullscreen Camera View ═══
  if (cameraActive) {
    return (
      <div className="fixed inset-0 bg-black z-[100] flex flex-col">
        {/* Fullscreen video */}
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {/* SOS triggered overlay */}
        {sosTriggered && (
          <div className="absolute inset-0 border-4 border-red-500 animate-pulse z-20 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500/90 backdrop-blur-sm rounded-2xl px-8 py-5 text-center max-w-xs">
              <span className="material-symbols-outlined text-white text-4xl">emergency</span>
              <p className="text-white font-bold text-lg mt-2">🚨 SOS TRIGGERED</p>
              <p className="text-white/90 text-xs mt-2">{sosMessage || 'Processing alert...'}</p>
            </div>
          </div>
        )}

        {/* Vehicle info badge */}
        <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
          <p className="text-[9px] text-white/60">Vehicle: <span className="text-white font-bold">{vehicleNo}</span></p>
          <p className="text-[9px] text-white/60">Company: <span className="text-white font-bold">{companyId}</span></p>
        </div>

        {/* AI Active badge */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-[#6C47FF]/80 backdrop-blur-sm rounded-full px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
          <span className="text-[10px] text-white font-bold">AI Monitoring</span>
        </div>

        {/* Stop button */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={stopDashcam}
            className="px-8 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-2xl shadow-red-500/40 active:scale-95 transition-transform flex items-center gap-2"
          >
            <span className="material-symbols-outlined">stop_circle</span>
            Stop Dashcam
          </button>
        </div>
      </div>
    );
  }

  // ═══ Setup Form (within shared layout) ═══
  return (
    <div className="px-4 max-w-2xl mx-auto w-full space-y-6 pt-6 pb-4">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-[#6C47FF]/10 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[#6C47FF] text-3xl">videocam</span>
        </div>
        <h1 className="text-2xl font-extrabold">AI Dashcam</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Enter the vehicle details below. The AI will monitor for distress gestures and automatically alert the fleet company.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Vehicle No</label>
          <input
            type="text"
            value={vehicleNo}
            onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
            placeholder="e.g. MH01AB1234"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF] outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company ID</label>
          <input
            type="text"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            placeholder="e.g. OLA-FLEET-001"
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-[#6C47FF]/30 focus:border-[#6C47FF] outline-none"
          />
          <p className="text-[10px] text-slate-400">Found on the vehicle&apos;s KAVACH sticker or from your fleet operator</p>
        </div>

        <button
          onClick={startDashcam}
          disabled={!vehicleNo.trim() || !companyId.trim()}
          className="w-full py-3.5 bg-gradient-to-r from-[#6C47FF] to-[#8B6AFF] text-white font-bold rounded-xl shadow-lg shadow-[#6C47FF]/25 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">videocam</span>
          Start AI Dashcam
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500 text-lg">error</span>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Test Vehicles */}
      <div className="bg-[#6C47FF]/5 border border-[#6C47FF]/20 rounded-xl p-4">
        <h3 className="text-xs font-bold text-[#6C47FF] mb-2">🧪 Test with sample data</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { v: 'MH01AB1234', c: 'OLA-FLEET-001', label: 'Ola Mumbai' },
            { v: 'DL03CD5678', c: 'UBER-FLEET-002', label: 'Uber Delhi' },
            { v: 'KA05EF9012', c: 'RAPIDO-BLR-003', label: 'Rapido Bangalore' },
            { v: 'TN07GH3456', c: 'OLA-FLEET-004', label: 'Ola Chennai' },
          ].map((item) => (
            <button
              key={item.v}
              onClick={() => { setVehicleNo(item.v); setCompanyId(item.c); }}
              className="text-left px-3 py-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[#6C47FF]/40 transition-colors"
            >
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{item.label}</p>
              <p className="text-[9px] text-slate-400">{item.v} • {item.c}</p>
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
        <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">How it works</h3>
        <ol className="text-[10px] text-slate-500 space-y-1.5 list-decimal list-inside">
          <li>Enter the vehicle number and company ID (or tap a sample above)</li>
          <li>Camera opens fullscreen with AI monitoring</li>
          <li>Show the SOS gesture (4 fingers up, thumb tucked) for 3 seconds</li>
          <li>Alert is automatically sent to the fleet company + your emergency contacts</li>
        </ol>
      </div>
    </div>
  );
}
