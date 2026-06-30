'use client';

import { useEffect, useState, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import { useSession } from 'next-auth/react';

export default function VapiWidget() {
  const { data: session } = useSession();
  const [vapi, setVapi] = useState(null);
  const [callStatus, setCallStatus] = useState('inactive'); // 'inactive', 'loading', 'active'
  const [transcript, setTranscript] = useState('');
  
  // New state for text input mode
  const [inputMode, setInputMode] = useState('voice'); // 'voice' or 'text'
  const [textInput, setTextInput] = useState('');
  const pressTimer = useRef(null);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (publicKey && publicKey !== 'your-vapi-public-key') {
      const vapiInstance = new Vapi(publicKey);
      setVapi(vapiInstance);

      vapiInstance.on('call-start', () => {
        setCallStatus('active');
        setTranscript('Listening...');
      });

      vapiInstance.on('call-end', () => {
        setCallStatus('inactive');
        setTranscript('');
      });

      // Track last alert time to prevent duplicate triggers within 30s
      let lastAlertTime = 0;

      vapiInstance.on('message', (message) => {
        if (message.type === 'transcript') {
          setTranscript(`${message.role === 'user' ? 'You' : 'Assistant'}: ${message.transcript}`);
          
          // --- DUAL-TRACK EMERGENCY INTERCEPTOR ---
          // Only trigger on FINAL transcripts (not partial) to avoid false positives mid-sentence
          const isFinal = message.transcriptType === 'final';
          const isKeyword = /\b(help|danger|emergency|attack|sos|alert my contacts|alert my family|notify my contacts|send sos|send alert|send emergency|call for help|i need help|i am in danger|i am scared|i am being followed|someone is following me|someone is chasing me|i am being attacked|i am hurt|i am in trouble|please help|help me|get help|contact my family|contact my friends|warn my contacts|save me|threatening me|someone threatened me)\b/i.test(message.transcript);
          const cooldownPassed = Date.now() - lastAlertTime > 30000; // 30s cooldown

          if (message.role === 'user' && isFinal && isKeyword && cooldownPassed) {
            lastAlertTime = Date.now();
            console.log(`[VAPI] 🚨 Emergency keyword detected in final transcript. Dual-track dispatch initiated.`);

            // === TRACK A: INSTANT DIRECT DISPATCH (no AI decision delay) ===
            (async () => {
              try {
                let latitude = 0, longitude = 0;
                if (navigator.geolocation) {
                  const pos = await new Promise((resolve, reject) =>
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
                  ).catch(() => null);
                  if (pos) {
                    latitude = pos.coords.latitude;
                    longitude = pos.coords.longitude;
                  }
                }
                const r = await fetch('/api/sos/trigger', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ latitude, longitude }),
                });
                const d = await r.json();
                console.log(`[SOS Track A] ✅ Direct dispatch: ${d.message}`);
              } catch (e) {
                console.error('[SOS Track A] ❌ Failed:', e);
              }
            })();

            // === TRACK B: AI VERBAL RESPONSE (simultaneous, non-blocking) ===
            vapiInstance.send({
              type: 'add-message',
              message: {
                role: 'system',
                content: `CRITICAL: Emergency alerts have already been dispatched to all trusted contacts. Your ONLY job now is to calmly tell the user: "I've already alerted your trusted contacts — help is on the way. Are you in a safe place right now?" Do NOT call send_emergency_alert again — it has already been handled. Focus entirely on keeping the user calm.`
              }
            });
          }
        }
      });

      vapiInstance.on('error', (e) => {
        console.error('Vapi Error:', e);
        setCallStatus('inactive');
        setTranscript(`Connection Error: ${e?.error?.message || e?.message || JSON.stringify(e)}`);
      });
      
      return () => {
        vapiInstance.stop();
      };
    }
  }, []);

  const startCallIfInactive = () => {
    if (callStatus === 'inactive' && vapi) {
      setCallStatus('loading');
      // Pass minimum overrides. Deepgram and Metadata must be configured in Vapi Dashboard to prevent Strict WebSocket Schema Schema rejections.
      vapi.start(process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID);
    }
  };

  const handleToggleCall = () => {
    if (!vapi) {
      alert('Vapi API Key not configured');
      return;
    }
    if (callStatus === 'inactive') {
      startCallIfInactive();
    } else {
      vapi.stop();
    }
  };

  const handlePointerDown = () => {
    if (inputMode === 'text') return; // don't listen if already in text mode

    pressTimer.current = setTimeout(() => {
      setInputMode('text');
      // Automatically start connection if not already running, so user can chat
      startCallIfInactive();
      pressTimer.current = null;
    }, 600); // 600ms for long hold
  };

  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
      // It was a short press
      if (inputMode === 'voice') {
        handleToggleCall();
      }
    }
  };

  const handlePointerLeave = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleSendText = (e) => {
    e.preventDefault();
    if (!textInput.trim() || !vapi) return;

    // Send text message to the assistant
    vapi.send({
      type: 'add-message',
      message: {
        role: 'user',
        content: textInput
      }
    });
    
    // Simulate updating local UI
    setTranscript(`You: ${textInput}`);
    setTextInput('');
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {(callStatus === 'active' || callStatus === 'loading') && (
        <div className="bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300 p-3 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 max-w-xs animate-fade-in font-medium pointer-events-auto">
          {callStatus === 'loading' ? 'Connecting to assistant...' : transcript || 'Listening...'}
        </div>
      )}
      
      {inputMode === 'voice' ? (
        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className={`relative group active:scale-95 transition-transform duration-150 size-14 rounded-full flex items-center justify-center text-white shadow-xl pointer-events-auto select-none ${
            callStatus === 'active' ? 'bg-[#ff4d4d]' : 'bg-[#8b47eb]'
          }`}
          style={{ WebkitTouchCallout: 'none' }}
          aria-label="Toggle Voice Assistant / Long hold for text"
        >
          <span className="material-symbols-outlined text-2xl font-variation-fill">
            {callStatus === 'active' ? 'mic_off' : 'mic'}
          </span>
          {callStatus === 'active' && (
            <div className="absolute inset-0 rounded-full bg-[#ff4d4d] opacity-30 animate-ping pointer-events-none"></div>
          )}
        </button>
      ) : (
        <div className="pointer-events-auto flex items-center bg-white dark:bg-slate-800 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 p-1 w-72 animate-fade-in transition-all">
          <form onSubmit={handleSendText} className="flex flex-1 items-center">
            <button
              type="button"
              onClick={() => setInputMode('voice')}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center rounded-full"
              title="Switch to Voice"
            >
              <span className="material-symbols-outlined text-xl">mic</span>
            </button>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 bg-transparent border-none outline-none px-2 text-sm text-slate-800 dark:text-slate-100"
              autoFocus
            />
            <button
              type="submit"
              disabled={!textInput.trim() || callStatus !== 'active'}
              className="p-2 bg-[#8b47eb] disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white flex items-center justify-center rounded-full ml-1"
            >
              <span className="material-symbols-outlined text-sm">send</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
