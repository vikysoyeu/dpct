"use client";

import { create } from "zustand";

type AdminUser = {
  id: string;
  username: string;
  displayName: string;
  role?: "ADMIN" | "ADMIN_TNV" | "ADMIN_YCCT" | "ADMIN_KHO";
};

export type VolunteerUser = {
  id: string;
  username?: string | null;
  email?: string | null;
  role: "VOLUNTEER";
  status: "AVAILABLE" | "ON_MISSION" | "RESTING";
  accountStatus?: "HOAT_DONG" | "TAM_DUNG" | "KHOA" | "CHO_DUYET";
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
  team?: { id: string; name: string; city?: string | null; ward?: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

type AuthState = {
  token: string | null;
  admin: AdminUser | null;
  volunteerToken: string | null;
  volunteer: VolunteerUser | null;
  loading: boolean;
  setAuth: (token: string, admin: AdminUser) => void;
  setVolunteerAuth: (token: string, volunteer: VolunteerUser) => void;
  setVolunteer: (volunteer: VolunteerUser) => void;
  logout: () => void;
  logoutVolunteer: () => void;
  setLoading: (loading: boolean) => void;
};

const TOKEN_KEY = "admin_token";
const VOLUNTEER_TOKEN_KEY = "volunteer_token";

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null,
  admin: null,
  volunteerToken: typeof window !== "undefined" ? localStorage.getItem(VOLUNTEER_TOKEN_KEY) : null,
  volunteer: null,
  loading: true,
  setAuth: (token, admin) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ token, admin, loading: false });
  },
  setVolunteerAuth: (token, volunteer) => {
    localStorage.setItem(VOLUNTEER_TOKEN_KEY, token);
    set({ volunteerToken: token, volunteer, loading: false });
  },
  setVolunteer: (volunteer) => set({ volunteer, loading: false }),
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, admin: null, loading: false });
  },
  logoutVolunteer: () => {
    localStorage.removeItem(VOLUNTEER_TOKEN_KEY);
    set({ volunteerToken: null, volunteer: null, loading: false });
  },
  setLoading: (loading) => set({ loading }),
}));
