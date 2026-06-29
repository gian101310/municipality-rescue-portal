/**
 * Minimal Database type stub.
 * Replace with the output of `supabase gen types typescript --linked`
 * once the schema migration has been applied.
 */
export type Database = {
  public: {
    Tables: {
      organizations: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      municipalities: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      barangays: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      user_profiles: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      resident_verifications: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      incidents: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      incident_locations: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      incident_assignments: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      incident_status_history: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      incident_notes: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      incident_attachments: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      rescue_units: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      rescue_unit_members: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      emergency_types: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      notifications: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      telegram_delivery_logs: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      audit_logs: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      system_settings: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      device_sessions: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      false_alert_reviews: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      triage_answers: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      organization_geo_scopes: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
    }
    Views: Record<string, never>
    Functions: {
      assign_incident_team: {
        Args: { p_incident_id: string; p_rescue_unit_id: string; p_actor_profile_id: string }
        Returns: Record<string, unknown>
      }
      create_resident_sos: {
        Args: { p_payload: Record<string, unknown> }
        Returns: Record<string, unknown>
      }
    }
    Enums: {
      user_role: 'super_admin' | 'admin' | 'dispatcher' | 'team_leader' | 'responder' | 'verifier' | 'staff' | 'resident'
      incident_status: 'submitted' | 'received' | 'verification_pending' | 'verified' | 'assigned' | 'accepted' | 'preparing' | 'dispatched' | 'on_the_way' | 'arrived' | 'operation_in_progress' | 'transporting' | 'resolved' | 'closed' | 'duplicate' | 'invalid' | 'false_alert' | 'cancelled' | 'unable_to_contact' | 'transferred'
      severity_level: 'critical' | 'high' | 'medium' | 'low' | 'info'
      team_status: 'available' | 'assigned' | 'preparing' | 'dispatched' | 'on_scene' | 'returning' | 'off_duty' | 'unavailable'
      registration_status: 'draft' | 'submitted' | 'under_review' | 'more_info_required' | 'approved' | 'rejected' | 'suspended'
      geography_scope_level: 'country' | 'region' | 'province' | 'municipality'
    }
  }
}
