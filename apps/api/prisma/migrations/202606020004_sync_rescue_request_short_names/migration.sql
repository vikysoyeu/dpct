UPDATE "RescueRequest"
SET "name" = 'Yêu cầu cứu trợ #' || "code";

UPDATE "Location" l
SET "name" = 'Yêu cầu cứu trợ #' || rr."code"
FROM "RescueRequest" rr
JOIN (
  SELECT "locationId"
  FROM "RescueRequest"
  GROUP BY "locationId"
  HAVING COUNT(*) = 1
) single_request_location ON single_request_location."locationId" = rr."locationId"
WHERE l."id" = rr."locationId";
