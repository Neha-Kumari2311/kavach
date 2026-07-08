"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useSafetyScore } from "@/hooks/useSafetyScore";
import EmergencySOSButton from "@/components/dashboard/EmergencySOSButton";
import LiveLocationCard from "@/components/dashboard/LiveLocationCard";
import NearbyPoliceStations from "@/components/dashboard/NearbyPoliceStations";
import HelplineDirectory from "@/components/dashboard/HelplineDirectory";
import SafetyStore from "@/components/dashboard/SafetyStore";
import FakeCallOverlay from "@/components/FakeCallOverlay";
import FakeCallSettings from "@/components/FakeCallSettings";
import SirenButton from "@/components/SirenButton";

export default function UserDashboardPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true);
  const [sosError, setSosError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  const [trustedContacts, setTrustedContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [liveCoords, setLiveCoords] = useState(null);

  // Fake Call state
  const [showFakeCallSettings, setShowFakeCallSettings] = useState(false);
  const [showFakeCall, setShowFakeCall] = useState(false);
  const [fakeCallCaller, setFakeCallCaller] = useState("Mom");
  const fakeCallTimerRef = useRef(null);

  // Dynamic safety score
  const { safetyScore, safetyLabel, safetyColor, loading: safetyLoading, refreshSafetyScore } = useSafetyScore();

  const isActive = (path) => pathname === path;
  const userName = session?.user?.name?.split(" ")[0] || "User";

  useLocationTracking(
    isTrackingEnabled && !!session,
    (error) => {
      setLocationError(error);
      setTimeout(() => setLocationError(""), 5000);
    },
    (data) => {
      setLastLocationUpdate(new Date());
      setLocationError("");
      if (data?.location) {
        setLiveCoords({ lat: data.location.latitude, lng: data.location.longitude });
      }
    },
  );

  useEffect(() => {
    fetchTrustedContacts();
  }, []);

  const fetchTrustedContacts = async () => {
    try {
      setContactsLoading(true);
      const response = await fetch("/api/trusted-contacts");
      const data = await response.json();
      if (response.ok) {
        setTrustedContacts(data.contacts || []);
      }
    } catch (err) {
      console.error("Fetch contacts error:", err);
    } finally {
      setContactsLoading(false);
    }
  };

  useEffect(() => {
    if (!session) setIsTrackingEnabled(false);
  }, [session]);

  useEffect(() => {
    const handleBeforeUnload = () => setIsTrackingEnabled(false);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setIsTrackingEnabled(false);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (fakeCallTimerRef.current) {
        clearTimeout(fakeCallTimerRef.current);
      }
    };
  }, []);

  const handleSOSComplete = (data) => {
    setSosError("");
  };

  const handleSOSError = (errorMessage) => {
    setSosError(errorMessage);
    setTimeout(() => setSosError(""), 5000);
  };

  const handleToggleTracking = () => {
    const newState = !isTrackingEnabled;
    setIsTrackingEnabled(newState);

    if (newState) {
      if (!navigator.geolocation) {
        setLocationError("Geolocation is not supported by your browser");
        setIsTrackingEnabled(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationError("");
          const newCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLiveCoords(newCoords);
          refreshSafetyScore(newCoords);
        },
        (error) => {
          setIsTrackingEnabled(false);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocationError("Location permission denied. Please enable it in browser settings.");
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationError("Location information unavailable.");
              break;
            case error.TIMEOUT:
              setLocationError("Location request timed out.");
              break;
            default:
              setLocationError("Failed to enable location tracking.");
          }
        },
      );
    } else {
      setLocationError("");
      setLiveCoords(null);
    }
  };

  const handleContactClick = (contact) => {
    window.location.href = `tel:${contact.phone}`;
  };

  // Fake Call handlers
  const handleFakeCallStart = useCallback(({ callerName, delay }) => {
    setFakeCallCaller(callerName);
    setShowFakeCallSettings(false);

    if (delay > 0) {
      fakeCallTimerRef.current = setTimeout(() => {
        setShowFakeCall(true);
      }, delay * 1000);
    } else {
      setShowFakeCall(true);
    }
  }, []);

  const handleFakeCallDismiss = useCallback(() => {
    setShowFakeCall(false);
  }, []);

  return (
    <div className="px-4 max-w-2xl mx-auto w-full space-y-5 pt-4 pb-4">
        {/* Error Messages */}
        {(sosError || locationError) && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg">error</span>
            <p className="text-sm text-red-600 dark:text-red-400 flex-1">{sosError || locationError}</p>
            <button
              onClick={() => { setSosError(""); setLocationError(""); }}
              className="text-red-600 dark:text-red-400 hover:text-red-700"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        )}

        {/* Emergency SOS Button */}
        <EmergencySOSButton
          onHoldComplete={handleSOSComplete}
          onError={handleSOSError}
        />

        {/* Live Location Card */}
        <LiveLocationCard
          location="Mumbai"
          isTrackingEnabled={isTrackingEnabled}
          onToggleTracking={handleToggleTracking}
          onCoordsChange={(newCoords) => {
            if (newCoords && isTrackingEnabled) {
              setLiveCoords(newCoords);
            }
          }}
          onViewMap={() => {
            try {
              if (liveCoords) {
                window.open(`https://maps.google.com/?q=${liveCoords.lat},${liveCoords.lng}`, "_blank");
              } else if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    window.open(`https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`, "_blank");
                  },
                  () => { window.open("https://maps.google.com/", "_blank"); },
                  { timeout: 5000 },
                );
              } else {
                window.open("https://maps.google.com/", "_blank");
              }
            } catch (err) {
              window.open("https://maps.google.com/", "_blank");
            }
          }}
          lastUpdate={lastLocationUpdate}
        />

        {/* Quick Actions — 2x2 grid */}
        <section>
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-3 px-1">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Fake Call */}
            <button
              onClick={() => setShowFakeCallSettings(true)}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl flex flex-col items-center gap-3 border border-slate-100 dark:border-slate-700 active:scale-95 transition-all hover:shadow-lg hover:border-[#6C47FF]/30 group shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-[#6C47FF]/10 flex items-center justify-center group-hover:bg-[#6C47FF]/20 transition-colors">
                <span className="material-symbols-outlined text-[#6C47FF] text-2xl">phone_in_talk</span>
              </div>
              <span className="text-sm font-bold">Fake Call</span>
            </button>

            {/* Fake Siren */}
            <SirenButton className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-lg hover:border-[#6C47FF]/30 shadow-sm" />

            {/* Dashcam */}
            <button
              onClick={() => router.push("/user/dashcam")}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl flex flex-col items-center gap-3 border border-slate-100 dark:border-slate-700 active:scale-95 transition-all hover:shadow-lg hover:border-[#6C47FF]/30 group shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-[#6C47FF]/10 flex items-center justify-center group-hover:bg-[#6C47FF]/20 transition-colors">
                <span className="material-symbols-outlined text-[#6C47FF] text-2xl">videocam</span>
              </div>
              <span className="text-sm font-bold">Dashcam</span>
            </button>

            {/* AI Predict */}
            <button
              onClick={() => router.push("/user/predict")}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl flex flex-col items-center gap-3 border border-slate-100 dark:border-slate-700 active:scale-95 transition-all hover:shadow-lg hover:border-[#6C47FF]/30 group shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-[#6C47FF]/10 flex items-center justify-center group-hover:bg-[#6C47FF]/20 transition-colors">
                <span className="material-symbols-outlined text-[#6C47FF] text-2xl">insights</span>
              </div>
              <span className="text-sm font-bold">AI Predict</span>
            </button>
          </div>
        </section>

        {/* Nearby Police Stations */}
        <NearbyPoliceStations />

      {/* Fake Call Settings Modal */}
      <FakeCallSettings
        visible={showFakeCallSettings}
        onClose={() => setShowFakeCallSettings(false)}
        onStart={handleFakeCallStart}
      />

      {/* Fake Call Overlay */}
      <FakeCallOverlay
        callerName={fakeCallCaller}
        visible={showFakeCall}
        onDismiss={handleFakeCallDismiss}
      />
    </div>
  );
}
