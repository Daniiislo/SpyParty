-- Add blind mode: players are not told their role (spy vs civilian) until the
-- match ends. Mr. White is mutually exclusive with blind mode (enforced in app).
ALTER TABLE "spy_party"."Room" ADD COLUMN "blindMode" BOOLEAN NOT NULL DEFAULT false;
