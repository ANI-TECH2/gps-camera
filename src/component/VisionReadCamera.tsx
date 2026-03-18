import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import { GlassCard } from "@/component/Glass";

type Props = {
  hasPermission: boolean;
  isCameraActive: boolean;
  recognizedText: string;
  setRecognizedText: (text: string) => void;
  recognizeText: (path: string) => Promise<any>;
  isProcessing: boolean;
  isTakingShot: boolean;
};

const VisionReadCamera = forwardRef<Camera, Props>((props, forwardedRef) => {
  const { 
    hasPermission, isCameraActive, recognizedText, 
    setRecognizedText, recognizeText, isProcessing, isTakingShot 
  } = props;

  const device = useCameraDevice("back");
  const internalCameraRef = useRef<Camera>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useImperativeHandle(forwardedRef, () => internalCameraRef.current as Camera);

  // Real-time OCR Loop
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const runOcrLoop = async () => {
      if (!isMounted || !isCameraActive || !isInitialized || isProcessing || isTakingShot) {
        timeoutId = setTimeout(runOcrLoop, 1000);
        return;
      }

      try {
        const photo = await internalCameraRef.current?.takeSnapshot({ quality: 70 });
        if (photo && isMounted) {
          const result = await recognizeText(photo.path);
          if (result?.text && isMounted) {
            setRecognizedText(result.text);
          }
        }
      } catch (e) {
        // Silently catch snapshot errors during transitions
      }

      if (isMounted) {
        timeoutId = setTimeout(runOcrLoop, 500); 
      }
    };

    runOcrLoop();
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [isCameraActive, isInitialized, isProcessing, isTakingShot]);

  if (!device) return <View style={styles.center}><ActivityIndicator color="#1E89FF" /></View>;

  return (
    <View style={styles.container}>
      <Camera
        ref={internalCameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isCameraActive}
        photo={true}
        // Texture-view fixes the black screen on most Android hardware
        androidPreviewViewType="texture-view"
        onInitialized={() => setIsInitialized(true)}
      />
      <View style={styles.readUIContainer} pointerEvents="none">
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          
          {isProcessing && <ActivityIndicator color="#1E89FF" style={styles.loader} />}
          
          {!!recognizedText && (
            <GlassCard style={styles.readTextCard}>
              <Text style={styles.readText} numberOfLines={6}>{recognizedText}</Text>
            </GlassCard>
          )}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  readUIContainer: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  scanFrame: { width: 300, height: 240, position: "relative", justifyContent: "center", alignItems: "center" },
  corner: { position: "absolute", width: 25, height: 25, borderColor: "#1E89FF", borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  readTextCard: { padding: 12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12, width: '90%' },
  readText: { color: "#fff", fontSize: 13, textAlign: 'center' },
  loader: { marginBottom: 10 }
});

export default VisionReadCamera;