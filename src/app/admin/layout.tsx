import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TURNIIC Admin',
  description: 'Tournament scoring admin interface',
  manifest: '/manifest.json',
  themeColor: '#dc2626',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TURNIIC Admin',
  },
  formatDetection: {
    telephone: false,
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  )
}