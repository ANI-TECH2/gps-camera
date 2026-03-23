import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  AppState,
  AppStateStatus,
} from "react-native";
import { useIsFocused, router } from "expo-router";
import { useCameraPermissions as useExpoCameraPermissions } from "expo-camera";
import { useCameraPermission } from "react-native-vision-camera";
import { Ionicons } from "@expo/vector-icons";

import { GlassCard } from "@/component/Glass";
import { getCurrentLocation } from "@/services/locationService";
import { useDocumentScanner } from "@/hooks/useDocumentScanner";
import { useTextRecognition } from "@/hooks/useTextRecognition";

import ExpoCameraModes from "@/component/ExpoCameraModes";
import VisionReadCamera, {
  VisionReadCameraHandle,
} from "@/component/VisionReadCamera";
import CameraModeSelector from "@/component/CameraModeSelector";
import { CameraMode, LocPack } from "@/component/camera.types";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ACCURACY_THRESHOLD = 80;
const MAX_LOCATION_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;
const LOCATION_TIMEOUT_MS = 10000;

const withTimeout = async <T,>(
  promise: Promise<T>,
  ms = LOCATION_TIMEOUT_MS
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Location request timed out"));
    }, ms);
    promise
      .then((result) => { clearTimeout(timeoutId); resolve(result); })
      .catch((error) => { clearTimeout(timeoutId); reject(error); });
  });
};

export default function CameraScreen() {
  const expoCamRef = useRef<any>(null);
  const visionCamRef = useRef<VisionReadCameraHandle | null>(null);

  const isFocused = useIsFocused();

  const [expoPermission, requestExpoPermission] = useExpoCameraPermissions();
  const {
    hasPermission: hasVisionPermission,
    requestPermission: requestVisionPermission,
  } = useCameraPermission();

  const [mode, setMode] = useState<CameraMode>("gps");
  const [renderedCamera, setRenderedCamera] = useState<CameraMode>("gps");

  const [recognizedText, setRecognizedText] = useState("");
  const [locPack, setLocPack] = useState<LocPack | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isTakingShot, setIsTakingShot] = useState(false);
  const [scannerPaused, setScannerPaused] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState
  );

  const { recognizeText, isProcessing } = useTextRecognition();
  const { startScan } = useDocumentScanner();

  const busyRef = useRef(false);
  const locationFetchActive = useRef(false);

  const usingVisionCamera = mode === "read";
  const isCameraActive = isFocused && appState === "active" && !scannerPaused;
  const hasCameraPermission = usingVisionCamera
    ? hasVisionPermission
    : !!expoPermission?.granted;
  const activeModeLabel = useMemo(() => mode.toUpperCase(), [mode]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", setAppState);
    return () => sub.remove();
  }, []);

  const requestCorrectPermission = useCallback(async () => {
    try {
      if (usingVisionCamera) {
        const granted = await requestVisionPermission();
        if (!granted)
          Alert.alert("Permission needed", "Please allow camera access for Read mode.");
      } else {
        const result = await requestExpoPermission();
        if (!result.granted)
          Alert.alert("Permission needed", "Please allow camera access.");
      }
    } catch (error) {
      console.warn("Permission request failed:", error);
    }
  }, [requestExpoPermission, requestVisionPermission, usingVisionCamera]);

  const stopLocationFetch = useCallback(() => {
    locationFetchActive.current = false;
    setLocationLoading(false);
  }, []);

  const updateLocation = useCallback(async () => {
    if (mode !== "gps") return;
    if (!isFocused || appState !== "active") return;

    locationFetchActive.current = true;
    setLocationLoading(true);
    setLocationError("");

    let bestFix: LocPack | null = null;
    let attempts = 0;

    while (attempts < MAX_LOCATION_ATTEMPTS && locationFetchActive.current) {
      try {
        const location = await withTimeout(getCurrentLocation(), LOCATION_TIMEOUT_MS);
        if (location) {
          const candidate: LocPack = {
            lat: location.lat,
            lng: location.lng,
            accuracy: location.accuracy ?? null,
            address: location.address,
          };
          const isBetter =
            !bestFix ||
            (candidate.accuracy !== null &&
              (bestFix.accuracy === null || candidate.accuracy < bestFix.accuracy));
          if (isBetter) bestFix = candidate;
          if (candidate.accuracy !== null && candidate.accuracy <= ACCURACY_THRESHOLD) break;
        }
      } catch (err) {
        console.warn(`Location attempt ${attempts + 1} failed:`, err);
      }
      attempts++;
      if (attempts < MAX_LOCATION_ATTEMPTS && locationFetchActive.current) {
        await wait(RETRY_DELAY_MS);
      }
    }

    if (!locationFetchActive.current) return;
    if (bestFix) {
      setLocPack(bestFix);
      setLocationError("");
    } else {
      setLocationError("Unable to fetch location. Check GPS, internet, and location permission.");
    }
    setLocationLoading(false);
    locationFetchActive.current = false;
  }, [appState, isFocused, mode]);

  useEffect(() => {
    return () => { locationFetchActive.current = false; };
  }, []);

  useEffect(() => {
    if (mode === "gps" && isFocused && appState === "active") {
      updateLocation();
    } else {
      stopLocationFetch();
    }
  }, [appState, isFocused, mode, stopLocationFetch, updateLocation]);

  const onChangeMode = useCallback(
    async (nextMode: CameraMode) => {
      if (nextMode === mode) return;
      locationFetchActive.current = false;
      setLocationLoading(false);
      setLocationError("");
      setRecognizedText("");

      if (nextMode === "read") {
        const granted = hasVisionPermission || (await requestVisionPermission());
        if (!granted) {
          Alert.alert("Vision Camera permission", "Enable camera permission to use Read mode.");
          return;
        }
      } else {
        if (!expoPermission?.granted) {
          const result = await requestExpoPermission();
          if (!result.granted) {
            Alert.alert("Permission needed", "Please allow camera access.");
            return;
          }
        }
      }

      setMode(nextMode);
      await wait(300);
      setRenderedCamera(nextMode);

      if (nextMode === "gps" && isFocused && appState === "active") {
        updateLocation();
      }
    },
    [
      appState,
      expoPermission?.granted,
      hasVisionPermission,
      isFocused,
      mode,
      requestExpoPermission,
      requestVisionPermission,
      updateLocation,
    ]
  );

  const handlePdfScan = useCallback(async () => {
    try {
      setScannerPaused(true);
      await wait(250);
      const result = await startScan();
      setScannerPaused(false);
      if (!result || result.status !== "success" || !result.uri) return;
      router.push({
        pathname: "/preview",
        params: { uri: result.uri, mode: "pdf", extractedText: "" },
      });
    } catch (error) {
      console.warn("Document scanner failed:", error);
      setScannerPaused(false);
      Alert.alert("Scanner error", "Document scanner did not open.");
    }
  }, [startScan]);

  const getFreshLocationForShot = useCallback(async (): Promise<LocPack | null> => {
    let bestFix: LocPack | null = locPack;
    let attempts = 0;

    while (attempts < MAX_LOCATION_ATTEMPTS) {
      try {
        const newLocation = await withTimeout(getCurrentLocation(), LOCATION_TIMEOUT_MS);
        if (newLocation) {
          const candidate: LocPack = {
            lat: newLocation.lat,
            lng: newLocation.lng,
            accuracy: newLocation.accuracy ?? null,
            address: newLocation.address,
          };
          const isBetterThanCurrent =
            !bestFix ||
            (candidate.accuracy !== null &&
              (bestFix.accuracy === null || candidate.accuracy < bestFix.accuracy));
          if (isBetterThanCurrent) bestFix = candidate;
          if (candidate.accuracy !== null && candidate.accuracy <= ACCURACY_THRESHOLD) break;
        }
      } catch (err) {
        console.warn(`Shutter location attempt ${attempts + 1} failed:`, err);
      }
      attempts++;
      if (attempts < MAX_LOCATION_ATTEMPTS) await wait(RETRY_DELAY_MS);
    }
    return bestFix;
  }, [locPack]);

  const handleShutterPress = useCallback(async () => {
    if (isTakingShot || busyRef.current) return;
    if (mode === "read") return;

    try {
      setIsTakingShot(true);
      busyRef.current = true;

      if (mode === "pdf") {
        await handlePdfScan();
        return;
      }

      let freshLocation = locPack;

      if (mode === "gps") {
        freshLocation = await getFreshLocationForShot();
        if (freshLocation) {
          setLocPack(freshLocation);
          setLocationError("");
        } else {
          setLocationError("Unable to fetch location.");
        }
      }

      if (!expoCamRef.current) {
        Alert.alert("Camera unavailable", "Expo camera is not ready.");
        return;
      }

      const photo = await expoCamRef.current.takePictureAsync({ quality: 0.85 });
      const uri = photo?.uri ?? "";

      if (!uri) {
        Alert.alert("Capture failed", "No image was captured.");
        return;
      }

      router.push({
        pathname: "/preview",
        params: {
          uri,
          mode,
          extractedText: "",
          lat: freshLocation?.lat ? String(freshLocation.lat) : "",
          lng: freshLocation?.lng ? String(freshLocation.lng) : "",
          accuracy:
            freshLocation?.accuracy !== null &&
            freshLocation?.accuracy !== undefined
              ? String(freshLocation.accuracy) : "",
          address: freshLocation?.address?.formatted || "",
          street: freshLocation?.address?.street || "",
          district: freshLocation?.address?.district || "",
          city: freshLocation?.address?.city || "",
          region: freshLocation?.address?.region || "",
          country: freshLocation?.address?.country || "",
          postalCode: freshLocation?.address?.postalCode || "",
        },
      });
    } catch (error) {
      console.warn("Shutter action failed:", error);
      Alert.alert("Error", "Action failed. Please try again.");
    } finally {
      busyRef.current = false;
      setIsTakingShot(false);
    }
  }, [
    getFreshLocationForShot,
    handlePdfScan,
    isTakingShot,
    locPack,
    mode,
  ]);

  if (!hasCameraPermission) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={42} color="#fff" />
        <Text style={styles.permissionTitle}>Camera permission needed</Text>
        <Text style={styles.permissionSub}>
          Allow camera access to use {activeModeLabel} mode.
        </Text>
        <Pressable style={styles.permissionBtn} onPress={requestCorrectPermission}>
          <Text style={styles.btnText}>Enable Camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderedCamera === "read" ? (
        <VisionReadCamera
          ref={visionCamRef}
          hasPermission={hasVisionPermission}
          isCameraActive={isCameraActive}
          recognizedText={recognizedText}
          setRecognizedText={setRecognizedText}
          recognizeText={recognizeText}
          isProcessing={isProcessing}
          isTakingShot={isTakingShot}
          onTextConfirmed={(text) => {
            setRecognizedText(text);
          }}
        />
      ) : (
        <ExpoCameraModes
          ref={expoCamRef}
          isCameraActive={isCameraActive}
          mode={mode}
          locationLoading={locationLoading}
          locationError={locationError}
          locPack={locPack}
        />
      )}

      <View style={styles.overlayLayer} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <GlassCard style={styles.modeBadge}>
            <Text style={styles.modeBadgeText}>{activeModeLabel}</Text>
          </GlassCard>
        </View>

        <CameraModeSelector
          mode={mode}
          isTakingShot={isTakingShot}
          onChangeMode={onChangeMode}
          onShutterPress={handleShutterPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1, backgroundColor: "#000",
    justifyContent: "center", alignItems: "center", paddingHorizontal: 24,
  },
  overlayLayer: {
    ...StyleSheet.absoluteFillObject, justifyContent: "space-between",
  },
  topBar: { paddingTop: 60, paddingHorizontal: 16 },
  modeBadge: {
    alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 16, backgroundColor: "rgba(0,0,0,0.45)",
  },
  modeBadgeText: {
    color: "#fff", fontSize: 12, fontWeight: "800", letterSpacing: 0.8,
  },
  permissionTitle: {
    color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 14,
  },
  permissionSub: {
    color: "#bfbfbf", textAlign: "center", fontSize: 14,
    marginTop: 8, marginBottom: 18,
  },
  permissionBtn: {
    paddingVertical: 14, paddingHorizontal: 18,
    backgroundColor: "#1E89FF", borderRadius: 12,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});