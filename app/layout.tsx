export const metadata = { title: 'Watch Verify', description: 'White-label concierge & verification' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{fontFamily:'Inter,system-ui,Arial', background:'#0a0a0a', color:'#e5e5e5'}}>
        {children}
      </body>
    </html>
  )
}
