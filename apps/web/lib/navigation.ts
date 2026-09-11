import {
  BarChart3,
  BookOpenText,
  Boxes,
  ClipboardList,
  FilePenLine,
  FileText,
  HandHeart,
  Home,
  Landmark,
  LucideIcon,
  MapPinned,
  ShieldCheck,
  UserRound,
  Users
} from "lucide-react";

export type NavigationItem = {
  href: string;
  label: string;
  shortLabel: string;
  Icon: LucideIcon;
};

export const userNavigationItems: NavigationItem[] = [
  {
    href: "/map",
    label: "Bản đồ Điều phối",
    shortLabel: "Bản đồ",
    Icon: MapPinned
  },
  {
    href: "/rescue-requests",
    label: "Yêu cầu cứu trợ",
    shortLabel: "Cứu trợ",
    Icon: ClipboardList
  },
  {
    href: "/sponsorship",
    label: "Nhà tài trợ",
    shortLabel: "Tài trợ",
    Icon: HandHeart
  },
  {
    href: "/donate",
    label: "Quyên góp",
    shortLabel: "Donate",
    Icon: HandHeart
  },
  {
    href: "/guides",
    label: "Cổng Thông tin An toàn",
    shortLabel: "Hướng dẫn",
    Icon: BookOpenText
  }
];

export const userTopTabs: NavigationItem[] = [
  {
    href: "/rescue-request",
    label: "Gửi yêu cầu",
    shortLabel: "Yêu cầu",
    Icon: FilePenLine
  },
  {
    href: "/sponsorship",
    label: "Tài trợ",
    shortLabel: "Tài trợ",
    Icon: HandHeart
  }
];

export const adminNavigationItems: NavigationItem[] = [
  {
    href: "/admin",
    label: "Tổng quan",
    shortLabel: "Tổng quan",
    Icon: BarChart3
  },
  {
    href: "/admin/locations",
    label: "Quản lý Địa điểm",
    shortLabel: "Địa điểm",
    Icon: MapPinned
  },
  {
    href: "/admin/needs",
    label: "Quản lý Yêu cầu cứu trợ",
    shortLabel: "Yêu cầu",
    Icon: ClipboardList
  },
  {
    href: "/admin/resources",
    label: "Quản lý Nguồn lực",
    shortLabel: "Nguồn lực",
    Icon: Users
  },
  {
    href: "/admin/inventory",
    label: "Quản lý Kho",
    shortLabel: "Kho",
    Icon: Boxes
  },
  {
    href: "/admin/fund",
    label: "Quản lý Quỹ",
    shortLabel: "Quỹ",
    Icon: Landmark
  },
  {
    href: "/admin/system",
    label: "Quản lý Phân quyền",
    shortLabel: "Phân quyền",
    Icon: ShieldCheck
  }
];

export const volunteerNavigationItems: NavigationItem[] = [
  {
    href: "/volunteer/requests",
    label: "Yêu cầu cứu trợ",
    shortLabel: "Yêu cầu",
    Icon: ClipboardList
  },
  {
    href: "/volunteer/my-requests",
    label: "Tham gia",
    shortLabel: "Tham gia",
    Icon: FileText
  },
  {
    href: "/volunteer/handbook",
    label: "Cẩm nang/Hướng dẫn",
    shortLabel: "Cẩm nang",
    Icon: BookOpenText
  },
  {
    href: "/volunteer/profile",
    label: "Hồ sơ cá nhân",
    shortLabel: "Hồ sơ",
    Icon: UserRound
  }
];
