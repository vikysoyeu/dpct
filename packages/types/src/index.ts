// ─── Enums ────────────────────────────────────────────────────────────────────

export enum UserRole {
  VICTIM = "VICTIM",
  VOLUNTEER = "VOLUNTEER",
  COORDINATOR = "COORDINATOR",
  ADMIN = "ADMIN",
  ADMIN_TNV = "ADMIN_TNV",
  ADMIN_YCCT = "ADMIN_YCCT",
  ADMIN_KHO = "ADMIN_KHO"
}

export enum LocationType {
  STAGING_AREA = "STAGING_AREA",
  VICTIM_AREA = "VICTIM_AREA",
  TRANSIT_POINT = "TRANSIT_POINT",
  URGENT_NEED = "URGENT_NEED",
  NEED_POINT = "NEED_POINT",
  BLOCKED_ROAD = "BLOCKED_ROAD",
  FOOD_SUPPORT = "FOOD_SUPPORT",
  REST_STOP = "REST_STOP"
}

export enum LocationStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  DONE = "DONE",
  EXPIRED = "EXPIRED"
}

export enum NeedCategory {
  MANPOWER = "MANPOWER",
  FOOD = "FOOD",
  MEDICINE = "MEDICINE",
  EQUIPMENT = "EQUIPMENT",
  VEHICLE = "VEHICLE",
  OTHER = "OTHER"
}

export enum NeedStatus {
  UNMET = "UNMET",
  PARTIAL = "PARTIAL",
  MET = "MET"
}

export enum VolunteerStatus {
  AVAILABLE = "AVAILABLE",
  ON_MISSION = "ON_MISSION",
  RESTING = "RESTING"
}

export enum SystemStatus {
  HOAT_DONG = "HOAT_DONG",
  TAM_DUNG = "TAM_DUNG",
  KHOA = "KHOA",
  CHO_DUYET = "CHO_DUYET"
}

export enum TeamMemberRole {
  DOI_TRUONG = "DOI_TRUONG",
  DOI_PHO = "DOI_PHO",
  THANH_VIEN = "THANH_VIEN",
  CONG_TAC_VIEN = "CONG_TAC_VIEN"
}

export enum PriorityLevel {
  THAP = "THAP",
  TRUNG_BINH = "TRUNG_BINH",
  CAO = "CAO",
  KHAN_CAP = "KHAN_CAP"
}

export enum RequestStatus {
  CHO_TIEP_NHAN = "CHO_TIEP_NHAN",
  DANG_THUC_HIEN = "DANG_THUC_HIEN",
  HOAN_THANH = "HOAN_THANH",
  HUY_BO = "HUY_BO"
}

export enum MissionStatus {
  CHO_TIEP_NHAN = "CHO_TIEP_NHAN",
  DANG_TUYEN = "DANG_TUYEN",
  DA_DU_DOI = "DA_DU_DOI",
  DA_DU_HANG = "DA_DU_HANG",
  SAN_SANG = "SAN_SANG",
  DANG_THUC_HIEN = "DANG_THUC_HIEN",
  HOAN_THANH = "HOAN_THANH",
  HUY_BO = "HUY_BO"
}

export enum VolunteerRequestStatus {
  CHO_TIEP_NHAN = "CHO_TIEP_NHAN",
  DA_TIEP_NHAN = "DA_TIEP_NHAN",
  DANG_XU_LY = "DANG_XU_LY",
  HOAN_THANH = "HOAN_THANH",
  HUY_BO = "HUY_BO"
}

export enum DonorGoodsStatus {
  CHO_TIEP_NHAN = "CHO_TIEP_NHAN",
  DANG_XU_LY = "DANG_XU_LY",
  HOAN_THANH = "HOAN_THANH",
  HUY_BO = "HUY_BO"
}

export enum TransactionType {
  THU = "THU",
  CHI = "CHI"
}

export enum TransactionStatus {
  THANH_CONG = "THANH_CONG",
  THAT_BAI = "THAT_BAI",
  CHO_DOI_SOAT = "CHO_DOI_SOAT"
}

export enum TransactionMethod {
  BANK_TRANSFER = "BANK_TRANSFER",
  CASH = "CASH"
}

export enum EmailTemplateTrigger {
  RESCUE_REQUEST_SUBMITTED = "RESCUE_REQUEST_SUBMITTED",
  RESCUE_REQUEST_APPROVED = "RESCUE_REQUEST_APPROVED",
  SPONSORSHIP_SUBMITTED = "SPONSORSHIP_SUBMITTED",
  SPONSORSHIP_APPROVED = "SPONSORSHIP_APPROVED",
  VOLUNTEER_JOIN_REQUEST_SUBMITTED = "VOLUNTEER_JOIN_REQUEST_SUBMITTED",
  VOLUNTEER_JOIN_REQUEST_APPROVED = "VOLUNTEER_JOIN_REQUEST_APPROVED",
  VOLUNTEER_ACCOUNT_APPROVED = "VOLUNTEER_ACCOUNT_APPROVED",
  VOLUNTEER_PASSWORD_RESET = "VOLUNTEER_PASSWORD_RESET",
  DONATION_CONFIRMED = "DONATION_CONFIRMED"
}

export enum EmailDeliveryStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
  SKIPPED = "SKIPPED"
}

// ─── Data types ───────────────────────────────────────────────────────────────

export type Coordinates = {
  lat: number;
  lng: number;
};

export type Location = {
  id: string;
  type: LocationType;
  status: LocationStatus;
  priority?: PriorityLevel;
  name: string;
  description?: string | null;
  province?: string | null;
  ward?: string | null;
  address?: string | null;
  lat: number;
  lng: number;
  urgency: number;
  imageUrls: string[];
  reportedById?: string | null;
  verifiedById?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  needs?: Need[];
  inventory?: InventoryItem[];
  reportedBy?: UserSummary | null;
  verifiedBy?: UserSummary | null;
  locationUpdates?: LocationUpdate[];
  rescueRequests?: RescueRequest[];
  missions?: Mission[];
};

export type UserSummary = {
  id: string;
  username?: string | null;
  email?: string | null;
  role: UserRole;
  name: string;
  phone: string;
};

export type Need = {
  id: string;
  locationId: string;
  category: NeedCategory;
  item: string;
  quantity: number;
  unit: string;
  status: NeedStatus;
  priority?: PriorityLevel;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  userId?: string;
  username?: string | null;
  email?: string | null;
  role: UserRole;
  status: VolunteerStatus;
  accountStatus?: SystemStatus;
  name: string;
  phone: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  ward?: string | null;
  skills: string[];
  vehicleType?: string | null;
  availability?: string | null;
  experience?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  teamId?: string | null;
  team?: VolunteerTeam | null;
  createdAt: string;
  updatedAt: string;
};

export type Volunteer = User & {
  userId: string;
  role: UserRole.VOLUNTEER;
};

export type VolunteerTeam = {
  id: string;
  name: string;
  city?: string | null;
  ward?: string | null;
  description?: string | null;
  status?: SystemStatus;
  volunteers?: Volunteer[];
  createdAt: string;
  updatedAt: string;
};

export type InventoryItem = {
  id: string;
  locationId: string;
  item: string;
  quantity: number;
  unit: string;
  lastUpdatedById?: string | null;
  lastUpdatedBy?: UserSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type Role = {
  id: number;
  name: string;
  description?: string | null;
};

export type LocationUpdate = {
  id: string;
  locationId: string;
  userId?: string | null;
  imageUrl?: string | null;
  content?: string | null;
  createdAt: string;
  user?: UserSummary;
};

export type RescueRequest = {
  id: string;
  code: string;
  locationId: string;
  submittedById?: string | null;
  name: string;
  content?: string | null;
  priority: PriorityLevel;
  status: RequestStatus;
  submittedAt: string;
  requesterName?: string | null;
  requesterPhone?: string | null;
  requesterEmail?: string | null;
  requesterTitle?: string | null;
  requestItems?: RescueRequestItem[];
};

export type VolunteerRequest = {
  id: string;
  volunteerId: string;
  requestId: string;
  status: VolunteerRequestStatus;
  note?: string | null;
  submittedAt: string;
  volunteer?: Volunteer;
};

export type Transportation = {
  id: string;
  missionId: string;
  vehicleType: string;
  vehiclePlate: string;
  driverName: string;
  driverPhone: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Mission = {
  id: string;
  locationId: string;
  requestId?: string | null;
  name: string;
  missionType?: string | null;
  priority: PriorityLevel;
  status: MissionStatus;
  startedAt?: string | null;
  endedAt?: string | null;
  itemAssignmentsInitialized?: boolean;
  rescueTeams: RescueTeam[];
  transportations: Transportation[];
  itemAssignments?: MissionItemAssignment[];
};

export type RescueTeam = {
  id: string;
  missionId?: string | null;
  name: string;
  type?: string | null;
  status: SystemStatus;
  members: RescueTeamMember[];
  createdAt: string;
  updatedAt: string;
};

export type RescueTeamMember = {
  userId: string;
  teamId: string;
  role: TeamMemberRole;
  joinedAt: string;
  user: Volunteer;
};

export type ItemCategory = {
  id: string;
  name: string;
  groupName?: string | null;
  unit: string;
  createdAt: string;
  updatedAt: string;
};

export type RescueRequestItem = {
  rescueRequestId: string;
  itemCategoryId: string;
  quantity: number;
  itemCategory?: ItemCategory;
};

export type MissionItemAssignment = {
  missionId: string;
  itemCategoryId: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  itemCategory?: ItemCategory;
};

export type Donor = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  type?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DonorGoods = {
  donorId: string;
  itemCategoryId: string;
  quantity: number;
  unit: string;
  status: DonorGoodsStatus;
};

export type FundTransaction = {
  id: string;
  sepayId?: string | null;
  donorId?: string | null;
  approvedById?: string | null;
  requestId?: string | null;
  donorName?: string | null;
  donorPhone?: string | null;
  donorEmail?: string | null;
  type: TransactionType;
  method: TransactionMethod;
  amount: string;
  transactedAt: string;
  content?: string | null;
  status: TransactionStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailTemplate = {
  id: string;
  slug: string;
  trigger?: EmailTemplateTrigger | null;
  name: string;
  description?: string | null;
  subject: string;
  htmlBody: string;
  textBody?: string | null;
  fromName?: string | null;
  replyTo?: string | null;
  enabled: boolean;
  variables: string[];
  createdAt: string;
  updatedAt: string;
};

export type EmailLog = {
  id: string;
  templateId?: string | null;
  trigger: EmailTemplateTrigger;
  status: EmailDeliveryStatus;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  htmlBody?: string | null;
  textBody?: string | null;
  resendEmailId?: string | null;
  idempotencyKey?: string | null;
  errorMessage?: string | null;
  metadata?: unknown;
  recipientUserId?: string | null;
  donorId?: string | null;
  rescueRequestId?: string | null;
  volunteerRequestId?: string | null;
  fundTransactionId?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── API request / response helpers ───────────────────────────────────────────

export type CreateLocationInput = {
  type: LocationType;
  name: string;
  description?: string;
  province?: string;
  ward?: string;
  address?: string;
  lat: number;
  lng: number;
  urgency?: number;
};

export type UpdateLocationInput = Partial<CreateLocationInput> & {
  status?: LocationStatus;
};

export type CreateNeedInput = {
  category: NeedCategory;
  item: string;
  quantity: number;
  unit: string;
};

export type UpdateNeedInput = Partial<CreateNeedInput> & {
  status?: NeedStatus;
};

export type DashboardStats = {
  activeLocations: number;
  pendingLocations: number;
  unmetNeeds: number;
  availableVolunteers: number;
  totalVolunteers: number;
  totalVolunteerTeams: number;
};

export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type ApiListResponse<T> = {
  data: T[];
  total: number;
};
