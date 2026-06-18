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
}

interface EmergencyTypeIconProps extends LucideProps {
  iconName: string
}

export function EmergencyTypeIcon({ iconName, ...props }: EmergencyTypeIconProps) {
  const Icon = ICON_MAP[iconName] ?? AlertTriangle
  return <Icon {...props} />
}
