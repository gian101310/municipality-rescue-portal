import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Platform Admin | RescuePortal',
  description: 'Super administrator panel for managing all RescuePortal tenants',
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
