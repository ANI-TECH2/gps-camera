import * as Location from "expo-location";

export type CurrentLocationResult = {
  lat: number;
  lng: number;
  accuracy: number | null;
  address: {
    name?: string;
    street?: string;
    district?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
    formatted: string;
  };
};

const LOCATION_TIMEOUT_MS = 15000;
const MAX_CACHE_AGE_MS = 10000;
const GOOD_ACCURACY_M = 50;
const UPGRADE_INTERVAL_MS = 2000;
const REVERSE_GEOCODE_TIMEOUT_MS = 7000;
const REVERSE_GEOCODE_RETRIES = 1;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = "timeout"
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
};

const blank: CurrentLocationResult["address"] = {
  name: "",
  street: "",
  district: "",
  city: "",
  region: "",
  country: "",
  postalCode: "",
  formatted: "",
};

const ensurePermission = async (): Promise<boolean> => {
  try {
    const { status: existing, canAskAgain } =
      await Location.getForegroundPermissionsAsync();

    if (existing === "granted") return true;

    if (existing === "denied" && !canAskAgain) {
      console.warn("Location permission permanently denied.");
      return false;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  } catch (error) {
    console.warn("Permission check failed:", error);
    return false;
  }
};

const hasLocationServicesEnabled = async (): Promise<boolean> => {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return true;
  }
};

const getFreshCachedFix = async (): Promise<Location.LocationObject | null> => {
  try {
    const last = await Location.getLastKnownPositionAsync({
      maxAge: MAX_CACHE_AGE_MS,
      requiredAccuracy: 200,
    });
    return last ?? null;
  } catch (error) {
    console.warn("Failed to get last known position:", error);
    return null;
  }
};

const buildAddress = (
  place: Location.LocationGeocodedAddress
): CurrentLocationResult["address"] => {
  const formattedAddress =
    "formattedAddress" in place && typeof place.formattedAddress === "string"
      ? place.formattedAddress
      : "";

  const parts = [
    place.name,
    place.street,
    place.district,
    place.city,
    place.region,
    place.country,
  ].filter(Boolean);

  return {
    name: place.name ?? "",
    street: place.street ?? "",
    district: place.district ?? "",
    city: place.city ?? "",
    region: place.region ?? "",
    country: place.country ?? "",
    postalCode: place.postalCode ?? "",
    formatted: formattedAddress || parts.join(", "),
  };
};

const reverseGeocodeOnce = async (
  lat: number,
  lng: number
): Promise<CurrentLocationResult["address"]> => {
  const results = await withTimeout(
    Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    }),
    REVERSE_GEOCODE_TIMEOUT_MS,
    "reverse-geocode-timeout"
  );

  if (results.length > 0) {
    return buildAddress(results[0]);
  }

  return blank;
};

const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<CurrentLocationResult["address"]> => {
  for (let attempt = 0; attempt <= REVERSE_GEOCODE_RETRIES; attempt++) {
    try {
      return await reverseGeocodeOnce(lat, lng);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Reverse geocode attempt ${attempt + 1} failed:`, msg);

      if (attempt < REVERSE_GEOCODE_RETRIES) {
        await sleep(1000);
      }
    }
  }

  return blank;
};

export const getCurrentLocation =
  async (): Promise<CurrentLocationResult | null> => {
    try {
      const permitted = await ensurePermission();
      if (!permitted) return null;

      const servicesEnabled = await hasLocationServicesEnabled();
      if (!servicesEnabled) {
        console.warn("Location services are disabled on device.");
        return null;
      }

      let bestCoords: Location.LocationObjectCoords | null = null;

      // 1. Use cached location first for faster UI
      const cached = await getFreshCachedFix();
      if (cached) {
        bestCoords = cached.coords;
      }

      // 2. Try to improve accuracy before timeout
      const deadline = Date.now() + LOCATION_TIMEOUT_MS;

      const accuracyLevels: Location.Accuracy[] = [
        Location.Accuracy.Balanced,
        Location.Accuracy.High,
        Location.Accuracy.BestForNavigation,
      ];

      for (const accuracyLevel of accuracyLevels) {
        if (Date.now() >= deadline) break;

        const remaining = deadline - Date.now();

        try {
          const fix = await withTimeout(
            Location.getCurrentPositionAsync({ accuracy: accuracyLevel }),
            remaining,
            "location-timeout"
          );

          const acc = fix.coords.accuracy ?? Infinity;

          if (!bestCoords || acc < (bestCoords.accuracy ?? Infinity)) {
            bestCoords = fix.coords;
          }

          if (acc <= GOOD_ACCURACY_M) {
            break;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);

          if (msg === "location-timeout") {
            break;
          }

          console.warn(`Accuracy level ${accuracyLevel} failed:`, err);
        }

        if (Date.now() < deadline) {
          await sleep(UPGRADE_INTERVAL_MS);
        }
      }

      if (!bestCoords) {
        console.warn("No location fix obtained within timeout.");
        return null;
      }

      const lat = bestCoords.latitude;
      const lng = bestCoords.longitude;
      const accuracy = bestCoords.accuracy ?? null;

      // 3. Reverse geocode, but do not fail the whole request if it times out
      const address = await reverseGeocode(lat, lng);

      return {
        lat,
        lng,
        accuracy,
        address,
      };
    } catch (e) {
      console.warn("getCurrentLocation fatal error:", e);
      return null;
    }
  };