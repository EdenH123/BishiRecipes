import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import PageTransition from '@/components/PageTransition'
import SplashScreen from '@/components/SplashScreen'
import { ThemeProvider } from '@/lib/theme'
import './globals.css'

export const metadata: Metadata = {
  title: 'BISHILicious',
  description: 'אפליקציית מתכונים משפחתית — שתפו, בשלו ותהנו יחד!',
  openGraph: {
    title: 'BISHILicious',
    description: 'אפליקציית מתכונים משפחתית — שתפו, בשלו ותהנו יחד!',
    siteName: 'BISHILicious',
    type: 'website',
    locale: 'he_IL',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BISHILicious',
    description: 'אפליקציית מתכונים משפחתית — שתפו, בשלו ותהנו יחד!',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@24,400,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-rubik">
        <ThemeProvider>
          <SplashScreen />
          <Toaster position="top-center" richColors dir="rtl" />
          <PageTransition>{children}</PageTransition>
        </ThemeProvider>
      </body>
    </html>
  )
}
