
export type LocationResult = {
  id: string;
  label: string;
  lat: string;
  lon: string;
};

export type Status = "idle" | "loading" | "success" | "empty" | "error";
