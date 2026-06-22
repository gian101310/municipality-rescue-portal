-- The super-admin tenant UI provisions accounts with the Staff role.
-- Existing databases need this enum value before staff profiles can be inserted.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'staff';
