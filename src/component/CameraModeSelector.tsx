import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraMode, MODES } from "./camera.types";

type Props = {
  mode: CameraMode;
  isTakingShot: boolean;
  onChangeMode: (mode: CameraMode) => void;
  onShutterPress: () => void;
};

export default function CameraModeSelector({
  mode,
  isTakingShot,
  onChangeMode,
  onShutterPress,
}: Props) {
  return (
    <View style={styles.bottomSection} pointerEvents="box-none">
      <View style={styles.modeRow}>
        {MODES.map((item) => {
          const active = item === mode;
          return (
            <Pressable
              key={item}
              onPress={() => onChangeMode(item)}
              style={[styles.modeChip, active && styles.modeChipActive]}
            >
              <Text
                style={[styles.modeChipText, active && styles.modeChipTextActive]}
              >
                {item.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={onShutterPress}
        style={styles.shutterOuter}
        disabled={isTakingShot}
      >
        <View style={styles.shutterInner} />
      </Pressable>

      <Text style={styles.helperText}>
        {mode === "gps" && "Capture with location"}
        {mode === "pdf" && "Open document scanner"}
        {mode === "read" && "Live text recognition"}
        {mode === "price" && "Capture item for price lookup"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomSection: {
    paddingBottom: 36,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  modeChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  modeChipActive: {
    backgroundColor: "rgba(30,137,255,0.28)",
    borderColor: "#1E89FF",
  },
  modeChipText: {
    color: "#bbb",
    fontSize: 12,
    fontWeight: "800",
  },
  modeChipTextActive: {
    color: "#fff",
  },
  shutterOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
  },
  helperText: {
    color: "#ddd",
    marginTop: 14,
    fontSize: 12,
    fontWeight: "600",
  },
});