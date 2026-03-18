export const MODES = ["gps", "pdf", "read", "price"] as const;

export type CameraMode = (typeof MODES)[number];

export type LocPack = {
  lat: number;
  lng: number;
  accuracy: number | null;
  address?: {
    name?: string;
    street?: string;
    district?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
    formatted?: string;
  };
};