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

function ShareIcon({ name, label }: { name: any; label: string }) {
  return (
    <Pressable style={styles.shareIcon}>
      <Ionicons name={name} size={26} color="white" />
      <Text style={styles.shareText}>{label}</Text>
    </Pressable>
  );
}

export default function ShareScreen() {
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
  const coordsLine = latShort && lngShort ? `${latShort}, ${lngShort}` : "";

  const detailsLine = [
    params.accuracy ? `${params.accuracy}m Accuracy` : "",
    coordsLine ? coordsLine : "",
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />

      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.topIcon}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <Text style={styles.topTitle}>Share & Save</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.cardWrap}>
        <GlassCard>
          <View style={styles.row}>
            <Image source={{ uri }} style={styles.thumb} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={2}>
                {placeLine}
              </Text>

              {!!streetLine && (
                <Text style={styles.street} numberOfLines={1}>
                  {streetLine}
                </Text>
              )}

              <Text style={styles.sub} numberOfLines={1}>
                {timeLine}
              </Text>

              {!!detailsLine && (
                <Text style={styles.meta} numberOfLines={1}>
                  {detailsLine}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.grid}>
            <ShareIcon name="logo-whatsapp" label="WhatsApp" />
            <ShareIcon name="paper-plane" label="Telegram" />
            <ShareIcon name="logo-linkedin" label="LinkedIn" />
            <ShareIcon name="mail" label="Email" />
          </View>

          <GlassButton
            label="Save to Gallery & Export Report (PDF)"
            variant="primary"
            onPress={() => {}}
            style={{ marginTop: 12 }}
          />
          <GlassButton label="Copy Link" onPress={() => {}} style={{ marginTop: 10 }} />
        </GlassCard>
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
  topTitle: { color: "white", fontSize: 18, fontWeight: "900" },
  cardWrap: { position: "absolute", left: 16, right: 16, bottom: 30 },

  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  thumb: { width: 54, height: 54, borderRadius: 14 },

  title: { color: "white", fontWeight: "900", fontSize: 16 },
  street: { color: "rgba(255,255,255,0.80)", marginTop: 3, fontWeight: "800", fontSize: 12 },
  sub: { color: "rgba(255,255,255,0.70)", marginTop: 3, fontWeight: "700" },
  meta: { color: "rgba(255,255,255,0.62)", marginTop: 3, fontWeight: "700", fontSize: 12 },

  grid: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  shareIcon: {
    width: 74,
    height: 74,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  shareText: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "800" },
});