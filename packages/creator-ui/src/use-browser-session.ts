"use client";

import { useEffect, useState } from "react";

export interface BrowserSession {
  access_token: string;
  user: { id: string };
}

interface BrowserAuthClient {
  auth: {
    getSession(): Promise<{ data: { session: BrowserSession | null }; error?: unknown }>;
    onAuthStateChange(callback: (event: string, session: BrowserSession | null) => void): {
      data: { subscription: { unsubscribe(): void } };
    };
  };
}

/** Subscribe before accepting the initial read, so an older read cannot restore a signed-out user. */
export function useBrowserSession(createClient: () => BrowserAuthClient) {
  const [session, setSession] = useState<BrowserSession | null>(null);
  useEffect(() => {
    const client = createClient();
    let active = true;
    let authChanged = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, current) => {
      authChanged = true;
      if (active) setSession(current);
    });
    client.auth.getSession().then(({ data, error }) => {
      if (active && !authChanged) setSession(error ? null : data.session);
    }).catch(() => { if (active && !authChanged) setSession(null); });
    return () => { active = false; subscription.unsubscribe(); };
  }, [createClient]);
  return session;
}
