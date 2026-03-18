import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from "@expo/vector-icons";

// 1. PDF / DOCUMENT OVERLAY
export const PdfOverlay = () => (
  <View style={styles.scannerPrompt}>
    <Ionicons name="document-text-outline" size={44} color="white" />
    <Text style={styles.scannerPromptText}>SMART DOC DETECTION ACTIVE</Text>
    <View style={styles.cornerHint} />
  </View>
);

// 2. READ / TEXT OVERLAY
export const ReadOverlay = () => (
  <View style={styles.readContainer}>
    <View style={styles.readLines}>
      {[1, 2, 3].map(i => (
        <View key={i} style={[styles.readLine, { opacity: 1 - i * 0.2 }]} />
      ))}
    </View>
    <Text style={styles.modeHint}>SCANNING TEXT...</Text>
  </View>
);

// 3. PRICE CHECK OVERLAY
export const PriceOverlay = () => (
  <View style={styles.priceContainer}>
    <View style={styles.priceFrame}>
      {/* Visual corners to help the user align the price tag */}
      <View style={[styles.corner, { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4 }]} />
      <View style={[styles.corner, { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4 }]} />
      <View style={[styles.corner, { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4 }]} />
      <View style={[styles.corner, { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4 }]} />
      
      <Ionicons name="pricetag-outline" size={24} color="#1E89FF" style={{ opacity: 0.5 }} />
    </View>
    <Text style={styles.modeHint}>ALIGN PRICE IN BOX</Text>
  </View>
);

const styles = StyleSheet.create({
  // Shared styles
  modeHint: { color: '#1E89FF', fontSize: 10, fontWeight: '900', marginTop: 15, letterSpacing: 1.5 },
  
  // PDF Styles
  scannerPrompt: { alignItems: 'center', opacity: 0.9 },
  scannerPromptText: { color: 'white', fontSize: 12, fontWeight: 'bold', marginTop: 10, letterSpacing: 1 },
  
  // Read Styles
  readContainer: { alignItems: 'center' },
  readLines: { width: '100%', alignItems: 'center' },
  readLine: { width: '75%', height: 2, backgroundColor: 'white', marginVertical: 12, borderRadius: 1 },

  // Price Styles
  priceContainer: { alignItems: 'center' },
  priceFrame: { 
    width: 240, 
    height: 120, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.2)', 
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: '#1E89FF' },
});