'use client';

import { useState, useEffect } from 'react';

const licenseId = process.env.NEXT_PUBLIC_CLIENT_ID
/**
 * Hook kustom untuk memeriksa lisensi di footer.
 * Mengembalikan status lisensi: 'checking', 'valid', atau 'invalid'.
 */
export function useLicenseCheck() {
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid'>('checking');
  useEffect(() => {
    const publisher = (licenseId || '').trim();

    const observer = new MutationObserver((mutations, obs) => {
      const licenseSpan = `${publisher}`;

      if (licenseSpan) {
        const spanText = (licenseSpan || '').trim();

        if (spanText === publisher) {
          setStatus('valid');
          obs.disconnect();
          clearTimeout(timeoutId);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const timeoutId = setTimeout(() => {
      // To prevent a race condition, we do one final check before declaring invalid.
      const licenseSpan = document.querySelector('#app-footer span');
      if (licenseSpan && (licenseSpan.textContent || '').trim() === publisher) {
        setStatus('valid');
      } else {
        setStatus('invalid');
      }
      observer.disconnect();
    }, 5000);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);
  return status;
}