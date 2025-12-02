/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from 'next'
import Script from 'next/script'
import localFont from 'next/font/local'

import './globals.css'
import { ToastProvider } from '@/components/toast'
import { SmoothScroll } from '@/components/SmoothScroll'
import { ThemeProvider } from '@/components/ThemeProvider'
import { publicEnv } from '@/lib/env'

const runtimePublicEnv = {
  supabaseUrl: publicEnv.supabaseUrl ?? null,
  supabaseAnonKey: publicEnv.supabaseAnonKey ?? null,
}

const serializedRuntimeEnv = JSON.stringify(runtimePublicEnv).replace(/</g, '\\u003c')

export const metadata: Metadata = {
  title: 'MySched Admin',
  description: 'Admin dashboard for MySched',
}

import { CustomCursor } from '@/components/ui/CustomCursor'
import { ClickSpark } from '@/components/ui/ClickSpark'
import { GlobalListeners } from '@/components/GlobalListeners'

const creatoDisplay = localFont({
  src: [
    { path: '../../fonts/CreatoDisplay-Thin.otf', weight: '100', style: 'normal' },
    { path: '../../fonts/CreatoDisplay-Light.otf', weight: '300', style: 'normal' },
    { path: '../../fonts/CreatoDisplay-Regular.otf', weight: '400', style: 'normal' },
    { path: '../../fonts/CreatoDisplay-Medium.otf', weight: '500', style: 'normal' },
    { path: '../../fonts/CreatoDisplay-Bold.otf', weight: '700', style: 'normal' },
    { path: '../../fonts/CreatoDisplay-Black.otf', weight: '900', style: 'normal' },
    { path: '../../fonts/CreatoDisplay-ThinItalic.otf', weight: '100', style: 'italic' },
    { path: '../../fonts/CreatoDisplay-LightItalic.otf', weight: '300', style: 'italic' },
    { path: '../../fonts/CreatoDisplay-RegularItalic.otf', weight: '400', style: 'italic' },
    { path: '../../fonts/CreatoDisplay-MediumItalic.otf', weight: '500', style: 'italic' },
    { path: '../../fonts/CreatoDisplay-BoldItalic.otf', weight: '700', style: 'italic' },
    { path: '../../fonts/CreatoDisplay-BlackItalic.otf', weight: '900', style: 'italic' },
  ],
  variable: '--font-sans',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      </head>
      <body className={`${creatoDisplay.className} app-shell`} suppressHydrationWarning>
        <ThemeProvider storageKey="mysched-theme">
          <Script id="mysched-runtime-env" strategy="beforeInteractive">
            {`window.__MYSCHED_PUBLIC_ENV__ = Object.freeze(${serializedRuntimeEnv});`}
          </Script>
          <CustomCursor />
          <ClickSpark sparkCount={4} sparkRadius={12} sparkSize={7} duration={300} />
          <GlobalListeners />

          <SmoothScroll>
            <ToastProvider>{children}</ToastProvider>
          </SmoothScroll>
        </ThemeProvider>
      </body>
    </html>
  )
}
