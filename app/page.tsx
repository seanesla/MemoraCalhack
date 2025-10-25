'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    window.location.href = '/memora-cinematic.html';
  }, []);

  return <div>Redirecting...</div>;
}