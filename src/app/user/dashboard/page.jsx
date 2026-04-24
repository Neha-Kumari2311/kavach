"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { useSafetyScore } from "@/hooks/useSafetyScore";
import UserDashboardHeader from "@/components/dashboard/UserDashboardHeader";
import EmergencySOSButton from "@/components/dashboard/EmergencySOSButton";
import LiveLocationCard from "@/components/dashboard/LiveLocationCard";
import HelplineDirectory from "@/components/dashboard/HelplineDirectory";
import SafetyStore from "@/components/dashboard/SafetyStore";
import FakeCallOverlay from "@/components/FakeCallOverlay";
import FakeCallSettings from "@/components/FakeCallSettings";
import SirenButton from "@/components/SirenButton";

export default function UserDashboardPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false);
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

  // Dynamic safety score — from shared context (persists across page navigation)
  const { safetyScore, safetyLabel, safetyColor, loading: safetyLoading, refreshSafetyScore } = useSafetyScore();

  const isActive = (path) => pathname === path;

  // Dynamic name from session
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
      // Capture coordinates from the location update for safety score
      if (data?.location) {
        setLiveCoords({ lat: data.location.latitude, lng: data.location.longitude });
      }
      console.log("Location updated:", data);
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

  // Cleanup fake call timer on unmount
  useEffect(() => {
    return () => {
      if (fakeCallTimerRef.current) {
        clearTimeout(fakeCallTimerRef.current);
      }
    };
  }, []);

  const handleSOSComplete = (data) => {
    console.log("SOS alert sent successfully:", data);
    setSosError("");
  };

  const handleSOSError = (errorMessage) => {
    console.error("SOS error:", errorMessage);
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
          // Trigger a fresh safety score fetch via shared context
          refreshSafetyScore(newCoords);
        },
        (error) => {
          setIsTrackingEnabled(false);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocationError(
                "Location permission denied. Please enable it in browser settings.",
              );
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
    <div className="bg-[#f7f6f8] dark:bg-[#181121] font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      {/* Pass dynamic userName and safety score from hook */}
      <UserDashboardHeader
        userName={userName}
        safetyScore={safetyScore}
        safetyLabel={safetyLabel}
        safetyColor={safetyColor}
        safetyLoading={safetyLoading}
        onNotificationClick={() => console.log("Notifications clicked")}
      />

      <main className="flex-1 px-4 pb-24 max-w-md mx-auto w-full space-y-6">
        {/* Error Messages */}
        {(sosError || locationError) && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg">
              error
            </span>
            <p className="text-sm text-red-600 dark:text-red-400 flex-1">
              {sosError || locationError}
            </p>
            <button
              onClick={() => {
                setSosError("");
                setLocationError("");
              }}
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
            // Keep central coords in sync with LiveLocationCard's own position watcher
            if (newCoords && isTrackingEnabled) {
              setLiveCoords(newCoords);
            }
          }}
          onViewMap={() => {
            // Open live location in Google Maps
            try {
              if (liveCoords) {
                window.open(
                  `https://maps.google.com/?q=${liveCoords.lat},${liveCoords.lng}`,
                  "_blank",
                );
              } else if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    window.open(
                      `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`,
                      "_blank",
                    );
                  },
                  () => {
                    window.open("https://maps.google.com/", "_blank");
                  },
                  { timeout: 5000 },
                );
              } else {
                window.open("https://maps.google.com/", "_blank");
              }
            } catch (err) {
              console.error("Map open error:", err);
              window.open("https://maps.google.com/", "_blank");
            }
          }}
          lastUpdate={lastLocationUpdate}
        />

        {/* Trusted Contacts */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Trusted Contacts
            </h3>
            <button
              onClick={() => router.push("/user/contacts")}
              className="text-xs font-semibold text-[#8b47eb] hover:underline"
            >
              Manage
            </button>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2 px-1">
            <button
              onClick={() => router.push("/user/contacts")}
              className="flex-shrink-0 flex flex-col items-center gap-2"
            >
              <div className="size-14 rounded-full border-2 border-dashed border-[#8b47eb]/40 flex items-center justify-center text-[#8b47eb]">
                <span className="material-symbols-outlined">add</span>
              </div>
              <span className="text-[10px] font-medium">Add New</span>
            </button>

            {contactsLoading ? (
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <div className="size-14 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                <span className="text-[10px] font-medium text-slate-400">
                  Loading...
                </span>
              </div>
            ) : (
              trustedContacts.slice(0, 4).map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleContactClick(contact)}
                  className="flex-shrink-0 flex flex-col items-center gap-2"
                >
                  <div className="size-14 rounded-full bg-[#8b47eb]/10 border-2 border-[#8b47eb]/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#8b47eb] text-2xl">
                      person
                    </span>
                  </div>
                  <span className="text-[10px] font-medium truncate max-w-[56px]">
                    {contact.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Quick Actions — 3 buttons in one row */}
        <section>
          <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-3 px-1">
            Quick Actions
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {/* Fake Call */}
            <button
              onClick={() => setShowFakeCallSettings(true)}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl flex flex-col items-center gap-3 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-all hover:shadow-md group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                <span className="material-symbols-outlined text-[#8b47eb] text-2xl">
                  phone_callback
                </span>
              </div>
              <div className="text-center">
                <span className="text-sm font-bold block">Fake Call</span>
                <span className="text-[10px] text-slate-400">
                  Simulate call
                </span>
              </div>
            </button>

            {/* Fake Siren */}
            <SirenButton className="p-5 rounded-2xl shadow-sm hover:shadow-md group" />

            {/* Dashcam */}
            <button
              onClick={() => router.push("/user/dashcam")}
              className="bg-white dark:bg-slate-800 p-5 rounded-2xl flex flex-col items-center gap-3 shadow-sm border border-slate-100 dark:border-slate-700 active:scale-95 transition-all hover:shadow-md group"
            >
              <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 transition-colors">
                <span className="material-symbols-outlined text-rose-500 text-2xl">
                  videocam
                </span>
              </div>
              <div className="text-center">
                <span className="text-sm font-bold block">Dashcam</span>
                <span className="text-[10px] text-slate-400">AI detection</span>
              </div>
            </button>
          </div>
        </section>

        <HelplineDirectory />
        <SafetyStore onViewAll={() => router.push("/user/store")} />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800 px-6 py-3 z-50">
        <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
          <Link
            href="/user/dashboard"
            className="flex flex-col items-center gap-1 text-[#8b47eb]"
          >
            <div className="bg-[#8b47eb]/10 px-3 py-1 rounded-full flex flex-col items-center">
              <span className="material-symbols-outlined fill-1">home</span>
              <span className="text-[10px] font-bold">Home</span>
            </div>
          </Link>
          <Link
            href="/user/dashcam"
            className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-[#8b47eb] transition-colors"
          >
            <span className="material-symbols-outlined">videocam</span>
            <span className="text-[10px] font-medium">Dashcam</span>
          </Link>
          <Link
            href="/user/predict"
            className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-[#8b47eb] transition-colors"
          >
            <span className="material-symbols-outlined">insights</span>
            <span className="text-[10px] font-medium">Predict</span>
          </Link>
          <button
            onClick={() => window.open('https://ncwapps.nic.in/onlinecomplaintsv2/', '_blank')}
            className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-[#8b47eb] transition-colors"
          >
            <span className="material-symbols-outlined">gavel</span>
            <span className="text-[10px] font-medium">Complaint</span>
          </button>
          <Link
            href="/user/store"
            className="flex flex-col items-center gap-1 text-slate-400 dark:text-slate-500 hover:text-[#8b47eb] transition-colors"
          >
            <span className="material-symbols-outlined">shopping_bag</span>
            <span className="text-[10px] font-medium">Store</span>
          </Link>
        </div>
      </nav>

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
