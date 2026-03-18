import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Image, Pressable, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard, GlassButton } from "@/component/Glass";
import { BlurView } from "expo-blur";

function formatTime(msStr?: string) {
  const ms = Number(msStr || Date.now());
  const d = new Date(ms);
  const date = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${date} • ${time}`;
}

export default function EditScreen() {
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

  const uri = params.uri as string;
  const [voiceOpen, setVoiceOpen] = useState(false);

  const placeLine = useMemo(() => {
    return [params.city, params.state, params.country].filter(Boolean).join(", ") || "Unknown location";
  }, [params.city, params.state, params.country]);

  const streetLine = useMemo(() => {
    return [params.streetNumber, params.street].filter(Boolean).join(" ");
  }, [params.streetNumber, params.street]);

  const timeLine = useMemo(() => formatTime(params.capturedAt), [params.capturedAt]);

  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />

      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.topIcon}>
          <Ionicons name="chevron-back" size={22} color="white" />
        </Pressable>
        <Text style={styles.topTitle}>Smart Photo Editing</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.photoFrame}>
        <GlassCard style={{ padding: 0 }}>
          <Image source={{ uri }} style={styles.previewImg} resizeMode="cover" />

          {/* Stamp */}
          <View style={styles.stampInside}>
            <GlassCard intensity={16} style={{ padding: 0 }}>
              <View style={styles.stampRow}>
                <Ionicons name="location" size={16} color="white" />
                <View style={{ marginLeft: 8, flex: 1 }}>
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
                </View>
              </View>
            </GlassCard>
          </View>
        </GlassCard>
      </View>

      {/* tools row */}
      <View style={styles.toolsRow}>
        <Tool icon="crop-outline" label="Crop &\nStraighten" />
        <Tool icon="color-filter-outline" label="Filters" />
        <Tool icon="options-outline" label="Adjust" />
        <Tool icon="pencil-outline" label="Annotate" />
        <Tool icon="water-outline" label="Watermark" />
      </View>

      {/* voice + next */}
      <View style={styles.bottomRow}>
        <GlassButton label="Add Voice Note" onPress={() => setVoiceOpen(true)} />
        <GlassButton label="Next" variant="primary" onPress={() => router.push({ pathname: "/share", params })} />
      </View>

      {/* voice bottom sheet */}
      {voiceOpen && (
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setVoiceOpen(false)} />
          <View style={styles.sheet}>
            <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Add Voice Note</Text>
              <Pressable onPress={() => setVoiceOpen(false)} style={styles.sheetClose}>
                <Ionicons name="close" size={20} color="white" />
              </Pressable>
            </View>

            <View style={styles.wave}>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "700" }}>Recording…</Text>
              <Text style={{ color: "white", fontWeight: "900", fontSize: 28, marginTop: 10 }}>00:12</Text>
            </View>

            <View style={styles.sheetBtns}>
              <GlassButton label="Pause" onPress={() => {}} />
              <GlassButton label="Done" variant="primary" onPress={() => setVoiceOpen(false)} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function Tool({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.tool}>
      <Ionicons name={icon} size={20} color="white" />
      <Text style={styles.toolText}>{label}</Text>
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

  photoFrame: { position: "absolute", left: 16, right: 16, top: 130 },
  previewImg: { width: "100%", height: 240, borderRadius: 18 },
  stampInside: { position: "absolute", left: 12, bottom: 12, right: 12 },

  stampRow: { flexDirection: "row", alignItems: "flex-start", padding: 10 },
  stampTitle: { color: "white", fontWeight: "900" },
  stampStreet: { color: "rgba(255,255,255,0.82)", marginTop: 3, fontSize: 12, fontWeight: "800" },
  stampSub: { color: "rgba(255,255,255,0.72)", marginTop: 3, fontSize: 12, fontWeight: "700" },

  toolsRow: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 390,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  tool: { width: 68, alignItems: "center", gap: 6 },
  toolText: { color: "rgba(255,255,255,0.72)", fontSize: 11, fontWeight: "700", textAlign: "center" },

  bottomRow: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 34,
    flexDirection: "row",
    gap: 12,
  },

  // bottom sheet
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    padding: 14,
    backgroundColor: "rgba(12,14,18,0.40)",
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { color: "white", fontWeight: "900", fontSize: 16 },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  wave: {
    marginTop: 14,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.20)",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 130,
  },
  sheetBtns: { flexDirection: "row", gap: 12, marginTop: 14 },
});