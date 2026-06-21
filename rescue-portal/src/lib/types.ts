// ============================================================
// ENUMS & LITERAL TYPES
// ============================================================

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'dispatcher'
  | 'team_leader'
  | 'responder'
  | 'verifier'
  | 'staff'
  | 'resident';

export type IncidentStatus =
  | 'submitted'
  | 'received'
  | 'verification_pending'
  | 'verified'
  | 'assigned'
  | 'accepted'
  | 'preparing'
  | 'dispatched'
  | 'on_the_way'
  | 'arrived'
  | 'operation_in_progress'
  | 'transporting'
  | 'resolved'
  | 'closed'
  | 'duplicate'
  | 'invalid'
  | 'false_alert'
  | 'cancelled'
  | 'unable_to_contact'
  | 'transferred';

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type ReporterRole = 'victim' | 'passerby';

export type IncidentIntakeState = 'incoming' | 'details_received';

export type RegistrationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'more_info_required'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type TeamStatus =
  | 'available'
  | 'assigned'
  | 'preparing'
  | 'dispatched'
  | 'on_scene'
  | 'returning'
  | 'off_duty'
  | 'unavailable';

export type NotificationType =
  | 'incident_new'
  | 'incident_update'
  | 'incident_assigned'
  | 'incident_resolved'
  | 'unit_status_change'
  | 'registration_update'
  | 'system'
  | 'alert';

export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'assign'
  | 'unassign'
  | 'status_change'
  | 'approve'
  | 'reject'
  | 'verify'
  | 'export'
  | 'view';

export type IdType =
  | 'national_id'
  | 'drivers_license'
  | 'passport'
  | 'philhealth'
  | 'sss'
  | 'gsis'
  | 'voters_id'
  | 'postal_id'
  | 'barangay_id'
  | 'senior_citizen_id'
  | 'pwd_id'
  | 'other';

export type TelegramMessageStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'retrying';

// ============================================================
// TRIAGE
// ============================================================

export interface TriageQuestion {
  id: string;
  question: string;
  type: 'boolean' | 'number' | 'text' | 'select';
  options?: string[];
  required: boolean;
  follow_up_if_true?: string;
}

export interface TriageAnswer {
  id: string;
  incident_id: string;
  question_id: string;
  question_text: string;
  answer: string | boolean | number;
  created_at: string;
}

// ============================================================
// EMERGENCY TYPE
// ============================================================

export interface EmergencyType {
  id: string;
  name: string;
  icon: string; // lucide icon name
  color: string; // tailwind color class or hex
  description: string;
  triage_questions: TriageQuestion[];
  is_active: boolean;
  sort_order: number;
  organization_id: string | null; // null = system-wide default
  created_at: string;
  updated_at: string;
}

// ============================================================
// ORGANIZATION & GEOGRAPHY
// ============================================================

export interface MapCenter {
  lat: number;
  lng: number;
}

export interface OrganizationBranding {
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  favicon_url: string | null;
  seal_url: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  province: string;
  region: string;
  logo_url: string | null;
  seal_url: string | null;
  emergency_hotline: string;
  secondary_hotline: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  map_center: MapCenter;
  map_zoom: number;
  branding: OrganizationBranding;
  is_active: boolean;
  subscription_tier: 'free' | 'basic' | 'pro' | 'enterprise';
  created_at: string;
  updated_at: string;
}

export interface Municipality {
  id: string;
  organization_id: string;
  name: string;
  province: string;
  region: string;
  zip_code: string | null;
  map_center: MapCenter;
  map_zoom: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Barangay {
  id: string;
  municipality_id: string;
  organization_id: string;
  name: string;
  captain_name: string | null;
  captain_phone: string | null;
  polygon_coordinates: [number, number][] | null;
  is_active: boolean;
  created_at: string;
}

// ============================================================
// USER PROFILES
// ============================================================

export interface UserProfile {
  id: string;
  user_id: string; // auth.users FK
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  organization_id: string;
  municipality_id: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResidentProfile extends UserProfile {
  date_of_birth: string | null;
  address: string;
  barangay: string;
  municipality: string;
  province: string;
  id_type: IdType | null;
  id_number: string | null;
  id_front_url: string | null;
  id_back_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  registration_status: RegistrationStatus;
  verified_at: string | null;
  verified_by: string | null; // user_id of verifier
  rejection_reason: string | null;
  more_info_request: string | null;
}

export interface StaffProfile extends UserProfile {
  employee_id: string | null;
  department: string | null;
  position: string | null;
  rescue_unit_id: string | null;
  telegram_user_id: string | null;
}

// ============================================================
// INCIDENTS
// ============================================================

export interface Incident {
  id: string;
  reference_number: string;
  organization_id: string;
  reporter_id: string | null; // null = anonymous
  reporter_name: string | null; // denormalized for quick display
  reporter_phone: string | null;
  reporter_role?: ReporterRole | null;
  emergency_type_id: string;
  emergency_type: EmergencyType | null; // joined
  severity: SeverityLevel;
  status: IncidentStatus;
  intake_state?: IncidentIntakeState;
  description: string;
  affected_count: number;
  has_unconscious: boolean;
  has_fire: boolean;
  has_flooding: boolean;
  has_violence: boolean;
  latitude: number;
  longitude: number;
  gps_accuracy: number | null; // meters
  address: string | null;
  barangay: string | null;
  municipality: string | null;
  assigned_unit_id: string | null;
  assigned_unit_name: string | null; // denormalized
  is_anonymous: boolean;
  is_drill: boolean;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
  dispatched_at: string | null;
  arrived_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  resolution_notes: string | null;
  // Relations (optional, joined)
  status_history?: IncidentStatusHistory[];
  notes?: IncidentNote[];
  assignments?: IncidentAssignment[];
  attachments?: IncidentAttachment[];
}

export interface IncidentLocation {
  id: string;
  incident_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  source: 'gps' | 'manual' | 'ip' | 'address_lookup';
  recorded_at: string;
}

export interface IncidentAssignment {
  id: string;
  incident_id: string;
  rescue_unit_id: string;
  rescue_unit_name: string | null; // denormalized
  assigned_by: string; // user_id
  assigned_by_name: string | null; // denormalized
  accepted_by: string | null; // user_id
  accepted_by_name: string | null;
  status: 'assigned' | 'accepted' | 'declined' | 'cancelled' | 'completed';
  assigned_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  completed_at: string | null;
  decline_reason: string | null;
}

export interface IncidentNote {
  id: string;
  incident_id: string;
  user_id: string;
  user_name: string; // denormalized
  user_role: UserRole; // denormalized
  note: string;
  is_internal: boolean; // internal notes not visible to resident
  created_at: string;
  updated_at: string | null;
}

export interface IncidentAttachment {
  id: string;
  incident_id: string;
  uploaded_by: string; // user_id
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number; // bytes
  description: string | null;
  created_at: string;
}

export interface IncidentStatusHistory {
  id: string;
  incident_id: string;
  previous_status: IncidentStatus | null;
  new_status: IncidentStatus;
  changed_by: string; // user_id
  changed_by_name: string; // denormalized
  changed_by_role: UserRole; // denormalized
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface FalseAlertReview {
  id: string;
  incident_id: string;
  reviewed_by: string; // user_id
  reviewed_by_name: string;
  finding: 'confirmed_false' | 'confirmed_real' | 'inconclusive';
  notes: string | null;
  created_at: string;
}

// ============================================================
// RESCUE UNITS
// ============================================================

export interface VehicleInfo {
  plate_number: string | null;
  type: 'ambulance' | 'fire_truck' | 'rescue_vehicle' | 'motorcycle' | 'boat' | 'other' | null;
  model: string | null;
  color: string | null;
  capacity: number | null;
}

export interface RescueUnit {
  id: string;
  name: string;
  code: string; // e.g. "ALPHA-1"
  organization_id: string;
  municipality_id: string | null;
  team_leader_id: string | null; // user_id
  team_leader_name: string | null; // denormalized
  status: TeamStatus;
  contact_number: string | null;
  vehicle_info: VehicleInfo | null;
  equipment: string[];
  specializations: string[];
  telegram_chat_id: string | null;
  current_lat: number | null;
  current_lng: number | null;
  last_location_update: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations (optional, joined)
  members?: RescueUnitMember[];
}

export interface RescueUnitMember {
  id: string;
  unit_id: string;
  user_id: string;
  user_name: string | null; // denormalized
  role: 'team_leader' | 'member';
  is_active: boolean;
  joined_at: string;
  left_at: string | null;
}

// ============================================================
// AUDIT & LOGGING
// ============================================================

export interface AuditLog {
  id: string;
  actor_id: string | null; // null = system
  actor_name: string;
  actor_role: UserRole | 'system';
  action: AuditAction;
  entity_type: string; // e.g. 'incident', 'user', 'rescue_unit'
  entity_id: string | null;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  organization_id: string | null;
  created_at: string;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export interface Notification {
  id: string;
  user_id: string;
  organization_id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  incident_id: string | null;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ============================================================
// TELEGRAM
// ============================================================

export interface TelegramDeliveryLog {
  id: string;
  chat_id: string;
  message_id: string | null; // Telegram message_id after send
  message_type: 'incident_alert' | 'status_update' | 'assignment' | 'system' | 'test';
  incident_id: string | null;
  payload: Record<string, unknown> | null;
  status: TelegramMessageStatus;
  error_message: string | null;
  retry_count: number;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// SYSTEM SETTINGS
// ============================================================

export interface SystemSetting {
  id: string;
  organization_id: string;
  key: string;
  value: unknown;
  description: string | null;
  is_public: boolean; // whether NEXT_PUBLIC_ accessible
  updated_by: string | null;
  updated_at: string;
}

export interface DeviceSession {
  id: string;
  user_id: string;
  device_id: string;
  device_name: string | null;
  platform: 'web' | 'ios' | 'android';
  push_token: string | null;
  ip_address: string | null;
  user_agent: string | null;
  last_active_at: string;
  created_at: string;
  is_active: boolean;
}

// ============================================================
// RESIDENT VERIFICATION
// ============================================================

export interface ResidentVerification {
  id: string;
  resident_id: string; // user_id
  verifier_id: string | null; // user_id
  status: RegistrationStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// DEMO DATA TYPES
// ============================================================

export interface DemoIncident extends Omit<Incident, 'emergency_type'> {
  emergency_type: Pick<EmergencyType, 'id' | 'name' | 'icon' | 'color'>;
  timeline: DemoTimelineEntry[];
}

export interface DemoTimelineEntry {
  id: string;
  incident_id: string;
  status: IncidentStatus;
  label: string;
  note: string | null;
  actor_name: string;
  actor_role: UserRole | 'system';
  created_at: string;
}

export interface DemoStats {
  total_incidents_today: number;
  active_incidents: number;
  resolved_today: number;
  average_response_time_minutes: number;
  available_units: number;
  total_units: number;
  pending_registrations: number;
  critical_incidents: number;
  incidents_by_type: Record<string, number>;
  incidents_by_status: Partial<Record<IncidentStatus, number>>;
  incidents_by_severity: Record<SeverityLevel, number>;
}

// ============================================================
// API RESPONSE WRAPPERS
// ============================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  error: string | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================
// FORM TYPES
// ============================================================

export interface EmergencyReportForm {
  emergency_type_id: string;
  description: string;
  affected_count: number;
  has_unconscious: boolean;
  has_fire: boolean;
  has_flooding: boolean;
  has_violence: boolean;
  latitude: number | null;
  longitude: number | null;
  gps_accuracy: number | null;
  address: string;
  barangay: string;
  reporter_name: string;
  reporter_phone: string;
  is_anonymous: boolean;
  triage_answers: Record<string, string | boolean | number>;
}

export interface IncidentAssignForm {
  rescue_unit_id: string;
  notes: string;
}

export interface IncidentStatusUpdateForm {
  new_status: IncidentStatus;
  reason: string;
  note: string;
}

export interface ResidentRegistrationForm {
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: string;
  barangay: string;
  municipality: string;
  province: string;
  id_type: IdType;
  id_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
}
