import './globals.css'
import { Inter } from 'next/font/google'
import { LanguageProvider } from '@/lib/i18n'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  title: 'Tunisia Hotel Assistant',
  description: 'Your personal tourist assistant for the best hotels in Tunisia',
  keywords: 'Tunisia, hotels, AI assistant, concierge, travel',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#1e40af" />
      </head>
      <body className={inter.className}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  )
}