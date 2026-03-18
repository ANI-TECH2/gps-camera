import React, { useMemo } from "react";
import { View, Text, StyleSheet, Image, Pressable, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard, GlassButton } from "@/component/Glass";

function formatTime(msStr?: string) {
  const ms = Number(msStr || Date.now());
  const d = new Date(ms);
  const date = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${date} • ${time}`;
}

export default function PreviewScreen() {
  const params = useLocalSearchParams<{
    uri: string;

    // gps
    lat?: string;
    lng?: string;
    accuracy?: string;

    // address
    country?: string;
    state?: string;
    city?: string;
    street?: string;
    streetNumber?: string;

    // time
    capturedAt?: string;
  }>();

  const uri = params.uri;

  const placeLine = useMemo(() => {
    return [params.city, params.state, params.country].filter(Boolean).join(", ") || "Unknown location";
  }, [params.city, params.state, params.country]);

  const streetLine = useMemo(() => {
    return [params.streetNumber, params.street].filter(Boolean).join(" ");
  }, [params.streetNumber, params.street]);

  const timeLine = useMemo(() => formatTime(params.capturedAt), [params.capturedAt]);

  const latShort = params.lat ? String(params.lat).slice(0, 7) : "";
  const lngShort = params.lng ? String(params.lng).slice(0, 7) : "";

  const accuracyLine = params.accuracy ? `${params.accuracy}m Accuracy` : "Accuracy —";
  const coordsLine = latShort && lngShort ? `${latShort}, ${lngShort}` : "";

  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />

      {/* top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.topIcon}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <Text style={styles.topTitle}>Preview</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* location stamp (glass) */}
      <View style={styles.stampWrap}>
        <GlassCard>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Ionicons name="location" size={18} color="white" style={{ marginTop: 2 }} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.stampTitle} numberOfLines={2}>
                {placeLine}
              </Text>

              {!!streetLine && (
                <Text style={styles.stampStreet} numberOfLines={1}>
                  {streetLine}
                </Text>
              )}

              <Text style={styles.stampSub} numberOfLines={1}>
                {timeLine}
              </Text>

              <Text style={styles.stampSub} numberOfLines={1}>
                {accuracyLine}
                {coordsLine ? ` • ${coordsLine}` : ""}
              </Text>
            </View>
          </View>
        </GlassCard>
      </View>

      {/* action buttons */}
      <View style={styles.actions}>
        <GlassButton
          label="Edit"
          onPress={() =>
            router.push({
              pathname: "/edit",
              params, // pass everything through
            })
          }
        />
        <GlassButton
          label="Save"
          variant="primary"
          onPress={() =>
            router.push({
              pathname: "/share",
              params, // pass everything through
            })
          }
        />
        <Text style={styles.caption}>Tap Edit to adjust before sharing</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  topBar: {
    position: "absolute",
    top: Platform.select({ ios: 60, android: 36 }),
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { color: "white", fontSize: 18, fontWeight: "800" },

  stampWrap: { position: "absolute", left: 16, right: 16, bottom: 160 },

  stampTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  stampStreet: { color: "rgba(255,255,255,0.80)", marginTop: 4, fontSize: 13, fontWeight: "700" },
  stampSub: { color: "rgba(255,255,255,0.70)", marginTop: 4, fontSize: 12, fontWeight: "700" },

  actions: { position: "absolute", left: 16, right: 16, bottom: 34, gap: 12 },
  caption: { textAlign: "center", color: "rgba(255,255,255,0.65)", fontWeight: "600", marginTop: 6 },
});