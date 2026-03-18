import React from "react";
import { View, Pressable, Text, StyleSheet, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

export function GlassCard({
  children,
  style,
  intensity = 22,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
}) {
  return (
    <View style={[styles.cardWrap, style]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={["rgba(255,255,255,0.10)", "rgba(255,255,255,0.04)", "rgba(0,0,0,0.12)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.cardInner}>{children}</View>
    </View>
  );
}

export function GlassButton({
  label,
  onPress,
  rightIcon,
  variant = "glass",
  style,
}: {
  label: string;
  onPress?: () => void;
  rightIcon?: React.ReactNode;
  variant?: "glass" | "primary";
  style?: ViewStyle;
}) {
  const isPrimary = variant === "primary";
  return (
    <Pressable onPress={onPress} style={[styles.btnWrap, style]}>
      <View style={[styles.btnOuter, isPrimary && styles.btnOuterPrimary]}>
        {!isPrimary && (
          <>
            <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.05)"]}
              style={StyleSheet.absoluteFill}
            />
          </>
        )}
        {isPrimary && (
          <LinearGradient
            colors={["#3EC7FF", "#1E89FF"]}
            style={StyleSheet.absoluteFill}
          />
        )}

        <View style={styles.btnRow}>
          <Text style={[styles.btnText, isPrimary && styles.btnTextPrimary]}>{label}</Text>
          {rightIcon ? <View style={{ marginLeft: 8 }}>{rightIcon}</View> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrap: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(15,18,22,0.35)",
  },
  cardInner: {
    padding: 12,
  },
  btnWrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
  btnOuter: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(12,14,18,0.30)",
  },
  btnOuterPrimary: {
    borderWidth: 0,
    backgroundColor: "transparent",
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 16,
    fontWeight: "700",
  },
  btnTextPrimary: {
    color: "white",
  },
});