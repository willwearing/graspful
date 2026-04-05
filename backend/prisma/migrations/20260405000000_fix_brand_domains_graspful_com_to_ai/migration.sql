-- Fix brand domains: rewrite legacy .graspful.com suffix to canonical .graspful.ai
UPDATE "brands"
SET "domain" = regexp_replace("domain", '\.graspful\.com$', '.graspful.ai')
WHERE "domain" LIKE '%.graspful.com';
