export function getEmergencyTypeScopeFilter(organizationId?: string | null) {
  const normalizedOrganizationId = organizationId?.trim()

  return normalizedOrganizationId
    ? `organization_id.is.null,organization_id.eq.${normalizedOrganizationId}`
    : 'organization_id.is.null'
}

export function isEmergencyTypeAvailableToOrganization(
  emergencyTypeOrganizationId: string | null | undefined,
  organizationId: string
) {
  return emergencyTypeOrganizationId === null
    || emergencyTypeOrganizationId === undefined
    || emergencyTypeOrganizationId === organizationId
}
