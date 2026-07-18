-- Replace the plain roomId index with a composite (roomId, createdAt) index.
-- The hot read (`loadRoom`) selects the latest match — where roomId, order by
-- createdAt desc, take 1 — so the composite serves both the filter and the sort.
DROP INDEX "spy_party"."Match_roomId_idx";
CREATE INDEX "Match_roomId_createdAt_idx" ON "spy_party"."Match"("roomId", "createdAt");
