'use client';

import { SafetyScoreProvider } from '@/hooks/useSafetyScore';

export default function UserLayout({ children }) {
  return (
    <SafetyScoreProvider>
      {children}
    </SafetyScoreProvider>
  );
}
