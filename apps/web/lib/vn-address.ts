import rawData from "./vn-address-data.json";

export type WardEntry = {
  code: string;
  name: string;
  provinceCode: string;
};

export type ProvinceEntry = {
  code: string;
  name: string;
  wards: WardEntry[];
};

type RawWard = {
  Code: string;
  FullName: string;
  ProvinceCode: string;
};

type RawProvince = {
  Code: string;
  FullName: string;
  Wards: RawWard[];
};

export const VN_ADDRESS_DATA: ProvinceEntry[] = (rawData as RawProvince[]).map((province) => ({
  code: province.Code,
  name: province.FullName,
  wards: province.Wards.map((ward) => ({
    code: ward.Code,
    name: ward.FullName,
    provinceCode: ward.ProvinceCode,
  })),
}));

export function getProvinceNames(): string[] {
  return VN_ADDRESS_DATA.map((province) => province.name);
}

export function getProvinceByName(provinceName: string): ProvinceEntry | undefined {
  return VN_ADDRESS_DATA.find((province) => province.name === provinceName);
}

export function getWardNames(provinceName: string): string[] {
  return getProvinceByName(provinceName)?.wards.map((ward) => ward.name) ?? [];
}

export function getDistrictNames(_provinceName: string): string[] {
  return [];
}
