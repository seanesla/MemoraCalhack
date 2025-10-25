'use client';

import { useEffect } from 'react';

export default function DashboardRedirect() {
  useEffect(() => {
    window.location.href = '/dashboard.html';
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#000000',
      color: '#FFFFFF',
      fontFamily: 'Inter, sans-serif',
      fontSize: '1.25rem'
    }}>
      Redirecting to dashboard...
    </div>
  );
}
