export const metadata = {
  title: 'Memora Care',
  description: 'Compassionate AI companionship for elderly care and memory support',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Memora Care',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Memora" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" href="/icon-192.png" />
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
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
