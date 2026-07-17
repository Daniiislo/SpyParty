-- Data migration: normalize Topic.sortOrder to a unique, sequential 0..N-1.
--
-- The in-repo bootstrap seed (5 topics at sortOrder 0..4) collided with the
-- hand-imported topic set, leaving duplicate/gapped sortOrder values
-- (e.g. two rows at 0, 3 and 4) which made the topic picker order unstable.
-- Renumber deterministically by (sortOrder, nameVi, slug). Idempotent:
-- re-running produces the same assignment, and the DISTINCT-FROM guard skips
-- rows that are already correct.
WITH ordered AS (
  SELECT
    "id",
    (ROW_NUMBER() OVER (ORDER BY "sortOrder" ASC, "nameVi" ASC, "slug" ASC) - 1) AS rn
  FROM "spy_party"."Topic"
)
UPDATE "spy_party"."Topic" AS t
SET "sortOrder" = o.rn
FROM ordered AS o
WHERE t."id" = o."id"
  AND t."sortOrder" IS DISTINCT FROM o.rn;
