"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister())),
      )
      .catch(() => undefined);

    if ("caches" in window) {
      window.caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
        .catch(() => undefined);
    }
  }, []);

  return null;
}
