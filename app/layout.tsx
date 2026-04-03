import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'בישי מתכונים',
  description: 'אפליקציית מתכונים משפחתית — שתפו, בשלו ותהנו יחד!',
  openGraph: {
    title: 'בישי מתכונים',
    description: 'אפליקציית מתכונים משפחתית — שתפו, בשלו ותהנו יחד!',
    siteName: 'בישי מתכונים',
    type: 'website',
    locale: 'he_IL',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'בישי מתכונים',
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-rubik">
        <Toaster position="top-center" richColors dir="rtl" />
        {children}
      </body>
    </html>
  )
}
