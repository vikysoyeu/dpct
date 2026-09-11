import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import process from "node:process";

const prisma = new PrismaClient() as any;

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.fundTransaction.deleteMany();
  await prisma.donorGoods.deleteMany();
  await prisma.rescueRequestItem.deleteMany();
  await prisma.rescueTeamMember.deleteMany();
  await prisma.rescueTeam.deleteMany();
  await prisma.volunteerRequest.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.rescueRequest.deleteMany();
  await prisma.locationUpdate.deleteMany();
  await prisma.userRoleLink.deleteMany();
  await prisma.volunteerPasswordResetCode.deleteMany();
  await prisma.itemCategory.deleteMany();
  await prisma.donor.deleteMany();
  await prisma.role.deleteMany();
  await prisma.need.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();
  await prisma.adminUser.deleteMany();

  // Create default admin account
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  await prisma.adminUser.create({
    data: {
      username: "admin",
      passwordHash: adminPasswordHash,
      displayName: "Quản trị viên",
      role: "ADMIN",
    },
  });

  const coordinatorPasswordHash = await bcrypt.hash("coord123", 10);

  const coordinator = await prisma.user.create({
    data: {
      username: "coord-001",
      passwordHash: coordinatorPasswordHash,
      email: "coord@dpct.local",
      role: "COORDINATOR",
      name: "Trần Văn Điều Phối",
      phone: "0901000001",
    },
  });

  await prisma.role.createMany({
    data: [
      { name: "DOI_TRUONG", description: "Trưởng đội điều phối / chỉ huy tại hiện trường" },
      { name: "DOI_PHO", description: "Phó đội phụ trách hỗ trợ điều hành" },
      { name: "THANH_VIEN", description: "Thành viên đội cứu trợ" },
      { name: "CONG_TAC_VIEN", description: "Cộng tác viên thời vụ" },
    ],
  });

  const teamRoles = await prisma.role.findMany({ orderBy: { id: "asc" } });
  if (teamRoles.length > 0) {
    await prisma.userRoleLink.create({
      data: { userId: coordinator.id, roleId: teamRoles[0].id },
    });
  }

  const teamDefs = [
    { name: "Biệt Đội Cứu Trợ 07", city: "Quận 7", ward: "Phường Tân Phong", description: "Sơ cứu, phân phối hàng hóa, điều phối tàu cứu trợ." },
    { name: "Nhóm Kỹ Thuật Phản Ứng Nhanh", city: "Quận 1", ward: "Phường Bến Nghé", description: "Sửa chữa điện, liên lạc, đèn chiếu sáng tạm thời." },
    { name: "Đội Xuồng Cứu Hộ Nam Sài Gòn", city: "Huyện Cần Giờ", ward: "Xã Long Hòa", description: "Cứu hộ đường thủy, tiếp cận vùng ngập sâu." },
    { name: "Đội Hậu Cần 24/7", city: "Bến Lức", ward: "An Thạnh", description: "Kho, bốc xếp, kiểm kê và bàn giao hàng hóa." },
    { name: "Đội Y Tế Lưu Động 03", city: "TP. Biên Hòa", ward: "Phường Trảng Dài", description: "Sơ cứu, phân loại ca nặng, hỗ trợ y tế dã chiến." },
    { name: "Đội Tiếp Tế Miền Tây", city: "Mỹ Tho", ward: "Phường 2", description: "Suất ăn, nước sạch và túi nhu yếu phẩm." },
    { name: "Nhóm Khảo Sát Drone", city: "Dĩ An", ward: "Phường An Bình", description: "Giám sát từ trên cao, phát hiện điểm cần cứu trợ." },
    { name: "Đội Cầu Đường Tạm", city: "Cần Giuộc", ward: "Xã Long Hậu", description: "Làm việc với tuyến đường hỏng và cầu tạm." },
    { name: "Đội Phát Tương Hỗ", city: "Long Xuyên", ward: "Phường Mỹ Long", description: "Vận động cộng đồng, hướng dẫn di dời." },
    { name: "Đội Văn Hóa - Tạm Trú", city: "Mỏ Cày Nam", ward: "Thị trấn Mỏ Cày", description: "Điểm nghỉ, chăm sóc trẻ em và người già." },
  ];

  const skillPools = [
    ["sơ cứu", "phân loại nhu cầu", "giao tiếp cộng đồng"],
    ["điện", "IT hiện trường", "liên lạc vô tuyến"],
    ["lái xuồng", "cứu hộ nước", "định vị"],
    ["bốc xếp", "kiểm kê", "phân phối"],
    ["y tế", "điều phối", "chăm sóc ca nhẹ"],
    ["nấu ăn", "suất cơm", "nước sạch"],
    ["drone", "khảo sát", "chụp ảnh"],
    ["đường bộ", "cọc tiêu", "cảnh báo"],
    ["truyền thông", "cộng đồng", "hỗ trợ tâm lý"],
    ["tạm trú", "trẻ em", "hỗ trợ người già"],
  ];

  const memberCounts = [8, 9, 7, 10, 8, 9, 7, 8, 9, 8];
  const volunteerTeams = [] as Array<{ id: string; name: string; city: string; ward: string; description: string }>;
  const volunteers = [] as Array<{ username: string; name: string; phone: string; skills: string[]; status: "AVAILABLE" | "ON_MISSION" | "RESTING"; accountStatus: "HOAT_DONG"; teamId: string; vehicleType?: string }>;

  let phoneCounter = 1;
  for (let index = 0; index < teamDefs.length; index += 1) {
    const teamDef = teamDefs[index];
    const team = await prisma.volunteerTeam.create({
      data: {
        name: teamDef.name,
        city: teamDef.city,
        ward: teamDef.ward,
        description: teamDef.description,
      },
    });
    volunteerTeams.push({
      id: team.id,
      name: team.name,
      city: team.city ?? "",
      ward: team.ward ?? "",
      description: team.description ?? "",
    });

    const count = memberCounts[index];
    for (let memberIndex = 0; memberIndex < count; memberIndex += 1) {
      const displayNumber = String(10000000 + phoneCounter).slice(-8);
      volunteers.push({
        username: `tnv-${String(phoneCounter).padStart(3, "0")}`,
        name: `${teamDef.name.split(" ")[0]} TV ${memberIndex + 1}`,
        phone: `09${displayNumber}`,
        skills: skillPools[index].slice(0, 2 + (memberIndex % 2)),
        status: memberIndex % 5 === 0 ? "ON_MISSION" : memberIndex % 6 === 0 ? "RESTING" : "AVAILABLE",
        accountStatus: "HOAT_DONG",
        teamId: team.id,
        vehicleType: memberIndex % 3 === 0 ? "motorbike" : undefined,
      });
      phoneCounter += 1;
    }
  }

  const volunteerPasswordHash = await bcrypt.hash("123456", 10);
  await prisma.user.createMany({
    data: volunteers.map((volunteer) => ({
      username: volunteer.username,
      passwordHash: volunteerPasswordHash,
      role: "VOLUNTEER",
      name: volunteer.name,
      phone: volunteer.phone,
    })),
  });

  const createdUsers = (await prisma.user.findMany({ where: { role: "VOLUNTEER" }, orderBy: { createdAt: "asc" } })) as Array<{ id: string; username: string }>;
  const userByUsername = new Map(createdUsers.map((user) => [user.username, user]));
  await prisma.volunteer.createMany({
    data: volunteers.map((volunteer) => ({
      userId: userByUsername.get(volunteer.username)!.id,
      skills: volunteer.skills,
      status: volunteer.status,
      accountStatus: volunteer.accountStatus,
      teamId: volunteer.teamId,
      vehicleType: volunteer.vehicleType,
    })),
  });

  const createdVolunteerProfiles = (await prisma.volunteer.findMany({ orderBy: { createdAt: "asc" } })) as Array<{ id: string }>;

  const locationSeeds = [
    {
      type: "URGENT_NEED",
      status: "ACTIVE",
      name: "Cần Thạnh, Cần Giờ",
      description: "Cần Thạnh, Cần Giờ - nhóm hộ dân cần nước sạch, thuốc men và hỗ trợ sơ tán khẩn.",
      lat: 10.4132,
      lng: 106.9186,
      urgency: 5,
      imageUrls: [
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/USAID%20supplies%20assistance%20to%20flood-stricken%20Long%20An%20Province,%20Tan%20Thanh%20District%20(6677940845).jpg?width=900",
      ],
      needs: [
        { category: "FOOD", item: "nước sạch", quantity: 200, unit: "thùng", status: "UNMET" },
        { category: "MEDICINE", item: "nhân viên y tế", quantity: 2, unit: "người", status: "UNMET" },
      ],
    },
    {
      type: "URGENT_NEED",
      status: "ACTIVE",
      name: "Phường 2, Quận 7",
      description: "Phường 2, Quận 7 - cần đội kỹ thuật sửa điện, máy phát và chiếu sáng tạm.",
      lat: 10.7299,
      lng: 106.7282,
      urgency: 5,
      imageUrls: [
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Flood%20Relief%20Volunteer%20Event%20(9173519).jpg?width=900",
      ],
      needs: [
        { category: "EQUIPMENT", item: "máy phát điện", quantity: 1, unit: "cái", status: "PARTIAL" },
        { category: "MANPOWER", item: "đội kỹ thuật", quantity: 6, unit: "người", status: "UNMET" },
      ],
    },
    {
      type: "STAGING_AREA",
      status: "ACTIVE",
      name: "Trạm cứu trợ 01",
      description: "Trạm điều phối hàng hóa chính cho khu vực phía Nam thành phố.",
      lat: 10.7676,
      lng: 106.6956,
      urgency: 3,
      imageUrls: [
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Vietnam%27s%20State%20President%20Tran%20Dai%20Quang%20Recognizes%20USAID%E2%80%99s%20Disaster%20Relief%20Assistance%20(38675362795).jpg?width=900",
      ],
      needs: [
        { category: "EQUIPMENT", item: "áo phao", quantity: 200, unit: "cái", status: "MET" },
        { category: "FOOD", item: "thùng nước", quantity: 300, unit: "thùng", status: "PARTIAL" },
      ],
    },
    {
      type: "STAGING_AREA",
      status: "ACTIVE",
      name: "Kho trung chuyển Bến Lức",
      description: "Kho trung chuyển để tiếp nhận hàng cứu trợ liên tỉnh.",
      lat: 10.7406,
      lng: 106.4328,
      urgency: 3,
      imageUrls: [
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/USAID%20supplies%20assistance%20to%20flood-stricken%20Long%20An%20Province,%20Tan%20Thanh%20District%20(6677930631).jpg?width=900",
      ],
      needs: [
        { category: "EQUIPMENT", item: "bao tải", quantity: 120, unit: "cái", status: "MET" },
        { category: "VEHICLE", item: "xe tải", quantity: 2, unit: "xe", status: "PARTIAL" },
      ],
    },
    {
      type: "NEED_POINT",
      status: "ACTIVE",
      name: "Điểm trường Ba Đồn",
      description: "Trường tiểu học đang dùng làm nơi tạm trú cho 50 hộ dân ở khu ven sông.",
      lat: 17.7544,
      lng: 106.4283,
      urgency: 4,
      imageUrls: [
        "https://commons.wikimedia.org/wiki/Special:Redirect/file/Camp%20Eggers%20volunteers%20assist%20with%20Afghan%20flood%20relief%20efforts%20130816-N-GV919-031.jpg?width=900",
      ],
      needs: [
        { category: "FOOD", item: "gạo", quantity: 2000, unit: "kg", status: "UNMET" },
        { category: "VEHICLE", item: "xe vận chuyển", quantity: 2, unit: "xe", status: "UNMET" },
      ],
    },
    {
      type: "FOOD_SUPPORT",
      status: "ACTIVE",
      name: "Nhà Văn hóa Phụ Nữ",
      description: "Điểm phát cơm miễn phí cho TNV và nạn nhân tại trung tâm thành phố.",
      lat: 10.7720,
      lng: 106.7042,
      urgency: 1,
      imageUrls: [
        "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=900&q=80",
      ],
      needs: [
        { category: "FOOD", item: "suất cơm", quantity: 500, unit: "suất", status: "MET" },
        { category: "MANPOWER", item: "nhân viên bếp", quantity: 4, unit: "người", status: "PARTIAL" },
      ],
    },
  ];

  const createdLocations = [] as Array<{ id: string; type: string; name: string; imageUrls: string[] }>;
  const priorityFromUrgency = (urgency: number) => {
    if (urgency >= 5) return "KHAN_CAP";
    if (urgency >= 4) return "CAO";
    if (urgency >= 2) return "TRUNG_BINH";
    return "THAP";
  };
  for (let index = 0; index < locationSeeds.length; index += 1) {
    const locationSeed = locationSeeds[index];
    const reporter = createdUsers[index % createdUsers.length] ?? coordinator;
    const location = await prisma.location.create({
      data: {
        type: locationSeed.type as any,
        status: locationSeed.status as any,
        name: locationSeed.name,
        description: locationSeed.description,
        lat: locationSeed.lat,
        lng: locationSeed.lng,
        urgency: locationSeed.urgency,
        priority: priorityFromUrgency(locationSeed.urgency),
        reportedById: reporter.id,
        verifiedById: index % 3 === 0 ? coordinator.id : undefined,
        expiresAt: locationSeed.type === "BLOCKED_ROAD" ? new Date(Date.now() + 4 * 60 * 60 * 1000) : undefined,
      },
    });
    createdLocations.push({ ...location, imageUrls: locationSeed.imageUrls });

    if (locationSeed.needs) {
      await prisma.need.createMany({
        data: locationSeed.needs.map((need) => ({
          locationId: location.id,
          category: need.category as any,
          item: need.item,
          quantity: need.quantity,
          unit: need.unit,
          status: need.status as any,
        })),
      });
    }
  }

  await prisma.inventoryItem.createMany({
    data: [
      { locationId: createdLocations[3].id, item: "Gạo", quantity: 5000, unit: "kg" },
      { locationId: createdLocations[3].id, item: "Mì gói", quantity: 2000, unit: "thùng" },
      { locationId: createdLocations[3].id, item: "Nước sạch", quantity: 3000, unit: "lít" },
      { locationId: createdLocations[3].id, item: "Thuốc sơ cứu", quantity: 80, unit: "hộp" },
      { locationId: createdLocations[4].id, item: "Áo phao", quantity: 120, unit: "cái" },
      { locationId: createdLocations[5].id, item: "Suất cơm", quantity: 400, unit: "suất" },
    ],
  });

  await prisma.itemCategory.createMany({
    data: [
      { name: "Nước sạch", groupName: "Thực phẩm & nước uống", unit: "thùng" },
      { name: "Gạo", groupName: "Thực phẩm & nước uống", unit: "kg" },
      { name: "Mì gói", groupName: "Thực phẩm & nước uống", unit: "thùng" },
      { name: "Áo phao", groupName: "Thiết bị cứu hộ", unit: "cái" },
      { name: "Thuốc sơ cứu", groupName: "Y tế", unit: "hộp" },
      { name: "Máy phát điện", groupName: "Thiết bị", unit: "cái" },
      { name: "Suất cơm", groupName: "Thực phẩm & nước uống", unit: "suất" },
    ],
  });

  const categoryMap = await prisma.itemCategory.findMany({ orderBy: { createdAt: "asc" } });

  const requestStatusSeeds = ["CHO_TIEP_NHAN", "DANG_THUC_HIEN", "HOAN_THANH", "HUY_BO"] as const;
  const rescueRequests = [] as Array<{ locationId: string; name: string; content: string; priority: "THAP" | "TRUNG_BINH" | "CAO" | "KHAN_CAP"; status: typeof requestStatusSeeds[number]; requesterName: string; requesterPhone: string; submittedById: string }>;
  for (let index = 0; index < createdLocations.length; index += 1) {
    const location = createdLocations[index];
    const reporter = createdUsers[index % createdUsers.length] ?? coordinator;
    rescueRequests.push({
      locationId: location.id,
      name: `Yêu cầu hỗ trợ ${location.name}`,
      content: `Ghi nhận theo điểm ${location.name} cần hỗ trợ bổ sung và theo dõi cập nhật.`,
      priority: index % 3 === 0 ? "KHAN_CAP" : index % 3 === 1 ? "CAO" : "TRUNG_BINH",
      status: requestStatusSeeds[index % requestStatusSeeds.length],
      requesterName: `Người báo tin ${index + 1}`,
      requesterPhone: `0919${String(100000 + index).slice(-6)}`,
      submittedById: reporter.id,
    });
  }

  const createdRescueRequests = [] as Array<{ id: string; locationId: string; priority: string; name: string }>;
  for (const request of rescueRequests) {
    const created = await prisma.rescueRequest.create({
      data: request,
    });
    createdRescueRequests.push(created);
  }

  await prisma.rescueRequestItem.createMany({
    data: createdRescueRequests.flatMap((request, index) => [
      { rescueRequestId: request.id, itemCategoryId: categoryMap[index % categoryMap.length].id, quantity: 80 + index * 20 },
      { rescueRequestId: request.id, itemCategoryId: categoryMap[(index + 2) % categoryMap.length].id, quantity: 20 + index * 5 },
    ]),
  });

  await prisma.locationUpdate.createMany({
    data: createdLocations.map((location, index) => ({
      locationId: location.id,
      userId: createdUsers[index % createdUsers.length].id,
      imageUrl: location.imageUrls[0] ?? `/uploads/locations/location-${index + 1}.jpg`,
      content: `Cập nhật hiện trường cho ${location.name}`,
    })),
  });

  const rescueTeams = await Promise.all(
    volunteerTeams.map((team, index) =>
      prisma.rescueTeam.create({
        data: {
          name: team.name,
          type: index % 2 === 0 ? "Cứu hộ tổng hợp" : "Hậu cần hiện trường",
          status: index % 4 === 0 ? "HOAT_DONG" : index % 4 === 1 ? "TAM_DUNG" : "HOAT_DONG",
        },
      }),
    ),
  );

  const createdVolunteers = createdVolunteerProfiles;
  for (let index = 0; index < rescueTeams.length; index += 1) {
    const team = rescueTeams[index];
    const teamVolunteers = createdVolunteers.filter((_, volunteerIndex) => volunteerIndex % rescueTeams.length === index).slice(0, 4);
    const memberSeed = teamVolunteers.map((volunteer, memberIndex) => ({
      userId: volunteer.id,
      teamId: team.id,
      role: memberIndex === 0 ? "DOI_TRUONG" : memberIndex === 1 ? "DOI_PHO" : "THANH_VIEN",
    }));

    if (memberSeed.length > 0) {
      await prisma.rescueTeamMember.createMany({ data: memberSeed as any });
    }
  }

  const missions = [] as Array<{ id: string; locationId: string; requestId?: string; name: string }>;
  const missionVehicleSeeds = [
    { name: "Xe tải 10 tấn", plateNumber: "51C-10001" },
    { name: "Xuồng cứu hộ 02", plateNumber: "CG-BOAT-02" },
    { name: "Xe bán tải 4x4", plateNumber: "51C-10002" },
    { name: "Drone khảo sát", plateNumber: "DRONE-01" },
  ];
  for (let index = 0; index < createdLocations.length; index += 1) {
    const location = createdLocations[index];
    const mission = await prisma.mission.create({
      data: {
        locationId: location.id,
        requestId: createdRescueRequests[index]?.id,
        name: `Nhiệm vụ ${location.name}`,
        missionType: index % 2 === 0 ? "Cứu trợ khẩn" : "Khảo sát hiện trường",
        priority: index % 3 === 0 ? "KHAN_CAP" : index % 3 === 1 ? "CAO" : "TRUNG_BINH",
        status: index % 4 === 0 ? "DANG_THUC_HIEN" : index % 4 === 1 ? "DANG_TUYEN" : "HOAN_THANH",
        startedAt: index % 2 === 0 ? new Date(Date.now() - (index + 1) * 60 * 60 * 1000) : undefined,
        endedAt: index % 3 === 2 ? new Date() : undefined,
        transportations: {
          create: [
            {
              vehicleType: missionVehicleSeeds[index % missionVehicleSeeds.length].name,
              vehiclePlate: missionVehicleSeeds[index % missionVehicleSeeds.length].plateNumber,
              driverName: coordinator.name,
              driverPhone: coordinator.phone,
              notes: `Điều phối tại ${location.name}`,
            }
          ]
        }
      },
    });
    missions.push(mission);
  }

  for (let index = 0; index < missions.length; index += 1) {
    await prisma.rescueTeam.update({
      where: { id: rescueTeams[index % rescueTeams.length].id },
      data: { missionId: missions[index].id },
    });
  }

  const donorRecords = await Promise.all(
    [
      { name: "Quỹ từ thiện Ánh Sáng", phone: "0902000003", email: "contact@anhsang.local", address: "Hà Nội", type: "DONOR", notes: "Ưu tiên hỗ trợ y tế" },
      { name: "Hợp tác xã Vận tải 03", phone: "0902000002", email: "logistics@vanta03.local", address: "Long An", type: "TRANSPORT", notes: "Cam kết xe hàng ngày" },
      { name: "Nhà hàng Gia Lạc", phone: "0902000004", email: "bep@gialac.local", address: "Cần Thơ", type: "FOOD", notes: "Hỗ trợ suất ăn" },
    ].map((donor) => prisma.donor.create({ data: donor })),
  );

  await prisma.donorGoods.createMany({
    data: [
      { donorId: donorRecords[0].id, itemCategoryId: categoryMap[4].id, quantity: 200, unit: "hộp", status: "HOAN_THANH" },
      { donorId: donorRecords[0].id, itemCategoryId: categoryMap[5].id, quantity: 10, unit: "cái", status: "HOAN_THANH" },
      { donorId: donorRecords[1].id, itemCategoryId: categoryMap[3].id, quantity: 60, unit: "cái", status: "HOAN_THANH" },
      { donorId: donorRecords[2].id, itemCategoryId: categoryMap[6].id, quantity: 1000, unit: "suất", status: "HOAN_THANH" },
    ],
  });

  await prisma.fundTransaction.createMany({
    data: [
      { donorId: donorRecords[0].id, donorName: donorRecords[0].name, donorPhone: donorRecords[0].phone, donorEmail: donorRecords[0].email, approvedById: coordinator.id, requestId: createdRescueRequests[0].id, type: "THU", amount: BigInt(50000000), content: "Hỗ trợ y tế vùng ngập", status: "THANH_CONG", notes: "Đối soát xong" },
      { donorId: donorRecords[1].id, donorName: donorRecords[1].name, donorPhone: donorRecords[1].phone, donorEmail: donorRecords[1].email, approvedById: coordinator.id, requestId: createdRescueRequests[1].id, type: "THU", amount: BigInt(20000000), content: "Chi phí vận chuyển", status: "CHO_DOI_SOAT", notes: "Đang chờ xác nhận" },
      { donorId: donorRecords[2].id, donorName: donorRecords[2].name, donorPhone: donorRecords[2].phone, donorEmail: donorRecords[2].email, approvedById: coordinator.id, requestId: createdRescueRequests[2].id, type: "CHI", amount: BigInt(12000000), content: "Chi trả suất ăn", status: "THANH_CONG", notes: "Đã hoàn tất" },
    ],
  });

  const volunteerRequests = createdVolunteers.slice(0, 9).map((volunteer, index) => ({
    volunteerId: volunteer.id,
    requestId: createdRescueRequests[index % createdRescueRequests.length].id,
    status: index % 3 === 0 ? "DA_TIEP_NHAN" : index % 3 === 1 ? "CHO_TIEP_NHAN" : "HOAN_THANH",
    note: `Đăng ký tham gia ${createdRescueRequests[index % createdRescueRequests.length].name}`,
  }));

  await prisma.volunteerRequest.createMany({ data: volunteerRequests as any });

  console.log("✅ Seed completed!");
  console.log(`   - 1 admin account (admin / admin123)`);
  console.log(`   - ${1 + createdUsers.length} users (1 coordinator, ${createdUsers.length} volunteers)`);
  console.log(`   - ${createdLocations.length} locations`);
  console.log(`   - ${locationSeeds.reduce((sum, location) => sum + (location.needs?.length ?? 0), 0)} needs`);
  console.log(`   - ${6} inventory items`);
  console.log(`   - ${teamRoles.length} roles`);
  console.log(`   - ${createdRescueRequests.length} rescue requests`);
  console.log(`   - ${missions.length} missions`);
  console.log(`   - ${rescueTeams.length} rescue teams`);
  console.log(`   - ${createdRescueRequests.length * 2} rescue request item rows`);
  console.log(`   - ${donorRecords.length} donors`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
