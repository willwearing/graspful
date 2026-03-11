"use client";

import { useState } from "react";
import { useBrand } from "@/lib/brand/context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const BRANDS = [
  { id: "firefighter", name: "FirefighterPrep", emoji: "🔥", orgId: "firefighter-prep" },
  { id: "electrician", name: "ElectricianPrep", emoji: "⚡", orgId: "electrician-prep" },
  { id: "javascript", name: "JSPrep", emoji: "🟨", orgId: "javascript-prep" },
];

/**
 * Floating brand switcher for local development only.
 * Sets a cookie that the middleware/layout reads to override the active brand,
 * auto-joins the org (so the user has access), then reloads.
 */
export function DevBrandSwitcher() {
  const brand = useBrand();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  if (process.env.NODE_ENV === "production") return null;

  async function switchBrand(brandId: string) {
    if (brandId === brand.id) {
      setOpen(false);
      return;
    }

    setSwitching(true);

    // Auto-join the target org so the user has access
    const targetBrand = BRANDS.find((b) => b.id === brandId);
    if (targetBrand) {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000/api/v1";
          await fetch(`${backendUrl}/orgs/${targetBrand.orgId}/join`, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        }
      } catch {
        // Non-fatal — user may not be logged in
      }
    }

    document.cookie = `dev-brand-override=${brandId}; path=/; max-age=31536000`;
    window.location.reload();
  }

  function clearOverride() {
    document.cookie = "dev-brand-override=; path=/; max-age=0";
    window.location.reload();
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {open ? (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
          <div className="text-xs font-medium text-gray-500 mb-2">
            Switch Brand
          </div>
          {BRANDS.map((b) => (
            <button
              key={b.id}
              onClick={() => switchBrand(b.id)}
              disabled={switching}
              className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 ${
                b.id === brand.id
                  ? "bg-gray-100 font-medium"
                  : "hover:bg-gray-50"
              } ${switching ? "opacity-50 cursor-wait" : ""}`}
            >
              <span>{b.emoji}</span>
              <span className="text-gray-900">{b.name}</span>
              {b.id === brand.id && (
                <span className="ml-auto text-xs text-gray-400">active</span>
              )}
            </button>
          ))}
          <button
            onClick={clearOverride}
            className="w-full text-left px-3 py-2 mt-1 rounded text-xs text-gray-400 hover:bg-gray-50"
          >
            Reset to DEV_BRAND_ID default
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className="bg-gray-900 text-white text-xs px-3 py-2 rounded-full shadow-lg hover:bg-gray-800"
        >
          {BRANDS.find((b) => b.id === brand.id)?.emoji} {brand.name}
        </button>
      )}
    </div>
  );
}
