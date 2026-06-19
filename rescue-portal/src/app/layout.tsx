import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SettingsProvider } from '@/lib/settings-context'
import { I18nProvider } from '@/lib/i18n-context'
import { ServiceWorkerRegister } from '@/components/sw-register'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Emergency Rescue Portal | Municipal Emergency Response System',
  description: 'Municipal emergency response portal for resident verification, emergency reporting, and rescue coordination.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Emergency Rescue Portal',
  },
}

export const viewport: Viewport = {
  themeColor: '#dc2626',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SettingsProvider>
          <I18nProvider>
            <TooltipProvider>
              {children}
              <ServiceWorkerRegister />
              <Toaster richColors position="top-right" />
            </TooltipProvider>
          </I18nProvider>
        </SettingsProvider>
      </body>
    </html>
  )
}
