'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import MessageBubble from './chat/MessageBubble';
import TypingIndicator from './chat/TypingIndicator';
import { buildSOSLinks } from '@/lib/whatsappSOS';

/**
 * ChatWidget — Kavach AI Safety Assistant (text-based)
 * 
 * Replaces the voice-based VAPI widget with a silent text chat.
 * In a dangerous situation, text is much safer than speaking out loud.
 * 
 * Features:
 * - Tailored to women's safety in India
 * - Can trigger SOS alerts via text commands
 * - Provides emergency helplines
 * - Context-aware safety advice
 * - Stays focused on safety topics only
 */
export default function ChatWidget() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sosAlert, setSosAlert] = useState('');
  const [sosConfirmPending, setSosConfirmPending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Trigger SOS via the existing API — same flow as the big red dashboard button
  const triggerSOS = useCallback(async () => {
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

      // 1. Call API to record SOS event and get contacts
      const r = await fetch('/api/sos/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });
      const d = await r.json();

      // 2. Build WhatsApp + SMS links and open them
      if (d.contacts && d.contacts.length > 0) {
        const sosLinks = buildSOSLinks(d.contacts, latitude, longitude, d.userName);
        
        if (sosLinks.success && sosLinks.links.length > 0) {
          // Open the first contact via WhatsApp immediately
          window.open(sosLinks.links[0].whatsappLink, '_blank');
          
          // Also open SMS for the first contact (dual-channel alert)
          // Use location.href for sms: links — window.open() gets blocked on mobile
          setTimeout(() => {
            window.location.href = sosLinks.links[0].smsLink;
          }, 800);

          setSosAlert(`🚨 SOS sent! ${sosLinks.links.length} contact(s) alerted via WhatsApp + SMS`);
          
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `🚨 SOS dispatched to ${sosLinks.links.length} contact(s)! WhatsApp and SMS opened for ${sosLinks.links[0].name}. Your emergency message includes your live GPS location. Stay safe — help is coming.`
          }]);
        } else {
          setSosAlert('🚨 SOS recorded but no links generated');
        }
      } else {
        setSosAlert('⚠️ No trusted contacts found — add contacts in Settings');
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ No trusted contacts found. Please add emergency contacts in the Contacts section. In the meantime, call 112 (emergency) or 1091 (women helpline) directly.'
        }]);
      }

      setTimeout(() => setSosAlert(''), 6000);

    } catch (e) {
      console.error('[SOS] Failed:', e);
      setSosAlert('⚠️ SOS failed — try the SOS button on dashboard');
      setTimeout(() => setSosAlert(''), 5000);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ SOS could not be sent. Please use the red SOS button on the dashboard or call 112 directly.'
      }]);
    }
  }, []);

  // Client-side SOS keywords — triggers confirmation immediately without waiting for AI
  const SOS_KEYWORDS = /\b(send sos|sos|alert my contacts|alert contacts|i need help|help me|i am in danger|i'm in danger|someone is following|being followed|being attacked|send emergency|emergency alert|notify my contacts|send alert)\b/i;

  const sendMessage = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    // Add user message
    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');

    // CLIENT-SIDE SOS DETECTION — instant, no AI delay needed
    if (SOS_KEYWORDS.test(text)) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '🚨 I understand you need emergency help. Tap "Confirm SOS" below to alert your trusted contacts with your live location immediately.'
      }]);
      setSosConfirmPending(true);
      return; // Don't call AI — act immediately
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
        }),
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}`);
      }

      const data = await res.json();

      // Add assistant reply
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.reply
      }]);

      // If AI also triggered SOS (backup), show confirmation
      if (data.sosTriggered) {
        setSosConfirmPending(true);
      }

    } catch (err) {
      console.error('[Chat] Error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I could not connect right now. If you are in danger, use the SOS button or call 112 immediately.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Send a message directly (bypasses input state for quick actions)
  const sendDirectMessage = useCallback((text) => {
    if (!text || isLoading) return;

    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');

    if (SOS_KEYWORDS.test(text)) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '🚨 I understand you need emergency help. Tap "Confirm SOS" below to alert your trusted contacts with your live location immediately.'
      }]);
      setSosConfirmPending(true);
      return;
    }

    setIsLoading(true);
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: updatedMessages.map(m => ({ role: m.role, content: m.content })) }),
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        if (data.sosTriggered) setSosConfirmPending(true);
      })
      .catch(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I could not connect right now. If you are in danger, use the SOS button or call 112 immediately.' }]);
      })
      .finally(() => setIsLoading(false));
  }, [messages, isLoading]);

  // Quick actions
  const quickActions = [
    { label: '🆘 Send SOS', action: () => sendDirectMessage('Send SOS now') },
    { label: '📞 Helplines', action: () => sendDirectMessage('Show emergency helplines') },
    { label: '🛡️ Safety tips', action: () => sendDirectMessage('Safety tips for walking alone at night') },
  ];

  if (!session) return null;

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white dark:bg-slate-900 sm:inset-auto sm:bottom-24 sm:right-4 sm:w-[380px] sm:h-[560px] sm:rounded-2xl sm:shadow-2xl sm:border sm:border-slate-200 sm:dark:border-slate-700 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#6C47FF] to-[#8B6AFF] sm:rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-lg">shield</span>
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">Kavach AI</h3>
                <p className="text-white/60 text-[10px]">Safety Assistant • Always here</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <span className="material-symbols-outlined text-white text-lg">close</span>
            </button>
          </div>

          {/* SOS Alert Banner */}
          {sosAlert && (
            <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800">
              <p className="text-xs font-bold text-red-600 dark:text-red-400 text-center">{sosAlert}</p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-14 h-14 rounded-full bg-[#6C47FF]/10 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[#6C47FF] text-3xl">shield</span>
                </div>
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200 mb-1">Hi, I&apos;m Kavach AI</h4>
                <p className="text-xs text-slate-500 mb-4">Your safety assistant. I can send SOS alerts, share helplines, and give safety advice — all silently via text.</p>
                
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickActions.map((qa, i) => (
                    <button
                      key={i}
                      onClick={qa.action}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-[#6C47FF]/10 hover:text-[#6C47FF] transition-colors border border-slate-200 dark:border-slate-700"
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                role={msg.role}
                text={msg.content}
                time={null}
              />
            ))}

            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* SOS Confirmation Buttons */}
          {sosConfirmPending && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 flex gap-2">
              <button
                onClick={async () => {
                  setSosConfirmPending(false);
                  await triggerSOS();
                }}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-red-700 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-sm">emergency</span>
                Confirm SOS
              </button>
              <button
                onClick={() => {
                  setSosConfirmPending(false);
                  setMessages(prev => [...prev, { role: 'assistant', content: 'SOS cancelled. Let me know if you need anything else.' }]);
                }}
                className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-300 active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Input Area — safe-area padding for mobile keyboards */}
          <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-3 bg-white dark:bg-slate-900 sm:rounded-b-2xl" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                inputMode="text"
                enterKeyHint="send"
                autoComplete="off"
                autoCorrect="off"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(e);
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-base border-none outline-none focus:ring-2 focus:ring-[#6C47FF]/30 placeholder:text-slate-400"
                style={{ fontSize: '16px' }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-11 h-11 rounded-xl bg-[#6C47FF] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#5a3ad9] transition-colors active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-xl">send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Button — positioned above bottom nav */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-[55] w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${
          isOpen 
            ? 'bg-slate-600 scale-0 pointer-events-none' 
            : 'bg-[#6C47FF] hover:bg-[#5a3ad9] hover:shadow-[#6C47FF]/30 hover:shadow-2xl'
        }`}
        style={{ bottom: '90px', right: '20px' }}
        aria-label="Open Safety Chat"
      >
        <span className="material-symbols-outlined text-white text-2xl">chat</span>
        {/* Notification dot */}
        {messages.length === 0 && !isOpen && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>
        )}
      </button>
    </>
  );
}
