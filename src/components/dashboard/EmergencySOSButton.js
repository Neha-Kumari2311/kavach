'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { buildWhatsAppSOSLinks } from '@/lib/whatsappSOS';

export default function EmergencySOSButton({ onHoldComplete, onError }) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // WhatsApp contact links modal
  const [whatsappLinks, setWhatsappLinks] = useState([]);
  const [sentContacts, setSentContacts] = useState(new Set());
  const [showContactsModal, setShowContactsModal] = useState(false);

  const isHoldingRef = useRef(false);
  const intervalRef = useRef(null);
  const progressRef = useRef(0);

  // ── Get user location ──
  const getCurrentLocation = useCallback(() => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ latitude: 0, longitude: 0 });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({ latitude: 0, longitude: 0 }),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  }, []);

  // ── Main SOS handler ──
  const handleSOSSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSuccess(false);

    try {
      const location = await getCurrentLocation();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('/api/sos/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: location.latitude, longitude: location.longitude }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to trigger SOS');

      if (data.contacts && data.contacts.length > 0) {
        const result = buildWhatsAppSOSLinks(data.contacts, location.latitude, location.longitude, data.userName);
        setWhatsappLinks(result.links);
        setSentContacts(new Set());
        setShowContactsModal(true);
        setSuccess(true);
        setIsSubmitting(false);
        if (onHoldComplete) onHoldComplete(data);
      } else {
        setIsSubmitting(false);
        if (onError) onError(data.message || 'No trusted contacts found. Add contacts in Settings.');
      }
    } catch (error) {
      setIsSubmitting(false);
      if (onError) {
        onError(
          error.name === 'AbortError'
            ? 'SOS request timed out. Check your internet connection.'
            : error.message || 'Failed to send SOS.'
        );
      }
    }
  }, [getCurrentLocation, onHoldComplete, onError, isSubmitting]);

  // ── Handle sending to a single contact ──
  const handleSendToContact = useCallback((link, index) => {
    window.open(link, '_blank');
    setSentContacts((prev) => new Set(prev).add(index));
  }, []);

  // ── Close modal ──
  const handleCloseModal = useCallback(() => {
    setShowContactsModal(false);
    setWhatsappLinks([]);
    setSentContacts(new Set());
    setSuccess(false);
  }, []);

  // ── Hold detection ──
  const startHold = useCallback((e) => {
    if (e) e.preventDefault();
    if (isSubmitting || success || showContactsModal) return;

    isHoldingRef.current = true;
    progressRef.current = 0;
    setHoldProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      if (!isHoldingRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        progressRef.current = 0;
        setHoldProgress(0);
        return;
      }

      progressRef.current += (100 / 30);

      if (progressRef.current >= 100) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        isHoldingRef.current = false;
        progressRef.current = 0;
        setHoldProgress(0);
        handleSOSSubmit();
        return;
      }

      setHoldProgress(progressRef.current);
    }, 100);
  }, [isSubmitting, success, showContactsModal, handleSOSSubmit]);

  const stopHold = useCallback((e) => {
    if (e) e.preventDefault();
    if (!isHoldingRef.current) return;
    isHoldingRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    progressRef.current = 0;
    setHoldProgress(0);
  }, []);

  // Click fallback
  const handleClick = useCallback(() => {
    if (isSubmitting || success || showContactsModal) return;
    if (isHoldingRef.current) return;
    if (window.confirm('🚨 Send SOS emergency alert via WhatsApp to your trusted contacts?')) {
      handleSOSSubmit();
    }
  }, [isSubmitting, success, showContactsModal, handleSOSSubmit]);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const isHolding = holdProgress > 0 && !isSubmitting && !success;
  const allSent = whatsappLinks.length > 0 && sentContacts.size >= whatsappLinks.length;

  return (
    <>
      {/* SOS Card matching reference design */}
      <section className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 flex flex-col items-center">
        {/* SOS Button with concentric rings */}
        <div className="relative mb-5">
          {/* Outer pulsing ring */}
          <div className={`absolute inset-0 -m-6 rounded-full ${!isSubmitting && !showContactsModal ? 'animate-ping' : ''} bg-red-400/10`}></div>
          <div className="absolute inset-0 -m-4 rounded-full bg-red-400/15 border border-red-300/30"></div>
          <div className="absolute inset-0 -m-2 rounded-full bg-red-400/20 border border-red-300/40"></div>
          
          <button
            onPointerDown={startHold}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            onClick={handleClick}
            onContextMenu={(e) => e.preventDefault()}
            style={{ touchAction: 'none', userSelect: 'none' }}
            disabled={isSubmitting || showContactsModal}
            className={`relative w-32 h-32 rounded-full flex flex-col items-center justify-center text-white transition-all active:scale-95 shadow-xl ${
              showContactsModal
                ? 'bg-green-500 shadow-green-500/30'
                : isSubmitting
                ? 'bg-orange-500 shadow-orange-500/30'
                : 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/40'
            } ${isSubmitting || showContactsModal ? 'cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-4xl mb-0.5 animate-spin">sync</span>
                <span className="font-bold text-xs tracking-wider">SENDING</span>
              </>
            ) : showContactsModal ? (
              <>
                <span className="material-symbols-outlined text-4xl mb-0.5">check_circle</span>
                <span className="font-bold text-xs tracking-wider">SENT</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-5xl mb-0.5">emergency_share</span>
                <span className="font-bold text-xs tracking-wider">
                  {isHolding ? `${Math.ceil(3 - (holdProgress / 100) * 3)}s` : 'SOS'}
                </span>
              </>
            )}

            {/* Progress ring while holding */}
            {isHolding && (
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="58" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                <circle cx="64" cy="64" r="58" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${(holdProgress / 100) * 364.4} 364.4`} />
              </svg>
            )}
          </button>
        </div>

        <h3 className="font-bold text-base text-center">Emergency Help</h3>
        <p className="text-xs text-slate-500 text-center mt-1 max-w-[220px]">
          {showContactsModal
            ? '👇 Tap each contact below to send via WhatsApp'
            : isSubmitting
            ? 'Preparing WhatsApp alerts...'
            : isHolding
            ? 'Keep holding...'
            : 'Hold for 3 seconds to alert your network and emergency services.'}
        </p>
      </section>

      {/* ── WhatsApp Contacts Modal ── */}
      {showContactsModal && whatsappLinks.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-t-3xl w-full max-w-md shadow-2xl p-6 pb-10 animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                📲 Send SOS to Contacts
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-500">close</span>
              </button>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Tap each contact to open WhatsApp with the emergency message. You must press <strong>Send</strong> in WhatsApp for each one.
            </p>

            <div className="space-y-3">
              {whatsappLinks.map((contact, i) => {
                const isSent = sentContacts.has(i);
                return (
                  <button
                    key={i}
                    onClick={() => handleSendToContact(contact.link, i)}
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

            {allSent && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 text-center">
                <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                  ✅ All contacts opened! Make sure you pressed Send in each WhatsApp chat.
                </p>
              </div>
            )}

            <button
              onClick={handleCloseModal}
              className={`w-full mt-4 py-3 rounded-xl font-bold text-white transition-all ${
                allSent ? 'bg-green-500 hover:bg-green-600' : 'bg-slate-400 hover:bg-slate-500'
              }`}
            >
              {allSent ? 'Done' : `${whatsappLinks.length - sentContacts.size} remaining — Close`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
