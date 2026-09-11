ALTER TYPE "RequestStatus" RENAME TO "RequestStatus_old";

CREATE TYPE "RequestStatus" AS ENUM (
  'CHO_TIEP_NHAN',
  'DANG_THUC_HIEN',
  'HOAN_THANH',
  'HUY_BO'
);

CREATE TYPE "MissionStatus" AS ENUM (
  'CHO_TIEP_NHAN',
  'DANG_TUYEN',
  'DA_DU_DOI',
  'DA_DU_HANG',
  'SAN_SANG',
  'DANG_THUC_HIEN',
  'HOAN_THANH',
  'HUY_BO'
);

CREATE TYPE "VolunteerRequestStatus" AS ENUM (
  'CHO_TIEP_NHAN',
  'DA_TIEP_NHAN',
  'DANG_XU_LY',
  'HOAN_THANH',
  'HUY_BO'
);

CREATE TYPE "DonorGoodsStatus" AS ENUM (
  'CHO_TIEP_NHAN',
  'DANG_XU_LY',
  'HOAN_THANH',
  'HUY_BO'
);

ALTER TABLE "RescueRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "VolunteerRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Mission" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "DonorGoods" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "RescueRequest"
  ALTER COLUMN "status" TYPE "RequestStatus"
  USING (
    CASE
      WHEN "status"::text IN ('CHO_TIEP_NHAN', 'HOAN_THANH', 'HUY_BO') THEN "status"::text
      ELSE 'DANG_THUC_HIEN'
    END
  )::"RequestStatus";

ALTER TABLE "VolunteerRequest"
  ALTER COLUMN "status" TYPE "VolunteerRequestStatus"
  USING (
    CASE
      WHEN "status"::text IN ('DA_TIEP_NHAN', 'DANG_XU_LY', 'HOAN_THANH', 'HUY_BO') THEN "status"::text
      ELSE 'CHO_TIEP_NHAN'
    END
  )::"VolunteerRequestStatus";

ALTER TABLE "Mission"
  ALTER COLUMN "status" TYPE "MissionStatus"
  USING (
    CASE
      WHEN "status"::text IN ('DANG_TUYEN', 'DA_DU_DOI', 'DA_DU_HANG', 'SAN_SANG', 'DANG_THUC_HIEN', 'HOAN_THANH', 'HUY_BO') THEN "status"::text
      ELSE 'CHO_TIEP_NHAN'
    END
  )::"MissionStatus";

ALTER TABLE "DonorGoods"
  ALTER COLUMN "status" TYPE "DonorGoodsStatus"
  USING (
    CASE
      WHEN "status"::text IN ('DANG_XU_LY', 'HOAN_THANH', 'HUY_BO') THEN "status"::text
      ELSE 'CHO_TIEP_NHAN'
    END
  )::"DonorGoodsStatus";

ALTER TABLE "RescueRequest" ALTER COLUMN "status" SET DEFAULT 'CHO_TIEP_NHAN';
ALTER TABLE "VolunteerRequest" ALTER COLUMN "status" SET DEFAULT 'CHO_TIEP_NHAN';
ALTER TABLE "Mission" ALTER COLUMN "status" SET DEFAULT 'CHO_TIEP_NHAN';
ALTER TABLE "DonorGoods" ALTER COLUMN "status" SET DEFAULT 'HOAN_THANH';

DROP TYPE "RequestStatus_old";
