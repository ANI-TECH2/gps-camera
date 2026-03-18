import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from "@expo/vector-icons";

interface GpsProps {
  location: { lat: number; lng: number; accuracy: number };
}

export const GpsOverlay = ({ location }: GpsProps) => (
  <View style={styles.container}>
    <View style={styles.tagRow}>
      <Ionicons name="location-sharp" size={14} color="#1E89FF" />
      <Text style={styles.mainText}>PORT HARCOURT, RIVERS</Text>
    </View>
    <Text style={styles.subText}>
      {location.lat.toFixed(5)}°N, {location.lng.toFixed(5)}°E • ±{Math.round(location.accuracy)}m
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 120, width: '100%', alignItems: 'center' },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  mainText: { color: 'white', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  subText: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '600' },
});