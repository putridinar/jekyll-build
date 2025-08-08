'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

const LockScreen = () => {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // Logika countdown dan pengalihan halaman
    const timer = setInterval(() => {
      setCountdown(c => c - 1);
    }, 1000);

    if (countdown <= 0) {
      window.location.href = "https://daffadevhosting.github.io";
    }

    // Cleanup
    return () => clearInterval(timer);
  }, [countdown]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 99999,
      textAlign: 'center',
      padding: '20px'
    }}>
      <h4 style={{ fontSize: '2rem', marginBottom: '20px', fontWeight: 'bold' }}>🔒 Template is Locked</h4>
      <p style={{ fontSize: '1.1rem', color: 'hsl(var(--muted-foreground))' }}>
        Mohon untuk tidak menghapus atau mengubah kredit footer.
      </p>
      <p style={{ marginTop: '30px', color: 'hsl(var(--muted-foreground))' }}>
        Anda akan dialihkan dalam {countdown} detik...
      </p>
    </div>
  );
};

export const LoadingScreen = () => (
    <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin" />
    </div>
);

export default LockScreen;