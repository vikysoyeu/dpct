UPDATE "RescueRequest"
SET "status" = 'DANG_TUYEN'::"RequestStatus"
WHERE "status" = 'DANG_XU_LY'::"RequestStatus";

UPDATE "Mission"
SET "status" = 'DANG_TUYEN'::"RequestStatus"
WHERE "status" = 'DANG_XU_LY'::"RequestStatus";

UPDATE "VolunteerRequest"
SET "status" = 'DA_TIEP_NHAN'::"RequestStatus"
WHERE "status" = 'DANG_XU_LY'::"RequestStatus";

CREATE OR REPLACE FUNCTION rescue_request_code_from_number(input_value BIGINT)
RETURNS TEXT AS $$
DECLARE
  alphabet CONSTANT TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  value BIGINT := GREATEST(input_value, 0);
  output TEXT := '';
  remainder INT;
BEGIN
  LOOP
    remainder := (value % 36)::INT;
    output := substr(alphabet, remainder + 1, 1) || output;
    value := value / 36;
    EXIT WHEN value = 0;
  END LOOP;

  RETURN right('00000' || output, 5);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION generate_rescue_request_code()
RETURNS TEXT AS $$
DECLARE
  alphabet CONSTANT TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  generated_code TEXT;
BEGIN
  LOOP
    SELECT string_agg(substr(alphabet, floor(random() * 36)::INT + 1, 1), '')
    INTO generated_code
    FROM generate_series(1, 5);

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM "RescueRequest" WHERE "code" = generated_code
    );
  END LOOP;

  RETURN generated_code;
END;
$$ LANGUAGE plpgsql VOLATILE;

ALTER TABLE "RescueRequest" ADD COLUMN "code" VARCHAR(5);

UPDATE "RescueRequest" rr
SET "code" = rescue_request_code_from_number(seq.row_number)
FROM (
  SELECT "id", row_number() OVER (ORDER BY "submittedAt", "id") AS row_number
  FROM "RescueRequest"
) seq
WHERE rr."id" = seq."id";

ALTER TABLE "RescueRequest" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "RescueRequest" ALTER COLUMN "code" SET DEFAULT generate_rescue_request_code();
CREATE UNIQUE INDEX "RescueRequest_code_key" ON "RescueRequest"("code");
