import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Memora Care',
  description: 'Compassionate AI companionship for elderly care and memory support',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Memora',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0a0a0a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <link rel="stylesheet" href="https://unpkg.com/papercss@1.9.2/dist/paper.min.css" />
          <style>{`
            :root {
              background: #0a0a0a !important;
            }
            html {
              background: #0a0a0a !important;
              background-color: #0a0a0a !important;
            }
            body {
              background: #0a0a0a !important;
              background-color: #0a0a0a !important;
            }
          `}</style>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
