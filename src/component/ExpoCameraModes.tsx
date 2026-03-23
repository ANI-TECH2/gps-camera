import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { CameraView as ExpoCameraView } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/component/Glass";
import { CameraMode, LocPack } from "./camera.types";
import { useMlkitTextRecognition } from "@/hooks/useMlkitTextRecognition";

type Props = {
  isCameraActive: boolean;
  mode: CameraMode;
  locationLoading: boolean;
  locationError: string;
  locPack: LocPack | null;
};

const ExpoCameraModes = forwardRef<ExpoCameraView, Props>(
  ({ isCameraActive, mode, locationLoading, locationError, locPack }, ref) => {
    const internalCameraRef = useRef<ExpoCameraView | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    const {
      recognizeTextFromFile,
      isProcessing: isRecognizing,
    } = useMlkitTextRecognition();

    const [scannedText, setScannedText] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [recognitionError, setRecognitionError] = useState<string | null>(null);

    useEffect(() => {
      const t = setTimeout(() => setIsMounted(true), 150);

      return () => {
        clearTimeout(t);
        setIsMounted(false);
      };
    }, []);

    useImperativeHandle(ref, () => internalCameraRef.current as ExpoCameraView);

    const handleCapture = async () => {
      if (!isCameraActive || isScanning || isRecognizing || !internalCameraRef.current) {
        return;
      }

      setIsScanning(true);
      setRecognitionError(null);

      try {
        const photo = await internalCameraRef.current.takePictureAsync({
          quality: 0.85,
          base64: false,
        });

        if (!photo?.uri) {
          throw new Error("Failed to capture image");
        }

        const text = await recognizeTextFromFile(photo.uri);
        setScannedText(text ?? "No text found");
      } catch (error) {
        console.error("Text recognition failed:", error);
        setRecognitionError("Recognition failed. Try again.");
        setScannedText(null);
      } finally {
        setIsScanning(false);
      }
    };

    const cameraActive = isMounted && isCameraActive;

    return (
      <>
        <ExpoCameraView
          ref={internalCameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          active={cameraActive}
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
                      {locPack.address?.formatted ??
                        `${locPack.lat.toFixed(5)}, ${locPack.lng.toFixed(5)}`}
                    </Text>

                    <Text style={styles.gpsMetaText}>
                      {locPack.lat.toFixed(5)}, {locPack.lng.toFixed(5)}
                    </Text>

                    <Text style={styles.gpsMetaText}>
                      Accuracy:{" "}
                      {locPack.accuracy != null
                        ? `${Math.round(locPack.accuracy)}m`
                        : "N/A"}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.gpsText}>
                    {locationError || "No location"}
                  </Text>
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
                <Text style={styles.infoText}>Using ML Kit Text Recognition</Text>

                {isRecognizing || isScanning ? (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                    style={{ marginTop: 8 }}
                  />
                ) : (
                  <TouchableOpacity
                    onPress={handleCapture}
                    style={styles.scanButton}
                  >
                    <Ionicons name="text" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Scan Text</Text>
                  </TouchableOpacity>
                )}

                {recognitionError ? (
                  <Text style={styles.errorText}>{recognitionError}</Text>
                ) : null}

                {scannedText ? (
                  <View style={styles.resultCard}>
                    <Text style={styles.resultText}>Scanned Text:</Text>
                    <Text style={styles.resultValueText}>{scannedText}</Text>
                  </View>
                ) : null}
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
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 8,
  },
  resultCard: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 12,
  },
  resultText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  resultValueText: {
    color: "#fff",
    fontSize: 11,
    marginTop: 4,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 12,
    marginTop: 8,
  },
});