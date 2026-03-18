import React, { forwardRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import {
  CameraView as ExpoCameraView,
} from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/component/Glass";
import { CameraMode, LocPack } from "./camera.types";

type Props = {
  isCameraActive: boolean;
  mode: CameraMode;
  locationLoading: boolean;
  locationError: string;
  locPack: LocPack | null;
};

const ExpoCameraModes = forwardRef<ExpoCameraView, Props>(
  ({ isCameraActive, mode, locationLoading, locationError, locPack }, ref) => {
    return (
      <>
        <ExpoCameraView
          ref={ref}
          style={StyleSheet.absoluteFill}
          facing="back"
          active={isCameraActive}
        />

        <View style={styles.overlayLayer} pointerEvents="box-none">
          <View style={styles.topBar}>
            {mode === "gps" && (
              <GlassCard style={styles.locationCard}>
                <Ionicons name="location" size={16} color="#1E89FF" />
                {locationLoading ? (
                  <Text style={styles.gpsText}>Fetching location...</Text>
                ) : locPack ? (
                  <View style={styles.locationTextWrap}>
                    <Text style={styles.gpsText} numberOfLines={2}>
                      {locPack.address?.formatted ||
                        `${locPack.lat.toFixed(5)}, ${locPack.lng.toFixed(5)}`}
                    </Text>

                    <Text style={styles.gpsMetaText}>
                      {locPack.lat.toFixed(5)}, {locPack.lng.toFixed(5)}
                    </Text>

                    <Text style={styles.gpsMetaText}>
                      Accuracy:{" "}
                      {locPack.accuracy !== null && locPack.accuracy !== undefined
                        ? `${Math.round(locPack.accuracy)}m`
                        : "N/A"}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.gpsText}>{locationError || "No location"}</Text>
                )}
              </GlassCard>
            )}

            {mode === "pdf" && (
              <GlassCard style={styles.infoCard}>
                <Text style={styles.infoText}>Document scanner mode</Text>
              </GlassCard>
            )}

            {mode === "price" && (
              <GlassCard style={styles.infoCard}>
                <Text style={styles.infoText}>Price capture mode</Text>
              </GlassCard>
            )}
          </View>
        </View>
      </>
    );
  }
);

ExpoCameraModes.displayName = "ExpoCameraModes";

export default ExpoCameraModes;

const styles = StyleSheet.create({
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  topBar: {
    paddingTop: 60,
    paddingHorizontal: 16,
    gap: 12,
  },
  locationCard: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    maxWidth: "92%",
  },
  locationTextWrap: {
    marginLeft: 6,
    flexShrink: 1,
  },
  gpsText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  gpsMetaText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  infoCard: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  infoText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});