export const volunteerUserSelect = {
  id: true,
  username: true,
  email: true,
  role: true,
  name: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
};

export const volunteerInclude = {
  user: { select: volunteerUserSelect },
  team: true,
};

export function volunteerDto(volunteer: any) {
  if (!volunteer) return volunteer;
  const { user, ...profile } = volunteer;
  return {
    ...profile,
    username: user?.username ?? null,
    email: user?.email ?? null,
    role: user?.role ?? "VOLUNTEER",
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    userId: volunteer.userId,
    user,
  };
}

export function volunteerSelect(includeTeam = false) {
  return {
    id: true,
    userId: true,
    status: true,
    accountStatus: true,
    dateOfBirth: true,
    gender: true,
    address: true,
    city: true,
    ward: true,
    skills: true,
    vehicleType: true,
    availability: true,
    experience: true,
    emergencyContactName: true,
    emergencyContactPhone: true,
    teamId: true,
    createdAt: true,
    updatedAt: true,
    user: { select: volunteerUserSelect },
    ...(includeTeam ? { team: true } : {}),
  };
}

export function volunteerEmail(volunteer: any) {
  return volunteer?.email ?? volunteer?.user?.email ?? null;
}

export function volunteerName(volunteer: any) {
  return volunteer?.name ?? volunteer?.user?.name ?? "";
}

export function volunteerPhone(volunteer: any) {
  return volunteer?.phone ?? volunteer?.user?.phone ?? "";
}
