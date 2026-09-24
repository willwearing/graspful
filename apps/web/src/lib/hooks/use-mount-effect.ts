"use client";

import { useEffect, useRef, type EffectCallback } from "react";

/** Run the initial effect for each mount and preserve its cleanup. */
export function useMountEffect(effect: EffectCallback) {
  const initialEffect = useRef(effect);
  useEffect(() => initialEffect.current(), []);
}
