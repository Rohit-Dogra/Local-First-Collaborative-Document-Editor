-- Optional PostgreSQL Row Level Security policies
-- Run manually after deployment for defense-in-depth tenant isolation.
-- Prisma also enforces access in application code via getDocumentAccess().

-- ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "DocumentMember" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Operation" ENABLE ROW LEVEL SECURITY;

-- Example policy: users only see documents they own or are members of
-- CREATE POLICY document_access ON "Document"
--   FOR ALL
--   USING (
--     "ownerId" = current_setting('app.user_id', true)
--     OR EXISTS (
--       SELECT 1 FROM "DocumentMember" m
--       WHERE m."documentId" = "Document".id
--         AND m."userId" = current_setting('app.user_id', true)
--     )
--   );
