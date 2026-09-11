const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
export const API_BASE_URL = API_BASE;

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

type ValidationPayload = {
  message?: string;
  errors?: {
    fieldErrors?: Record<string, string[] | undefined>;
    formErrors?: string[];
  };
  issues?: {
    fieldErrors?: Record<string, string[] | undefined>;
    formErrors?: string[];
  };
};

const FIELD_LABELS: Record<string, string> = {
  address: "Địa chỉ",
  availability: "Thời gian có thể tham gia",
  capacity: "Sức chứa",
  city: "Tỉnh/Thành",
  content: "Nội dung",
  dateOfBirth: "Ngày sinh",
  displayName: "Tên hiển thị",
  email: "Email",
  emergencyContactName: "Người liên hệ khẩn cấp",
  emergencyContactPhone: "Số điện thoại liên hệ khẩn cấp",
  experience: "Kinh nghiệm",
  gender: "Giới tính",
  item: "Mặt hàng",
  lat: "Vĩ độ",
  lng: "Kinh độ",
  name: "Tên",
  password: "Mật khẩu",
  phone: "Số điện thoại",
  quantity: "Số lượng",
  requesterEmail: "Email người gửi",
  requesterName: "Họ tên người gửi",
  requesterPhone: "Số điện thoại người gửi",
  requesterTitle: "Chức vụ",
  role: "Vai trò",
  status: "Trạng thái",
  unit: "Đơn vị",
  username: "Tên đăng nhập",
  vehicleType: "Phương tiện",
  ward: "Phường/Xã",
};

function fieldLabel(path: string) {
  const key = path.split(".").filter(Boolean).at(-1) ?? path;
  return FIELD_LABELS[key] ?? key;
}

function translateValidationMessage(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid email")) return "email không hợp lệ";
  if (lower.includes("required")) return "bắt buộc nhập";
  if (lower.includes("expected string")) return "phải là chuỗi";
  if (lower.includes("expected number")) return "phải là số";
  if (lower.includes("expected boolean")) return "phải là đúng/sai";
  if (lower.includes("received nan")) return "phải là số hợp lệ";
  if (lower.includes("invalid enum value")) return "không nằm trong danh sách cho phép";
  if (lower.includes("invalid date")) return "ngày không hợp lệ";
  if (lower.includes("must contain at least")) {
    const min = message.match(/\d+/)?.[0];
    return min ? `phải có ít nhất ${min} ký tự` : "quá ngắn";
  }
  if (lower.includes("must contain at most")) {
    const max = message.match(/\d+/)?.[0];
    return max ? `không được vượt quá ${max} ký tự` : "quá dài";
  }
  if (lower.includes("must be greater than or equal to")) {
    const min = message.match(/\d+/)?.[0];
    return min ? `phải lớn hơn hoặc bằng ${min}` : "nhỏ hơn mức tối thiểu";
  }
  if (lower.includes("must be less than or equal to")) {
    const max = message.match(/\d+/)?.[0];
    return max ? `phải nhỏ hơn hoặc bằng ${max}` : "lớn hơn mức tối đa";
  }
  if (lower.includes("too small")) {
    const min = message.match(/minimum|at least|greater than or equal to/i) ? message.match(/\d+/)?.[0] : undefined;
    return min ? `quá ngắn hoặc nhỏ hơn mức tối thiểu (${min})` : "quá ngắn hoặc nhỏ hơn mức tối thiểu";
  }
  if (lower.includes("too big")) {
    const max = message.match(/\d+/)?.[0];
    return max ? `quá dài hoặc lớn hơn mức tối đa (${max})` : "quá dài hoặc lớn hơn mức tối đa";
  }
  if (lower.includes("invalid")) return "không hợp lệ";
  return message;
}

function formatValidationErrors(payload: ValidationPayload) {
  const details = payload.errors ?? payload.issues;
  const messages: string[] = [];

  for (const [field, fieldMessages] of Object.entries(details?.fieldErrors ?? {})) {
    for (const message of fieldMessages ?? []) {
      messages.push(`${fieldLabel(field)}: ${translateValidationMessage(message)}`);
    }
  }

  for (const message of details?.formErrors ?? []) {
    messages.push(translateValidationMessage(message));
  }

  if (messages.length === 0) return payload.message;
  return messages.join("; ");
}

function getAuthHeader(path: string): Record<string, string> {
  if (typeof window === "undefined") return {};
  const volunteerToken = localStorage.getItem("volunteer_token");
  const adminToken = localStorage.getItem("admin_token");
  const isAdminContext = path.startsWith("/auth/admin") || path.startsWith("/admin") || window.location.pathname.startsWith("/admin");
  const token = isAdminContext ? adminToken : volunteerToken ?? adminToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = options;
  const hasBody = body !== undefined;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...getAuthHeader(path),
      ...headers,
    },
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 413) {
      throw new Error("Dữ liệu gửi lên quá lớn. Vui lòng giảm số lượng hoặc dung lượng file đính kèm.");
    }
    const error = await res.json().catch(() => ({ message: "Request failed" })) as ValidationPayload;
    throw new Error(formatValidationErrors(error) ?? error.message ?? `HTTP ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body }),

  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),

  upload: async <T>(path: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        ...getAuthHeader(path),
      },
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: "Upload failed" })) as ValidationPayload;
      throw new Error(formatValidationErrors(error) ?? error.message ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
  },
};
