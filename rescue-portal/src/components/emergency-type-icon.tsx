import {
  Activity,
  CloudHail,
  Stethoscope,
  Flame,
  Waves,
  Car,
  UserSearch,
  ShieldAlert,
  PawPrint,
  CloudLightning,
  AlertTriangle,
  Siren,
  House,
  Search,
  Landmark,
  Cross,
  type LucideProps,
} from 'lucide-react'

const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  Activity,
  CloudHail,
  Stethoscope,
  Flame,
  Waves,
  Car,
  UserSearch,
  ShieldAlert,
  PawPrint,
  CloudLightning,
  AlertTriangle,
  Siren,
  House,
  Search,
  Landmark,
  Cross,
}

interface EmergencyTypeIconProps extends LucideProps {
  iconName: string
}

export function EmergencyTypeIcon({ iconName, ...props }: EmergencyTypeIconProps) {
  const Icon = ICON_MAP[iconName] ?? AlertTriangle
  return <Icon {...props} />
}
