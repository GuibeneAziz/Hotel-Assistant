import './globals.css'
import { Inter, Playfair_Display } from 'next/font/google'
import { LanguageProvider } from '@/lib/i18n'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
})

export const metadata = {
  title: 'Sindbad Luxury — Smart Hotel AI Suite',
  description: 'Your personal AI concierge for premium hotels in Tunisia',
  keywords: 'Tunisia, hotels, AI assistant, concierge, luxury travel',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#121212" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  )
}
