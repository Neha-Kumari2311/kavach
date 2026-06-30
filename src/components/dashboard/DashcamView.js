'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { buildWhatsAppSOSLinks } from '@/lib/whatsappSOS';

// ──────────────────────────────────────────────────────────────
// Gesture labels — must match ai-backend/model/keypoint_classifier_label.csv
// ──────────────────────────────────────────────────────────────
const GESTURE_LABELS = ['Open', 'Close', 'Pointer', 'OK', 'SOS'];
const SOS_LABEL = 'SOS';
const SOS_HOLD_SECONDS = 3;
const SOS_COOLDOWN_SECONDS = 30;

// ──────────────────────────────────────────────────────────────
// Hand-landmark indices (MediaPipe 21-point model)
// ──────────────────────────────────────────────────────────────
const THUMB_TIP = 4, THUMB_IP = 3, THUMB_MCP = 2;
const INDEX_TIP = 8, INDEX_DIP = 7, INDEX_PIP = 6, INDEX_MCP = 5;
const MIDDLE_TIP = 12, MIDDLE_PIP = 10;
const RING_TIP = 16, RING_PIP = 14;
const PINKY_TIP = 20, PINKY_PIP = 18;
const WRIST = 0;

// ──────────────────────────────────────────────────────────────
// Heuristic gesture classifier using finger states
// Replaces the TFLite model with a reliable geometric approach
// ──────────────────────────────────────────────────────────────
function classifyGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;

  // Determine handedness from wrist-to-middle-MCP direction
  const isRightHand = landmarks[WRIST].x < landmarks[INDEX_MCP].x;

  // Check if each finger is extended
  const thumbExtended = isRightHand
    ? landmarks[THUMB_TIP].x > landmarks[THUMB_IP].x
    : landmarks[THUMB_TIP].x < landmarks[THUMB_IP].x;

  const indexExtended = landmarks[INDEX_TIP].y < landmarks[INDEX_PIP].y;
  const middleExtended = landmarks[MIDDLE_TIP].y < landmarks[MIDDLE_PIP].y;
  const ringExtended = landmarks[RING_TIP].y < landmarks[RING_PIP].y;
  const pinkyExtended = landmarks[PINKY_TIP].y < landmarks[PINKY_PIP].y;

  const extendedCount = [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended]
    .filter(Boolean).length;

  // Check thumb-index proximity for OK gesture
  const thumbIndexDist = Math.hypot(
    landmarks[THUMB_TIP].x - landmarks[INDEX_TIP].x,
    landmarks[THUMB_TIP].y - landmarks[INDEX_TIP].y
  );

  // ── Classify ──

  // OK: thumb tip touching index tip, other fingers may be extended
  if (thumbIndexDist < 0.06 && (middleExtended || ringExtended)) {
    return { label: 'OK', index: 3, confidence: 0.85 };
  }

  // SOS / Signal for Help: four fingers up, thumb tucked in
  // International "Signal for Help" — palm open, thumb folded into palm
  if (!thumbExtended && indexExtended && middleExtended && ringExtended && pinkyExtended) {
    return { label: 'SOS', index: 4, confidence: 0.92 };
  }

  // Open: all five fingers extended
  if (extendedCount >= 5) {
    return { label: 'Open', index: 0, confidence: 0.90 };
  }

  // Pointer: only index finger extended
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return { label: 'Pointer', index: 2, confidence: 0.88 };
  }

  // Close (fist): no fingers extended
  if (extendedCount <= 1 && !indexExtended && !middleExtended) {
    return { label: 'Close', index: 1, confidence: 0.87 };
  }

  // Fallback — return the most likely based on finger count
  if (extendedCount >= 4) return { label: 'Open', index: 0, confidence: 0.6 };
  if (extendedCount <= 1) return { label: 'Close', index: 1, confidence: 0.6 };

  return { label: 'Open', index: 0, confidence: 0.4 };
}

// ──────────────────────────────────────────────────────────────
// Draw landmarks on canvas overlay
// ──────────────────────────────────────────────────────────────
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],       // thumb
  [0,5],[5,6],[6,7],[7,8],       // index
  [0,9],[9,10],[10,11],[11,12],  // middle
  [0,13],[13,14],[14,15],[15,16],// ring
  [0,17],[17,18],[18,19],[19,20],// pinky
  [5,9],[9,13],[13,17],          // palm
];

function drawLandmarks(ctx, landmarks, width, height, gesture) {
  ctx.clearRect(0, 0, width, height);
  if (!landmarks || landmarks.length === 0) return;

  const isDANGER = gesture?.label === 'SOS';
  const lineColor = isDANGER ? '#ef4444' : '#8b47eb';
  const dotColor = isDANGER ? '#fca5a5' : '#c4b5fd';

  // Draw connections
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 3;
  for (const [i, j] of HAND_CONNECTIONS) {
    const a = landmarks[i];
    const b = landmarks[j];
    ctx.beginPath();
    ctx.moveTo(a.x * width, a.y * height);
    ctx.lineTo(b.x * width, b.y * height);
    ctx.stroke();
  }

  // Draw points
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    const isTip = [4, 8, 12, 16, 20].includes(i);
    const radius = isTip ? 6 : 4;
    ctx.beginPath();
    ctx.arc(lm.x * width, lm.y * height, radius, 0, 2 * Math.PI);
    ctx.fillStyle = dotColor;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// ══════════════════════════════════════════════════════════════
// DashcamView Component
// ══════════════════════════════════════════════════════════════
export default function DashcamView() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);             // for landmark drawing
  const captureCanvasRef = useRef(null);      // hidden canvas for frame capture
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

  // WhatsApp SOS modal state
  const [sosWhatsappLinks, setSosWhatsappLinks] = useState([]);
  const [sosSentContacts, setSosSentContacts] = useState(new Set());
  const [showSosModal, setShowSosModal] = useState(false);

  const recordingTimerRef = useRef(null);
  const sosStartRef = useRef(null);
  const sosCooldownRef = useRef(0);
  const lastGestureRef = useRef(null);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Initialize MediaPipe HandLandmarker ──
  const initHandLandmarker = useCallback(async () => {
    if (handLandmarkerRef.current) return;
    setAiLoading(true);
    try {
      const vision = await import('@mediapipe/tasks-vision');
      const { HandLandmarker, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      const handLandmarker = await HandLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });

      handLandmarkerRef.current = handLandmarker;
      console.log('[Dashcam] MediaPipe HandLandmarker initialized');
    } catch (err) {
      console.error('[Dashcam] MediaPipe init error:', err);
      setError('Failed to load AI model. Please refresh and try again.');
    } finally {
      setAiLoading(false);
    }
  }, []);

  // ── Detection loop using requestAnimationFrame ──
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

    const now = performance.now();

    try {
      const results = handLandmarker.detectForVideo(video, now);

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const gesture = classifyGesture(landmarks);

        drawLandmarks(ctx, landmarks, canvas.width, canvas.height, gesture);

        if (gesture) {
          setCurrentGesture(gesture);
          lastGestureRef.current = gesture;

          // ── SOS hold detection ──
          if (gesture.label === SOS_LABEL) {
            const currentTime = Date.now() / 1000;

            if (sosStartRef.current === null) {
              sosStartRef.current = currentTime;
            }

            const held = currentTime - sosStartRef.current;
            const remaining = Math.max(0, SOS_HOLD_SECONDS - held);
            setSosCountdown(remaining.toFixed(1));

            if (held >= SOS_HOLD_SECONDS && (currentTime - sosCooldownRef.current) > SOS_COOLDOWN_SECONDS) {
              sosCooldownRef.current = currentTime;
              setSosTriggered(true);
              setSosCountdown(null);
              triggerSOS();
            }
          } else {
            sosStartRef.current = null;
            setSosCountdown(null);
          }
        }
      } else {
        // No hand detected
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setCurrentGesture(null);
        sosStartRef.current = null;
        setSosCountdown(null);
      }
    } catch (err) {
      // Silently continue — frame may have been skipped
    }

    animFrameRef.current = requestAnimationFrame(runDetection);
  }, [aiDetectionEnabled]);

  // ── Start/stop detection loop ──
  useEffect(() => {
    if (aiDetectionEnabled && cameraActive && handLandmarkerRef.current) {
      animFrameRef.current = requestAnimationFrame(runDetection);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [aiDetectionEnabled, cameraActive, runDetection]);

  // ── Start camera ──
  const startCamera = useCallback(async () => {
    try {
      setError('');
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      console.error('[Dashcam] Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please connect a camera and try again.');
      } else {
        setError('Failed to start camera: ' + err.message);
      }
    }
  }, [facingMode]);

  // Attach stream to video element after it renders
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraActive]);

  // ── Stop camera ──
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsRecording(false);
    setRecordingDuration(0);
    setAiDetectionEnabled(false);
    setCurrentGesture(null);
    setSosCountdown(null);
    sosStartRef.current = null;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  }, []);

  // ── Switch camera ──
  const switchCamera = useCallback(() => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(), 300);
    }
  }, [facingMode, cameraActive, stopCamera, startCamera]);

  // ── Toggle AI detection ──
  const toggleAI = useCallback(async (enabled) => {
    if (enabled) {
      await initHandLandmarker();
      setAiDetectionEnabled(true);
    } else {
      setAiDetectionEnabled(false);
      setCurrentGesture(null);
      setSosCountdown(null);
      sosStartRef.current = null;
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, [initHandLandmarker]);

  // ── Start recording ──
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    try {
      recordedChunksRef.current = [];
      const options = { mimeType: 'video/webm;codecs=vp9' };

      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }

      const mediaRecorder = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kavach-dashcam-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('[Dashcam] Recording error:', err);
      setError('Failed to start recording: ' + err.message);
    }
  }, []);

  // ── Stop recording ──
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingDuration(0);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  // ── Handle sending to a single contact via WhatsApp modal ──
  const handleSosSendToContact = useCallback((link, index) => {
    window.open(link, '_blank');
    setSosSentContacts((prev) => new Set(prev).add(index));
  }, []);

  // ── Close SOS modal ──
  const handleCloseSosModal = useCallback(() => {
    setShowSosModal(false);
    setSosWhatsappLinks([]);
    setSosSentContacts(new Set());
  }, []);

  // ── Trigger SOS via API + WhatsApp ──
  const triggerSOS = useCallback(async () => {
    try {
      let latitude = 0, longitude = 0;

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (geoErr) {
        console.warn('[Dashcam] Could not get location for SOS:', geoErr.message);
      }

      const response = await fetch('/api/sos/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });

      const data = await response.json();
      console.log('[Dashcam] SOS result:', JSON.stringify(data));

      // Build WhatsApp links for each contact and show modal
      if (data.contacts && data.contacts.length > 0) {
        const result = buildWhatsAppSOSLinks(data.contacts, latitude, longitude, data.userName);
        console.log('[Dashcam] WhatsApp links:', result.links.length);

        // Show the contact list modal (same as dashboard SOS)
        setSosWhatsappLinks(result.links);
        setSosSentContacts(new Set());
        setShowSosModal(true);
      } else {
        console.warn('[Dashcam] No contacts found for SOS');
        setError('No trusted contacts found. Add contacts from Dashboard.');
      }

      setTimeout(() => {
        setSosTriggered(false);
      }, 5000);
    } catch (err) {
      console.error('[Dashcam] SOS trigger error:', err);
      setSosTriggered(false);
      setError('SOS trigger failed: ' + err.message);
    }
  }, []);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      stopCamera();
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, [stopCamera]);

  // ── Gesture color helper ──
  const gestureColor = (label) => {
    switch (label) {
      case 'SOS': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'OK': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'Pointer': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'Open': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      case 'Close': return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
      default: return 'text-white/50 bg-white/10 border-white/20';
    }
  };

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="relative z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={() => { stopCamera(); router.back(); }}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-white">arrow_back</span>
        </button>

        <h1 className="text-white font-bold text-lg">Dashcam</h1>

        <button
          onClick={switchCamera}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center"
          disabled={!cameraActive}
        >
          <span className="material-symbols-outlined text-white">cameraswitch</span>
        </button>
      </div>

      {/* Video Feed */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* Hidden canvas for frame capture */}
        <canvas ref={captureCanvasRef} className="hidden" />

        {!cameraActive ? (
          <div className="flex flex-col items-center gap-6 px-8 text-center">
            <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-white/40 text-5xl">
                videocam
              </span>
            </div>
            <div>
              <h2 className="text-white text-xl font-bold mb-2">Dashcam Mode</h2>
              <p className="text-white/50 text-sm max-w-xs">
                Record video evidence and enable AI-powered gesture detection for automatic SOS alerts.
              </p>
            </div>
            <button
              onClick={startCamera}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#8b47eb] to-[#6d28d9] text-white font-bold shadow-lg shadow-purple-500/30 active:scale-95 transition-transform flex items-center gap-2"
            >
              <span className="material-symbols-outlined">videocam</span>
              Start Camera
            </button>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 max-w-xs">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Video element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Canvas overlay for drawing hand landmarks */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
            />

            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                </span>
                <span className="text-white text-sm font-mono font-bold">
                  REC {formatDuration(recordingDuration)}
                </span>
              </div>
            )}

            {/* AI Detection Status Badge */}
            {aiDetectionEnabled && (
              <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
                {/* Gesture label */}
                {currentGesture ? (
                  <div className={`flex items-center gap-2 backdrop-blur-sm rounded-full px-4 py-2 border ${gestureColor(currentGesture.label)}`}>
                    <span className="material-symbols-outlined text-lg">
                      {currentGesture.label === 'SOS' ? 'warning' :
                       currentGesture.label === 'OK' ? 'check_circle' :
                       currentGesture.label === 'Pointer' ? 'touch_app' :
                       currentGesture.label === 'Open' ? 'back_hand' :
                       'front_hand'}
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-bold block">{currentGesture.label}</span>
                      <span className="text-[10px] opacity-70">
                        {Math.round(currentGesture.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                    <span className="material-symbols-outlined text-white/50 text-lg animate-pulse">
                      pan_tool
                    </span>
                    <span className="text-white/50 text-xs font-medium">
                      Show hand...
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* AI Loading overlay */}
            {aiLoading && (
              <div className="absolute inset-0 z-30 bg-black/50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-[#8b47eb] text-4xl animate-spin">
                    neurology
                  </span>
                  <span className="text-white text-sm font-medium">Loading AI model...</span>
                </div>
              </div>
            )}

            {/* SOS Countdown overlay */}
            {sosCountdown !== null && (
              <div className="absolute inset-x-4 bottom-48 z-20 flex justify-center">
                <div className="bg-red-500/90 backdrop-blur-sm rounded-2xl px-6 py-4 flex items-center gap-4 shadow-lg shadow-red-500/40 animate-pulse">
                  <span className="material-symbols-outlined text-white text-3xl">
                    emergency
                  </span>
                  <div>
                    <p className="text-white font-bold text-lg">SOS in {sosCountdown}s</p>
                    <p className="text-white/80 text-xs">Hold gesture to confirm...</p>
                  </div>
                  {/* Countdown bar */}
                  <div className="w-16 h-16 relative">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15.5" fill="none"
                        stroke="white" strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={`${((SOS_HOLD_SECONDS - parseFloat(sosCountdown)) / SOS_HOLD_SECONDS) * 97.4} 97.4`}
                      />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* SOS Triggered Banner */}
            {sosTriggered && (
              <div className="absolute inset-x-4 top-20 z-30">
                <div className="bg-red-500/90 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-red-500/30">
                  <span className="material-symbols-outlined text-white text-3xl">
                    emergency
                  </span>
                  <div>
                    <p className="text-white font-bold">🚨 SOS Alert Sent!</p>
                    <p className="text-white/80 text-xs">
                      Emergency contacts have been notified with your location.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Danger overlay border */}
            {currentGesture?.label === 'SOS' && (
              <div className="absolute inset-0 border-4 border-red-500 z-10 pointer-events-none animate-pulse" />
            )}
          </>
        )}
      </div>

      {/* Bottom Controls */}
      {cameraActive && (
        <div className="relative z-20 bg-gradient-to-t from-black/90 to-transparent pt-8 pb-8 px-4">
          {/* AI Detection Toggle */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <label className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-full px-5 py-2.5 cursor-pointer">
              <span className={`material-symbols-outlined text-lg ${aiDetectionEnabled ? 'text-[#8b47eb]' : 'text-white/40'}`}>
                neurology
              </span>
              <span className="text-white text-sm font-medium">AI Gesture Detection</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={aiDetectionEnabled}
                  onChange={(e) => toggleAI(e.target.checked)}
                  disabled={aiLoading}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/20 rounded-full peer peer-checked:bg-[#8b47eb] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </div>
            </label>
          </div>

          {/* Gesture guide (shown when AI is on) */}
          {aiDetectionEnabled && !currentGesture && (
            <div className="flex justify-center gap-2 mb-4 flex-wrap">
              {GESTURE_LABELS.map((g) => (
                <span key={g} className={`text-[10px] px-2 py-1 rounded-full border ${
                  g === 'SOS' ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-white/10 text-white/40 bg-white/5'
                }`}>
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Main Controls Row */}
          <div className="flex items-center justify-center gap-8">
            {/* Stop Camera */}
            <button
              onClick={stopCamera}
              className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
            >
              <span className="material-symbols-outlined text-white text-2xl">
                close
              </span>
            </button>

            {/* Record Toggle */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center active:scale-90 transition-all ${
                isRecording
                  ? 'bg-red-500 shadow-lg shadow-red-500/40'
                  : 'bg-white/90 shadow-lg'
              }`}
            >
              {isRecording ? (
                <div className="w-8 h-8 rounded-sm bg-white" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-500 border-4 border-white" />
              )}
            </button>

            {/* Manual SOS */}
            <button
              onClick={triggerSOS}
              disabled={sosTriggered}
              className="w-14 h-14 rounded-full bg-red-500/80 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-white text-2xl">
                sos
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── WhatsApp SOS Contacts Modal ── */}
      {showSosModal && sosWhatsappLinks.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-t-3xl w-full max-w-md shadow-2xl p-6 pb-10 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                📲 Send SOS to Contacts
              </h3>
              <button
                onClick={handleCloseSosModal}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-500">close</span>
              </button>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Tap each contact to open WhatsApp with the emergency message. You must press <strong>Send</strong> in WhatsApp for each one.
            </p>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {sosWhatsappLinks.map((contact, i) => {
                const isSent = sosSentContacts.has(i);
                return (
                  <button
                    key={i}
                    onClick={() => handleSosSendToContact(contact.link, i)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all active:scale-[0.98] ${
                      isSent
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-green-400 hover:shadow-md'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isSent ? 'bg-green-500' : 'bg-[#25D366]'
                    }`}>
                      {isSent ? (
                        <span className="material-symbols-outlined text-white text-2xl">check</span>
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-bold ${isSent ? 'text-green-700 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                        {contact.name}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{contact.phone}</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      isSent
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-[#25D366]/10 text-[#25D366]'
                    }`}>
                      {isSent ? '✓ Opened' : 'Send →'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* All sent message */}
            {sosWhatsappLinks.length > 0 && sosSentContacts.size >= sosWhatsappLinks.length && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 text-center">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  ✅ All contacts opened! Make sure you pressed Send in each WhatsApp chat.
                </p>
              </div>
            )}

            <button
              onClick={handleCloseSosModal}
              className={`w-full mt-4 py-3 rounded-xl font-bold text-white transition-all ${
                sosSentContacts.size >= sosWhatsappLinks.length
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-slate-400 hover:bg-slate-500'
              }`}
            >
              {sosSentContacts.size >= sosWhatsappLinks.length ? 'Done' : `${sosWhatsappLinks.length - sosSentContacts.size} remaining — Close`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
