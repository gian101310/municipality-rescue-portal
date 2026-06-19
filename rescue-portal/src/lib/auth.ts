import { redirect } from 'next/navigation'
import { createClient } from './supabase/server'
import type { UserRole, UserProfile } from './types'

// ============================================================
// PERMISSIONS MAP
// ============================================================

export type Permission =
  // Incident permissions
  | 'incidents:view_all'
  | 'incidents:view_own'
  | 'incidents:create'
  | 'incidents:update_status'
  | 'incidents:assign_unit'
  | 'incidents:verify'
  | 'incidents:close'
  | 'incidents:delete'
  | 'incidents:view_internal_notes'
  | 'incidents:add_internal_note'
  | 'incidents:export'
  // Resident permissions
  | 'residents:view_all'
  | 'residents:verify'
  | 'residents:approve'
  | 'residents:reject'
  | 'residents:suspend'
  // Rescue unit permissions
  | 'units:view_all'
  | 'units:manage'
  | 'units:update_status'
  | 'units:view_own'
  // User management
  | 'users:view_all'
  | 'users:create'
  | 'users:update'
  | 'users:deactivate'
  // Dashboard & reports
  | 'dashboard:view_admin'
  | 'dashboard:view_responder'
  | 'reports:view'
  | 'reports:export'
  // Organization settings
  | 'settings:view'
  | 'settings:update'
  // Audit logs
  | 'audit_logs:view'
  // Telegram
  | 'telegram:send'

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: [
    'incidents:view_all', 'incidents:create', 'incidents:update_status',
    'incidents:assign_unit', 'incidents:verify', 'incidents:close',
    'incidents:delete', 'incidents:view_internal_notes', 'incidents:add_internal_note',
    'incidents:export',
    'residents:view_all', 'residents:verify', 'residents:approve',
    'residents:reject', 'residents:suspend',
    'units:view_all', 'units:manage', 'units:update_status',
    'users:view_all', 'users:create', 'users:update', 'users:deactivate',
    'dashboard:view_admin', 'dashboard:view_responder',
    'reports:view', 'reports:export',
    'settings:view', 'settings:update',
    'audit_logs:view',
    'telegram:send',
  ],
  admin: [
    'incidents:view_all', 'incidents:create', 'incidents:update_status',
    'incidents:assign_unit', 'incidents:verify', 'incidents:close',
    'incidents:view_internal_notes', 'incidents:add_internal_note',
    'incidents:export',
    'residents:view_all', 'residents:verify', 'residents:approve',
    'residents:reject', 'residents:suspend',
    'units:view_all', 'units:manage', 'units:update_status',
    'users:view_all', 'users:create', 'users:update', 'users:deactivate',
    'dashboard:view_admin', 'dashboard:view_responder',
    'reports:view', 'reports:export',
    'settings:view',
    'audit_logs:view',
    'telegram:send',
  ],
  dispatcher: [
    'incidents:view_all', 'incidents:update_status', 'incidents:assign_unit',
    'incidents:verify', 'incidents:close', 'incidents:view_internal_notes',
    'incidents:add_internal_note',
    'units:view_all', 'units:update_status',
    'dashboard:view_admin',
    'telegram:send',
  ],
  team_leader: [
    'incidents:view_all', 'incidents:update_status',
    'incidents:view_internal_notes', 'incidents:add_internal_note',
    'units:view_own', 'units:update_status',
    'dashboard:view_responder',
  ],
  responder: [
    'incidents:view_all', 'incidents:update_status',
    'incidents:add_internal_note',
    'units:view_own',
    'dashboard:view_responder',
  ],
  verifier: [
    'incidents:view_all', 'incidents:verify',
    'incidents:view_internal_notes', 'incidents:add_internal_note',
    'residents:view_all', 'residents:verify', 'residents:approve',
    'residents:reject',
    'dashboard:view_admin',
  ],
  resident: [
    'incidents:view_own', 'incidents:create',
  ],
}

// ============================================================
// PERMISSION CHECK
// ============================================================

/**
 * Returns true if the given role has the specified permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions.includes(permission)
}

/**
 * Returns true if the given role has ALL specified permissions.
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p))
}

/**
 * Returns true if the given role has ANY of the specified permissions.
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

// ============================================================
// ROLE HELPERS
// ============================================================

export function isAdminRole(role: UserRole): boolean {
  return role === 'super_admin' || role === 'admin'
}

export function isStaffRole(role: UserRole): boolean {
  return role !== 'resident'
}

export function isResponderRole(role: UserRole): boolean {
  return role === 'team_leader' || role === 'responder'
}

// Admin portal redirect path by role
export function getDefaultRoute(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return '/super-admin'
    case 'admin':
    case 'dispatcher':
    case 'verifier':
      return '/admin'
    case 'team_leader':
    case 'responder':
      return '/admin/teams'
    case 'resident':
      return '/resident'
    default:
      return '/'
  }
}

// ============================================================
// SERVER-SIDE AUTH HELPERS
// ============================================================

/**
 * Returns the current authenticated Supabase user, or null if not logged in.
 * Safe to call from Server Components and Route Handlers.
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  } catch {
    return null
  }
}

/**
 * Returns the full user profile row from user_profiles for the current session user.
 * Returns null if not authenticated or profile not found.
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return null

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error || !data) return null
    return data as unknown as UserProfile
  } catch {
    return null
  }
}

/**
 * Server-side auth guard. Call at the top of a Server Component or Server Action.
 *
 * - If no user is authenticated, redirects to /auth/login.
 * - If allowedRoles is provided and the user's role is not included, redirects with an unauthorized error.
 * - Returns the UserProfile on success.
 */
export async function requireAuth(allowedRoles?: UserRole[]): Promise<UserProfile> {
  const profile = await getUserProfile()

  if (!profile) {
    redirect('/auth/login')
  }

  if (!profile.is_active) {
    redirect('/auth/login?error=account-suspended')
  }

  const registrationStatus = (profile as UserProfile & { registration_status?: string | null }).registration_status
  if (registrationStatus === 'suspended') {
    redirect('/auth/login?error=account-suspended')
  }

  if (profile.role === 'resident' && registrationStatus !== 'approved') {
    redirect('/auth/login?error=account-pending')
  }

  if (profile.role !== 'resident' && registrationStatus && registrationStatus !== 'approved') {
    redirect('/auth/login?error=account-pending')
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
    redirect('/auth/login?error=unauthorized')
  }

  return profile
}

/**
 * Requires the user to be any staff member (not a resident).
 * Redirects with an unauthorized error if the user is a resident.
 */
export async function requireStaff(): Promise<UserProfile> {
  return requireAuth(['super_admin', 'admin', 'dispatcher', 'team_leader', 'responder', 'verifier'])
}

/**
 * Requires the user to be an admin or super_admin.
 */
export async function requireAdmin(): Promise<UserProfile> {
  return requireAuth(['super_admin', 'admin'])
}

/**
 * Requires a specific permission. Redirects with an unauthorized error if not met.
 */
export async function requirePermission(permission: Permission): Promise<UserProfile> {
  const profile = await requireAuth()
  if (!hasPermission(profile.role, permission)) {
    redirect('/auth/login?error=unauthorized')
  }
  return profile
}
