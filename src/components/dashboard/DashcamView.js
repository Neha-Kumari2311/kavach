'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { buildWhatsAppSOSLinks } from '@/lib/whatsappSOS';

// Gesture labels
const GESTURE_LABELS = ['Open', 'Close', 'Pointer', 'OK', 'SOS'];
const SOS_LABEL = 'SOS';
const SOS_HOLD_SECONDS = 3;
const SOS_COOLDOWN_SECONDS = 30;

// Hand-landmark indices
const THUMB_TIP = 4, THUMB_IP = 3, THUMB_MCP = 2;
const INDEX_TIP = 8, INDEX_DIP = 7, INDEX_PIP = 6, INDEX_MCP = 5;
const MIDDLE_TIP = 12, MIDDLE_PIP = 10;
const RING_TIP = 16, RING_PIP = 14;
const PINKY_TIP = 20, PINKY_PIP = 18;
const WRIST = 0;

function classifyGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;
  const isRightHand = landmarks[WRIST].x < landmarks[INDEX_MCP].x;
  const thumbExtended = isRightHand
    ? landmarks[THUMB_TIP].x > landmarks[THUMB_IP].x
    : landmarks[THUMB_TIP].x < landmarks[THUMB_IP].x;
  const indexExtended = landmarks[INDEX_TIP].y < landmarks[INDEX_PIP].y;
  const middleExtended = landmarks[MIDDLE_TIP].y < landmarks[MIDDLE_PIP].y;
  const ringExtended = landmarks[RING_TIP].y < landmarks[RING_PIP].y;
  const pinkyExtended = landmarks[PINKY_TIP].y < landmarks[PINKY_PIP].y;
  const extendedCount = [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;
  const thumbIndexDist = Math.hypot(landmarks[THUMB_TIP].x - landmarks[INDEX_TIP].x, landmarks[THUMB_TIP].y - landmarks[INDEX_TIP].y);

  if (thumbIndexDist < 0.06 && (middleExtended || ringExtended)) return { label: 'OK', index: 3, confidence: 0.85 };
  if (!thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended) return { label: 'SOS', index: 4, confidence: 0.92 };
  if (extendedCount >= 5) return { label: 'Open', index: 0, confidence: 0.90 };
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) return { label: 'Pointer', index: 2, confidence: 0.88 };
  if (extendedCount <= 1 && !indexExtended && !middleExtended) return { label: 'Close', index: 1, confidence: 0.87 };
  if (extendedCount >= 4) return { label: 'Open', index: 0, confidence: 0.6 };
  if (extendedCount <= 1) return { label: 'Close', index: 1, confidence: 0.6 };
  return { label: 'Open', index: 0, confidence: 0.4 };
}

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],[0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17],
];

function drawLandmarks(ctx, landmarks, width, height, gesture) {
  ctx.clearRect(0, 0, width, height);
  if (!landmarks || landmarks.length === 0) return;
  const isDANGER = gesture?.label === 'SOS';
  const lineColor = isDANGER ? '#ef4444' : '#8b47eb';
  const dotColor = isDANGER ? '#fca5a5' : '#c4b5fd';
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 3;
  for (const [i, j] of HAND_CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(landmarks[i].x * width, landmarks[i].y * height);
    ctx.lineTo(landmarks[j].x * width, landmarks[j].y * height);
    ctx.stroke();
  }
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    const radius = [4, 8, 12, 16, 20].includes(i) ? 6 : 4;
    ctx.beginPath();
    ctx.arc(lm.x * width, lm.y * height, radius, 0, 2 * Math.PI);
    ctx.fillStyle = dotColor;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export default function DashcamView() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const handLandmarkerRef = useRef(null);
  const animFrameRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [aiDetectionEnabled, setAiDetectionEnabled] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [currentGesture, setCurrentGesture] = useState(null);
  const [sosCountdown, setSosCountdown] = useState(null);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState('user');
  const [sosWhatsappLinks, setSosWhatsappLinks] = useState([]);
  const [sosSentContacts, setSosSentContacts] = useState(new Set());
  const [showSosModal, setShowSosModal] = useState(false);

  // Vehicle/Company session
  const [vehicleId, setVehicleId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);

  const recordingTimerRef = useRef(null);
  const sosStartRef = useRef(null);
  const sosCooldownRef = useRef(0);

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const initHandLandmarker = useCallback(async () => {
    if (handLandmarkerRef.current) return;
    setAiLoading(true);
    try {
      const vision = await import('@mediapipe/tasks-vision');
      const { HandLandmarker, FilesetResolver } = vision;
      const filesetResolver = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm');
      const handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' },
        runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: 0.6, minHandPresenceConfidence: 0.6, minTrackingConfidence: 0.5,
      });
      handLandmarkerRef.current = handLandmarker;
    } catch (err) {
      setError('Failed to load AI model. Please refresh.');
    } finally {
      setAiLoading(false);
    }
  }, []);

  const runDetection = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const handLandmarker = handLandmarkerRef.current;
    if (!video || !canvas || !handLandmarker || !aiDetectionEnabled || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(runDetection);
      return;
    }
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    try {
      const results = handLandmarker.detectForVideo(video, performance.now());
      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const gesture = classifyGesture(landmarks);
        drawLandmarks(ctx, landmarks, canvas.width, canvas.height, gesture);
        if (gesture) {
          setCurrentGesture(gesture);
          if (gesture.label === SOS_LABEL) {
            const currentTime = Date.now() / 1000;
            if (sosStartRef.current === null) sosStartRef.current = currentTime;
            const held = currentTime - sosStartRef.current;
            setSosCountdown(Math.max(0, SOS_HOLD_SECONDS - held).toFixed(1));
            if (held >= SOS_HOLD_SECONDS && (currentTime - sosCooldownRef.current) > SOS_COOLDOWN_SECONDS) {
              sosCooldownRef.current = currentTime;
              setSosCountdown(null);
              triggerSOS();
            }
          } else {
            sosStartRef.current = null;
            setSosCountdown(null);
          }
        }
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setCurrentGesture(null);
        sosStartRef.current = null;
        setSosCountdown(null);
      }
    } catch (err) {}
    animFrameRef.current = requestAnimationFrame(runDetection);
  }, [aiDetectionEnabled]);

  useEffect(() => {
    if (aiDetectionEnabled && cameraActive && handLandmarkerRef.current) {
      animFrameRef.current = requestAnimationFrame(runDetection);
    }
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [aiDetectionEnabled, cameraActive, runDetection]);

  const startCamera = useCallback(async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      if (err.name === 'NotAllowedError') setError('Camera permission denied.');
      else if (err.name === 'NotFoundError') setError('No camera found.');
      else setError('Failed to start camera: ' + err.message);
    }
  }, [facingMode]);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [cameraActive]);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false); setIsRecording(false); setRecordingDuration(0);
    setAiDetectionEnabled(false); setCurrentGesture(null); setSosCountdown(null);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  }, []);

  const switchCamera = useCallback(() => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (cameraActive) { stopCamera(); setTimeout(() => startCamera(), 300); }
  }, [facingMode, cameraActive, stopCamera, startCamera]);

  const toggleAI = useCallback(async (enabled) => {
    if (enabled) { await initHandLandmarker(); setAiDetectionEnabled(true); }
    else { setAiDetectionEnabled(false); setCurrentGesture(null); setSosCountdown(null); }
  }, [initHandLandmarker]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    try {
      recordedChunksRef.current = [];
      let options = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) options.mimeType = 'video/webm';
      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => { if (e.data?.size > 0) recordedChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `kavach-dashcam-${Date.now()}.webm`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      };
      mediaRecorder.start(1000);
      setIsRecording(true); setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch (err) { setError('Failed to start recording: ' + err.message); }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    setIsRecording(false); setRecordingDuration(0);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  }, []);

  const handleSosSendToContact = useCallback((link, index) => {
    window.open(link, '_blank');
    setSosSentContacts(prev => new Set(prev).add(index));
  }, []);

  const handleCloseSosModal = useCallback(() => {
    setShowSosModal(false); setSosWhatsappLinks([]); setSosSentContacts(new Set());
  }, []);

  const triggerSOS = useCallback(async () => {
    setSosTriggered(true);
    try {
      let latitude = 0, longitude = 0;
      try {
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 }));
        latitude = position.coords.latitude; longitude = position.coords.longitude;
      } catch (e) {}

      // Create incident for company if vehicle session active
      if (vehicleId && companyId) {
        try {
          await fetch('/api/incidents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vehicleId, companyId, latitude, longitude, gestureDetected: 'SOS' }),
          });
          console.log('[Dashcam] Incident reported to company:', companyId);
        } catch (incErr) {
          console.error('[Dashcam] Failed to create incident:', incErr);
        }
      }

      const response = await fetch('/api/sos/trigger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ latitude, longitude }) });
      const data = await response.json();
      if (data.contacts?.length > 0) {
        const result = buildWhatsAppSOSLinks(data.contacts, latitude, longitude, data.userName);
        setSosWhatsappLinks(result.links); setSosSentContacts(new Set()); setShowSosModal(true);
      } else { setError('No trusted contacts found.'); }
      setTimeout(() => setSosTriggered(false), 5000);
    } catch (err) { setSosTriggered(false); setError('SOS trigger failed.'); }
  }, [vehicleId, companyId]);

  useEffect(() => { return () => { stopCamera(); if (handLandmarkerRef.current) { handLandmarkerRef.current.close(); handLandmarkerRef.current = null; } }; }, [stopCamera]);

  const gestureColor = (label) => {
    switch (label) {
      case 'SOS': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'OK': return 'text-green-400 bg-green-500/20 border-green-500/30';
      default: return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0f] flex flex-col z-50">
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6C47FF] to-[#8B6AFF] flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">K</span>
          </div>
          <span className="text-white font-bold text-base">KAVACH</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-lg">person</span>
        </div>
      </div>

      {/* Video Feed Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden mx-3 rounded-2xl">
        <canvas ref={captureCanvasRef} className="hidden" />

        {!cameraActive ? (
          <div className="flex flex-col items-center gap-5 px-6 text-center w-full h-full justify-center bg-gradient-to-br from-slate-900 to-[#1a0a3e] rounded-2xl py-8">
            <div className="w-16 h-16 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-white/40 text-3xl">videocam</span>
            </div>
            <div>
              <h2 className="text-white text-lg font-bold mb-1">Dashcam Mode</h2>
              <p className="text-white/50 text-xs max-w-xs">AI-powered gesture detection for automatic SOS. Enter vehicle details to link with fleet company.</p>
            </div>

            {/* Vehicle ID & Company ID inputs */}
            <div className="w-full max-w-xs space-y-3">
              <input
                type="text"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value.toUpperCase())}
                placeholder="Vehicle ID (e.g. MH01AB1234)"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/50 focus:border-[#6C47FF]"
              />
              <input
                type="text"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                placeholder="Company ID (e.g. OLA-FLEET-001)"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#6C47FF]/50 focus:border-[#6C47FF]"
              />
              <p className="text-white/30 text-[9px]">Found on the vehicle&apos;s KAVACH sticker or provided by your fleet operator</p>
            </div>

            <button
              onClick={() => { setSessionStarted(true); startCamera(); }}
              disabled={!vehicleId.trim() || !companyId.trim()}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#6C47FF] to-[#8B6AFF] text-white font-bold shadow-lg shadow-purple-500/30 active:scale-95 transition-transform flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">videocam</span>
              Start Dashcam
            </button>
            
            <button
              onClick={startCamera}
              className="text-white/40 text-xs hover:text-white/70 transition-colors"
            >
              Skip (personal use without company)
            </button>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 max-w-xs">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10 rounded-2xl" />

            {/* REC indicator */}
            {isRecording && (
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                <span className="text-white text-xs font-mono font-bold">REC {formatDuration(recordingDuration)}</span>
              </div>
            )}

            {/* Resolution badge */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
              <span className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-[10px] text-white font-bold">1080P | 60FPS</span>
            </div>

            {/* GPS coords */}
            <div className="absolute bottom-3 left-3 z-20 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
              <p className="text-[9px] text-white/60 font-medium">GPS COORDS</p>
              <p className="text-[10px] text-white font-bold">28.6139° N, 77.2090° E</p>
            </div>

            {/* AI gesture indicator */}
            {aiDetectionEnabled && currentGesture && (
              <div className={`absolute top-12 right-3 z-20 px-3 py-1.5 rounded-full border backdrop-blur-sm ${gestureColor(currentGesture.label)}`}>
                <span className="text-xs font-bold">{currentGesture.label}</span>
              </div>
            )}

            {aiLoading && (
              <div className="absolute inset-0 z-30 bg-black/50 flex items-center justify-center rounded-2xl">
                <span className="material-symbols-outlined text-[#6C47FF] text-4xl animate-spin">neurology</span>
              </div>
            )}

            {sosCountdown !== null && (
              <div className="absolute inset-x-4 bottom-16 z-20 flex justify-center">
                <div className="bg-red-500/90 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center gap-3 shadow-lg animate-pulse">
                  <span className="material-symbols-outlined text-white text-2xl">emergency</span>
                  <div>
                    <p className="text-white font-bold text-sm">SOS in {sosCountdown}s</p>
                    <p className="text-white/80 text-[10px]">Hold gesture to confirm</p>
                  </div>
                </div>
              </div>
            )}

            {currentGesture?.label === 'SOS' && (
              <div className="absolute inset-0 border-4 border-red-500 z-10 pointer-events-none animate-pulse rounded-2xl" />
            )}
          </>
        )}
      </div>

      {/* Control Center */}
      {cameraActive && (
        <div className="relative z-20 px-4 pt-4 pb-6 space-y-4">
          {/* Control Center Card */}
          <div className="bg-[#1a1a24] rounded-2xl p-4 border border-slate-800">
            <h3 className="text-white font-bold text-base mb-3">Control Center</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                  isRecording
                    ? 'bg-red-500 text-white'
                    : 'bg-[#6C47FF] text-white'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{isRecording ? 'stop_circle' : 'radio_button_checked'}</span>
                {isRecording ? 'Stop Rec' : 'Record'}
              </button>
              
              <button
                onClick={switchCamera}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 text-white/70 font-bold text-sm active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-lg">photo_camera</span>
                Snapshot
              </button>

              <button
                onClick={triggerSOS}
                disabled={sosTriggered}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#6C47FF] text-white font-bold text-sm active:scale-95 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">emergency_share</span>
                SOS Clip
              </button>

              <button
                onClick={() => toggleAI(!aiDetectionEnabled)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all ${
                  aiDetectionEnabled ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400' : 'bg-slate-800 text-white/70'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{aiDetectionEnabled ? 'mic_off' : 'mic'}</span>
                {aiDetectionEnabled ? 'AI On' : 'Mute'}
              </button>
            </div>
          </div>

          {/* Cloud Backup */}
          <div className="bg-[#1a1a24] rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-lg">cloud_upload</span>
                <span className="text-white font-bold text-sm">Cloud Backup</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 bg-emerald-400/10 rounded">Secure</span>
            </div>
            <p className="text-white/50 text-xs mb-2">Backing up to secure cloud...</p>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#6C47FF] to-[#8B6AFF] rounded-full" style={{ width: '67%' }}></div>
            </div>
          </div>

          {/* Storage Usage */}
          <div className="bg-[#1a1a24] rounded-2xl p-4 border border-slate-800 flex items-center gap-4">
            <div className="relative w-16 h-16">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#2d2d3a" strokeWidth="6" />
                <circle cx="32" cy="32" r="26" fill="none" stroke="#8B6AFF" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={`${0.67 * 163.4} 163.4`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white/50 font-bold">Used</span>
            </div>
            <div>
              <p className="text-white/50 text-xs">Occupied</p>
              <p className="text-white/30 text-[10px]">Total Capacity</p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav for non-camera state */}
      {!cameraActive && (
        <nav className="relative z-20 bg-[#1a1a24] border-t border-slate-800 px-4 py-3">
          <div className="max-w-md mx-auto flex items-center justify-around">
            <button onClick={() => router.push('/user/dashboard')} className="flex flex-col items-center gap-0.5 text-white/40">
              <span className="material-symbols-outlined text-xl">home</span>
              <span className="text-[9px]">Home</span>
            </button>
            <div className="flex flex-col items-center gap-0.5 text-[#6C47FF]">
              <span className="material-symbols-outlined text-xl fill-1">videocam</span>
              <span className="text-[9px] font-bold">Cam</span>
            </div>
            <button onClick={triggerSOS} className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 -mt-4">
              <span className="material-symbols-outlined text-white text-xl">sos</span>
            </button>
            <button onClick={() => router.push('/user/predict')} className="flex flex-col items-center gap-0.5 text-white/40">
              <span className="material-symbols-outlined text-xl">insights</span>
              <span className="text-[9px]">AI</span>
            </button>
            <button onClick={() => router.push('/user/settings')} className="flex flex-col items-center gap-0.5 text-white/40">
              <span className="material-symbols-outlined text-xl">person</span>
              <span className="text-[9px]">Profile</span>
            </button>
          </div>
        </nav>
      )}

      {/* Footer */}
      {cameraActive && (
        <div className="relative z-20 px-4 pb-4 pt-2 text-center">
          <p className="text-[9px] text-white/30">© 2024 KAVACH Security. All rights reserved.</p>
          <div className="flex items-center justify-center gap-3 mt-1 text-[9px] text-white/30">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Help Center</span>
          </div>
        </div>
      )}

      {/* WhatsApp SOS Modal */}
      {showSosModal && sosWhatsappLinks.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-t-3xl w-full max-w-md shadow-2xl p-6 pb-10 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">📲 Send SOS</h3>
              <button onClick={handleCloseSosModal} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                <span className="material-symbols-outlined text-slate-500">close</span>
              </button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {sosWhatsappLinks.map((contact, i) => {
                const isSent = sosSentContacts.has(i);
                return (
                  <button key={i} onClick={() => handleSosSendToContact(contact.link, i)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all active:scale-[0.98] ${isSent ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-green-400'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSent ? 'bg-green-500' : 'bg-[#25D366]'}`}>
                      {isSent ? <span className="material-symbols-outlined text-white">check</span> : <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-bold text-sm ${isSent ? 'text-green-700' : 'text-slate-900 dark:text-white'}`}>{contact.name}</p>
                      <p className="text-xs text-slate-500">{contact.phone}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isSent ? 'bg-green-100 text-green-700' : 'bg-[#25D366]/10 text-[#25D366]'}`}>
                      {isSent ? '✓ Opened' : 'Send →'}
                    </span>
                  </button>
                );
              })}
            </div>
            <button onClick={handleCloseSosModal} className="w-full mt-4 py-3 rounded-xl font-bold text-white bg-slate-400 hover:bg-slate-500">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
