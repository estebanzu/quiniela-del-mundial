import './globals.css' 

export const metadata = {
  title: 'Quiniela Mundial',
  description: 'Quiniela para jugar con amigos',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}