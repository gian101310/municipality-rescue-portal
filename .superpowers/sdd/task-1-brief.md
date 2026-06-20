### Task 1: Seed the idempotent global incident catalogue

Files:
- Create: rescue-portal/supabase/migrations/004_seed_global_emergency_types.sql

Requirements:
- Add exactly eleven global active emergency_types rows with organization_id = NULL.
- Names, icons, colors, descriptions, and sort orders:
  10 Medical Emergency / Stethoscope / #ef4444 / Urgent medical care, injury, or illness.
  20 Fire / Flame / #f97316 / Structure, vehicle, grass, or wildland fire.
  30 Flood / Waves / #0ea5e9 / Flooding, flash flood, or water rescue.
  40 Earthquake / Activity / #a855f7 / Earthquake damage, trapped persons, or aftershock risk.
  50 Typhoon / Severe Storm / CloudLightning / #6366f1 / Typhoon, severe storm, or weather emergency.
  60 Vehicular Accident / Car / #f59e0b / Vehicle collision or road traffic emergency.
  70 Structure Collapse / Building2 / #78716c / Collapsed building, landslide, or trapped persons.
  80 Crime / Violence / ShieldAlert / #dc2626 / Violence, threat, or public-safety emergency.
  90 Missing Person / UserSearch / #2563eb / Missing or lost person report.
  100 Animal Rescue / PawPrint / #16a34a / Injured, trapped, or dangerous animal.
  110 Other Emergency / AlertTriangle / #6b7280 / An emergency not represented by another category.
- triage_questions must be [] JSONB.
- The migration must be idempotent: never duplicate a global type name, case-insensitively.
- Do not modify existing tenant-specific types or application code.
- Follow TDD as applicable: document the pre-migration SQL assertion and post-migration verification in your report.
- Commit your work with: git commit -m "feat: seed global emergency types"
