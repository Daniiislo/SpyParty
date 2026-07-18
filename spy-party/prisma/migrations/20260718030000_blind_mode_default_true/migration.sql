-- Blind mode is now the default: roles are hidden unless the host opts into
-- revealing them ("Hiện vai trò"). Only affects rows created without an explicit
-- value (createRoom always sets it explicitly); existing rooms are unchanged.
ALTER TABLE "spy_party"."Room" ALTER COLUMN "blindMode" SET DEFAULT true;
