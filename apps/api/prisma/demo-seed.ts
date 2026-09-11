import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import process from "node:process";

const prisma = new PrismaClient() as any;

const TARGET_VOLUNTEERS = 360;
const MIN_REGISTRATIONS_PER_REQUEST = 30;
const MAX_REGISTRATIONS_PER_REQUEST = 60;

type VolunteerSeed = {
  username: string;
  email: string;
  name: string;
  phone: string;
  status: "AVAILABLE" | "ON_MISSION" | "RESTING";
  accountStatus: "HOAT_DONG";
  dateOfBirth: Date;
  gender: string;
  address: string;
  city: string;
  ward: string;
  skills: string[];
  vehicleType?: string;
  availability: string;
  experience: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  teamId: string;
};

function makeRandom(seed = 20260603) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

const random = makeRandom();

function pick<T>(items: T[]) {
  return items[Math.floor(random() * items.length)];
}

function sample<T>(items: T[], min: number, max: number) {
  const count = min + Math.floor(random() * (max - min + 1));
  const shuffled = [...items].sort(() => random() - 0.5);
  return shuffled.slice(0, count);
}

function pad(value: number, length: number) {
  return String(value).padStart(length, "0");
}

function yearsAgo(years: number, extraDays: number) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  date.setDate(date.getDate() - extraDays);
  return date;
}

const lastNames = [
  "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng",
  "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Trịnh", "Mai", "Cao",
];

const middleNames = [
  "Văn", "Thị", "Minh", "Hoài", "Quang", "Thanh", "Ngọc", "Hữu", "Đức", "Gia",
  "Kim", "Khánh", "Anh", "Bảo", "Tuấn", "Mỹ", "Nhật", "Phúc", "Thiên", "Hải",
];

const firstNames = [
  "An", "Bình", "Châu", "Dũng", "Duy", "Giang", "Hà", "Hiếu", "Huy", "Khang",
  "Linh", "Long", "Mai", "Nam", "Nga", "Nhi", "Phương", "Quân", "Sơn", "Thảo",
  "Trang", "Trí", "Tú", "Vy", "Yến", "Khôi", "Nhân", "Tâm", "Uyên", "Việt",
];

const districts = [
  { city: "TP. Hồ Chí Minh", wards: ["Phường Bến Nghé", "Phường Tân Phong", "Phường Bình Trưng", "Phường An Phú"] },
  { city: "Long An", wards: ["An Thạnh", "Bình Đức", "Long Hậu", "Tân Kim"] },
  { city: "Đồng Nai", wards: ["Phường Trảng Dài", "Phường Long Bình", "Phường An Bình", "Xã Phước Tân"] },
  { city: "Cần Thơ", wards: ["Phường Cái Khế", "Phường An Khánh", "Phường Hưng Lợi", "Phường Thới Bình"] },
  { city: "Tiền Giang", wards: ["Phường 2", "Phường 5", "Xã Trung An", "Xã Tân Mỹ Chánh"] },
  { city: "Bến Tre", wards: ["Phường Phú Khương", "Xã Sơn Đông", "Xã Mỹ Thạnh An", "Thị trấn Mỏ Cày"] },
];

const skillPool = [
  "sơ cứu", "cứu hộ nước", "lái xuồng", "lái xe tải", "lái xe máy", "bốc xếp",
  "kiểm kê", "nấu ăn", "phân phối hàng", "điều phối", "truyền thông cộng đồng",
  "khảo sát hiện trường", "drone", "y tế cơ bản", "hỗ trợ trẻ em", "hỗ trợ người già",
  "điện dân dụng", "IT hiện trường", "liên lạc vô tuyến", "phiên dịch địa phương",
];

const vehicleTypes = [undefined, undefined, "motorbike", "car", "truck", "boat"];
const availabilities = ["Các ngày trong tuần", "Cuối tuần", "Buổi tối", "Theo ca 6 tiếng", "Sẵn sàng 24/7"];
const experiences = [
  "Đã tham gia diễn tập cứu trợ cấp phường.",
  "Có kinh nghiệm hỗ trợ phân phát hàng hóa.",
  "Từng tham gia sơ tán dân vùng ngập.",
  "Có thể làm việc ngoài hiện trường dài giờ.",
  "Mới tham gia, đã hoàn thành hướng dẫn an toàn.",
];

const itemCategories = [
  { name: "Nước sạch", groupName: "Thực phẩm & nước uống", unit: "thùng" },
  { name: "Gạo", groupName: "Thực phẩm & nước uống", unit: "kg" },
  { name: "Mì gói", groupName: "Thực phẩm & nước uống", unit: "thùng" },
  { name: "Áo phao", groupName: "Thiết bị cứu hộ", unit: "cái" },
  { name: "Thuốc sơ cứu", groupName: "Y tế", unit: "hộp" },
  { name: "Máy phát điện", groupName: "Thiết bị", unit: "cái" },
  { name: "Suất cơm", groupName: "Thực phẩm & nước uống", unit: "suất" },
  { name: "Sữa trẻ em", groupName: "Thực phẩm & nước uống", unit: "thùng" },
  { name: "Chăn mỏng", groupName: "Nhu yếu phẩm", unit: "cái" },
  { name: "Đèn pin", groupName: "Thiết bị", unit: "cái" },
  { name: "Pin dự phòng", groupName: "Thiết bị", unit: "cái" },
  { name: "Bộ vệ sinh cá nhân", groupName: "Nhu yếu phẩm", unit: "bộ" },
];

const defaultTeams = [
  { name: "Đội Sơ Cứu Cộng Đồng", city: "TP. Hồ Chí Minh", ward: "Phường An Phú", description: "Tình nguyện viên sơ cứu, hỗ trợ người cao tuổi và trẻ em." },
  { name: "Đội Hậu Cần Kho Nam", city: "Long An", ward: "An Thạnh", description: "Tiếp nhận, kiểm kê, bốc xếp và phân phối hàng cứu trợ." },
  { name: "Đội Xuồng Phản Ứng Nhanh", city: "Cần Thơ", ward: "Phường Cái Khế", description: "Cứu hộ đường thủy, vận chuyển vùng ngập sâu." },
  { name: "Đội Thông Tin Hiện Trường", city: "Đồng Nai", ward: "Phường Long Bình", description: "Khảo sát, cập nhật tình hình, hỗ trợ liên lạc." },
];

function isTestVolunteerName(name: string) {
  const normalized = name.trim();
  return /^TNV\s*\d+$/i.test(normalized)
    || /^Tình nguyện viên\s*\d+$/i.test(normalized)
    || /\bTV\s*\d+$/i.test(normalized);
}

function buildVolunteer(index: number, teamIds: string[]): VolunteerSeed {
  const place = pick(districts);
  const gender = random() > 0.5 ? "Nam" : "Nữ";
  const middleName = gender === "Nam" && random() > 0.35 ? pick(middleNames.filter((item) => item !== "Thị")) : pick(middleNames);
  const name = `${pick(lastNames)} ${middleName} ${pick(firstNames)}`;
  const citySlug = place.city.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const sequence = pad(index, 4);
  const phoneSuffix = pad(index, 7);

  return {
    username: `demo-tnv-${sequence}`,
    email: `demo.tnv.${citySlug || "vn"}.${sequence}@gmail.test`,
    name,
    phone: `088${phoneSuffix}`,
    status: index % 17 === 0 ? "ON_MISSION" : index % 19 === 0 ? "RESTING" : "AVAILABLE",
    accountStatus: "HOAT_DONG",
    dateOfBirth: yearsAgo(19 + (index % 34), Math.floor(random() * 365)),
    gender,
    address: `${12 + (index % 180)} ${pick(["Nguyễn Huệ", "Lê Lợi", "Trần Hưng Đạo", "Cách Mạng Tháng Tám", "Điện Biên Phủ", "Hai Bà Trưng"])}`,
    city: place.city,
    ward: pick(place.wards),
    skills: sample(skillPool, 3, 6),
    vehicleType: pick(vehicleTypes),
    availability: pick(availabilities),
    experience: pick(experiences),
    emergencyContactName: `${pick(lastNames)} ${pick(middleNames)} ${pick(firstNames)}`,
    emergencyContactPhone: `089${phoneSuffix}`,
    teamId: teamIds[index % teamIds.length],
  };
}

async function deleteNamedTestVolunteers() {
  const testUsers = await prisma.user.findMany({
    where: { role: "VOLUNTEER" },
    select: { id: true, name: true },
  });
  const ids = testUsers.filter((user: any) => isTestVolunteerName(user.name)).map((user: any) => user.id);
  if (ids.length === 0) return 0;
  const result = await prisma.user.deleteMany({ where: { id: { in: ids } } });
  return result.count;
}

async function ensureItemCategories() {
  for (const category of itemCategories) {
    const existing = await prisma.itemCategory.findFirst({ where: { name: category.name } });
    if (!existing) await prisma.itemCategory.create({ data: category });
  }
}

async function ensureVolunteerTeams() {
  for (const team of defaultTeams) {
    const existing = await prisma.volunteerTeam.findFirst({ where: { name: team.name } });
    if (!existing) await prisma.volunteerTeam.create({ data: team });
  }
  return prisma.volunteerTeam.findMany({ orderBy: { createdAt: "asc" } });
}

async function ensureVolunteers() {
  const teams = await ensureVolunteerTeams();
  const teamIds = teams.map((team: any) => team.id);
  const existingVolunteerCount = await prisma.volunteer.count();
  const missing = Math.max(0, TARGET_VOLUNTEERS - existingVolunteerCount);
  if (missing === 0) return { created: 0, teams };

  const existingUsers = await prisma.user.findMany({
    select: { username: true, email: true, phone: true },
  });
  const usedUsernames = new Set(existingUsers.map((user: any) => user.username).filter(Boolean));
  const usedEmails = new Set(existingUsers.map((user: any) => user.email).filter(Boolean));
  const usedPhones = new Set(existingUsers.map((user: any) => user.phone));
  const passwordHash = await bcrypt.hash("123456", 10);
  let created = 0;
  let cursor = 1;

  while (created < missing) {
    const seed = buildVolunteer(cursor, teamIds);
    cursor += 1;
    if (usedUsernames.has(seed.username) || usedEmails.has(seed.email) || usedPhones.has(seed.phone)) continue;

    const user = await prisma.user.create({
      data: {
        username: seed.username,
        passwordHash,
        email: seed.email,
        role: "VOLUNTEER",
        name: seed.name,
        phone: seed.phone,
      },
    });
    await prisma.volunteer.create({
      data: {
        userId: user.id,
        status: seed.status,
        accountStatus: seed.accountStatus,
        dateOfBirth: seed.dateOfBirth,
        gender: seed.gender,
        address: seed.address,
        city: seed.city,
        ward: seed.ward,
        skills: seed.skills,
        vehicleType: seed.vehicleType,
        availability: seed.availability,
        experience: seed.experience,
        emergencyContactName: seed.emergencyContactName,
        emergencyContactPhone: seed.emergencyContactPhone,
        teamId: seed.teamId,
      },
    });

    usedUsernames.add(seed.username);
    usedEmails.add(seed.email);
    usedPhones.add(seed.phone);
    created += 1;
  }

  return { created, teams };
}

async function ensureRequestRegistrations() {
  const [requests, volunteers] = await Promise.all([
    prisma.rescueRequest.findMany({ orderBy: { submittedAt: "asc" }, select: { id: true, name: true } }),
    prisma.volunteer.findMany({ orderBy: { createdAt: "asc" }, select: { id: true } }),
  ]);
  if (requests.length === 0 || volunteers.length === 0) return 0;

  let created = 0;
  for (let requestIndex = 0; requestIndex < requests.length; requestIndex += 1) {
    const request = requests[requestIndex];
    const existing = await prisma.volunteerRequest.findMany({
      where: { requestId: request.id },
      select: { volunteerId: true },
    });
    const existingIds = new Set(existing.map((item: any) => item.volunteerId));
    const target = Math.min(MAX_REGISTRATIONS_PER_REQUEST, MIN_REGISTRATIONS_PER_REQUEST + ((requestIndex * 7) % 27));
    const missing = Math.max(0, target - existing.length);
    if (missing === 0) continue;

    const candidates = volunteers
      .filter((volunteer: any) => !existingIds.has(volunteer.id))
      .sort(() => random() - 0.5)
      .slice(0, missing);

    await prisma.volunteerRequest.createMany({
      data: candidates.map((volunteer: any, index: number) => ({
        volunteerId: volunteer.id,
        requestId: request.id,
        status: index % 5 === 0 ? "DA_TIEP_NHAN" : index % 7 === 0 ? "DANG_XU_LY" : "CHO_TIEP_NHAN",
        note: `Sẵn sàng tham gia: ${request.name}`,
      })),
      skipDuplicates: true,
    });
    created += candidates.length;
  }
  return created;
}

async function ensureMissionItemAssignments() {
  const [missions, categories] = await Promise.all([
    prisma.mission.findMany({ select: { id: true } }),
    prisma.itemCategory.findMany({ select: { id: true, unit: true } }),
  ]);
  if (missions.length === 0 || categories.length === 0) return 0;

  let created = 0;
  for (let missionIndex = 0; missionIndex < missions.length; missionIndex += 1) {
    const mission = missions[missionIndex];
    const selected = [categories[missionIndex % categories.length], categories[(missionIndex + 3) % categories.length]];
    for (const category of selected) {
      const existing = await prisma.missionItemAssignment.findUnique({
        where: { missionId_itemCategoryId: { missionId: mission.id, itemCategoryId: category.id } },
      });
      if (existing) continue;
      await prisma.missionItemAssignment.create({
        data: {
          missionId: mission.id,
          itemCategoryId: category.id,
          quantity: 20 + ((missionIndex + created) % 9) * 10,
        },
      });
      created += 1;
    }
  }
  return created;
}

async function ensureInventoryIfThin() {
  const inventoryCount = await prisma.inventoryItem.count();
  if (inventoryCount >= 12) return 0;

  const [locations, categories] = await Promise.all([
    prisma.location.findMany({ where: { type: { in: ["STAGING_AREA", "FOOD_SUPPORT", "TRANSIT_POINT"] } }, select: { id: true } }),
    prisma.itemCategory.findMany({ select: { name: true, unit: true } }),
  ]);
  if (locations.length === 0 || categories.length === 0) return 0;

  let created = 0;
  for (let index = 0; created < 12 - inventoryCount && index < categories.length * locations.length; index += 1) {
    const location = locations[index % locations.length];
    const category = categories[index % categories.length];
    const existing = await prisma.inventoryItem.findFirst({
      where: { locationId: location.id, item: category.name },
    });
    if (existing) continue;
    await prisma.inventoryItem.create({
      data: {
        locationId: location.id,
        item: category.name,
        quantity: 50 + (index % 12) * 25,
        unit: category.unit,
      },
    });
    created += 1;
  }
  return created;
}

async function main() {
  console.log("🌱 Generating demo data...");
  const deletedTestVolunteers = await deleteNamedTestVolunteers();
  await ensureItemCategories();
  const { created: createdVolunteers } = await ensureVolunteers();
  const createdVolunteerRequests = await ensureRequestRegistrations();
  const createdMissionAssignments = await ensureMissionItemAssignments();
  const createdInventoryItems = await ensureInventoryIfThin();

  const counts = {
    volunteers: await prisma.volunteer.count(),
    volunteerRequests: await prisma.volunteerRequest.count(),
    rescueRequests: await prisma.rescueRequest.count(),
    itemCategories: await prisma.itemCategory.count(),
    inventoryItems: await prisma.inventoryItem.count(),
    missionItemAssignments: await prisma.missionItemAssignment.count(),
  };

  console.log("✅ Demo data ready");
  console.log(`   - Deleted test volunteers: ${deletedTestVolunteers}`);
  console.log(`   - Created volunteers: ${createdVolunteers}`);
  console.log(`   - Created volunteer registrations: ${createdVolunteerRequests}`);
  console.log(`   - Created mission item assignments: ${createdMissionAssignments}`);
  console.log(`   - Created inventory items: ${createdInventoryItems}`);
  console.log(`   - Totals: ${JSON.stringify(counts)}`);
  console.log("   - Demo volunteer password: 123456");
  console.log("   - Demo volunteer emails use @gmail.test, so no real Gmail recipient is contacted.");
}

main()
  .catch((error) => {
    console.error("❌ Demo data generation failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
