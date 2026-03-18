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

export const getCurrentLocation = async (): Promise<CurrentLocationResult | null> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      console.warn("Location permission denied");
      return null;
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracy = pos.coords.accuracy ?? null;

    let address = {
      name: "",
      street: "",
      district: "",
      city: "",
      region: "",
      country: "",
      postalCode: "",
      formatted: "",
    };

    try {
      const reverse = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lng,
      });

      if (reverse.length > 0) {
        const place = reverse[0];

        const parts = [
          place.name,
          place.street,
          place.district,
          place.city,
          place.region,
          place.country,
        ].filter(Boolean);

        address = {
          name: place.name ?? "",
          street: place.street ?? "",
          district: place.district ?? "",
          city: place.city ?? "",
          region: place.region ?? "",
          country: place.country ?? "",
          postalCode: place.postalCode ?? "",
          formatted: parts.join(", "),
        };
      }
    } catch (geoError) {
      console.warn("Reverse geocode error:", geoError);
    }

    return {
      lat,
      lng,
      accuracy,
      address,
    };
  } catch (e) {
    console.warn("Location error:", e);
    return null;
  }
};