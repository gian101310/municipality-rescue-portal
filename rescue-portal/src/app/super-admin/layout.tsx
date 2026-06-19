import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Platform Admin | Emergency Rescue Portal',
  description: 'Super administrator panel for managing all Emergency Rescue Portal tenants',
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  ret