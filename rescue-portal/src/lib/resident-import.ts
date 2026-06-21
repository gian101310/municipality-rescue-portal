export const RESIDENT_CSV_HEADER = 'Full Name,Phone,Email,Barangay,Address,Emergency Contact Name,Emergency Contact Phone,Relationship'

export function buildResidentCsvTemplate() {
  return `${RESIDENT_CSV_HEADER}\nAna Lopez Cruz,09175550001,ana@example.com,Your Barangay,22 Rizal Street,Juan Lopez,09175550002,Parent\n`
}
