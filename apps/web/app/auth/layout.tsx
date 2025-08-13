export const metadata = {
  title: 'CalvaryPay - Authentication',
  description: 'Sign in to your CalvaryPay account',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-950">
      {children}
    </div>
  )
}
