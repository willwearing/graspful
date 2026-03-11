"use client";

import { useState } from "react";
import { Sidebar } from "@/components/app/sidebar";
import { MobileHeader } from "@/components/app/mobile-header";
import { AudioPlayerProvider } from "@/lib/contexts/audio-player-context";
import { PlayerBar } from "@/components/app/player-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AudioPlayerProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-1 flex-col">
          <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-auto pb-16">{children}</main>
        </div>
      </div>
      <PlayerBar />
    </AudioPlayerProvider>
  );
}
