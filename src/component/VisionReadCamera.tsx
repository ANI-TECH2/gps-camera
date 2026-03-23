import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Modal,
  ScrollView,
  SafeAreaView,
  Clipboard,
} from "react-native";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import TextRecognition, {
  TextRecognitionScript,
} from "@react-native-ml-kit/text-recognition";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/component/Glass";
import { useIsFocused } from "expo-router";
import useSpeech from "@/hooks/usespeech";

type Props = {
  hasPermission: boolean;
  isCameraActive: boolean;
  recognizedText: string;
  setRecognizedText: (text: string) => void;
  recognizeText: (path: string) => Promise<any>;
  isProcessing: boolean;
  isTakingShot: boolean;
  onTextConfirmed?: (text: string) => void;
};

export type VisionReadCameraHandle = {
  takePhoto: Camera["takePhoto"];
  getExtractedText: () => string;
};

const VisionReadCamera = forwardRef<VisionReadCameraHandle, Props>(
  (props, forwardedRef) => {
    const {
      hasPermission,
      isCameraActive,
      recognizedText,
      setRecognizedText,
      recognizeText,
      isProcessing,
      isTakingShot,
      onTextConfirmed,
    } = props;

    const device = useCameraDevice("back");
    const internalCameraRef = useRef<Camera>(null);

    const [isInitialized, setIsInitialized] = useState(false);
    const [isReadyToActivate, setIsReadyToActivate] = useState(false);

    const [textDetected, setTextDetected] = useState(false);
    const [liveText, setLiveText] = useState("");
    const [isAutoScanning, setIsAutoScanning] = useState(false);
    const [isManualScanning, setIsManualScanning] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);

    const [modalVisible, setModalVisible] = useState(false);
    const [extractedText, setExtractedText] = useState("");
    const [copied, setCopied] = useState(false);

    const detectionBusyRef = useRef(false);
    const autoScanLockRef = useRef(false);
    const stableFrameCountRef = useRef(0);
    const lastDetectedTextRef = useRef("");
    // ✅ Track modal state in a ref so the detection loop reads current value
    // without needing it as a dependency (prevents loop restart mid-scan)
    const modalVisibleRef = useRef(false);

    const isFocused = useIsFocused();

    const {
      isSpeaking,
      speechRate,
      activeWordIndex,
      words,
      waveAnim,
      scrollRef,
      handleSpeak,
      cycleRate,
      stopSpeech,
      resetSpeech,
      setText: setSpeechText,
    } = useSpeech();

    // ── Keep modalVisibleRef in sync with state ──
    useEffect(() => {
      modalVisibleRef.current = modalVisible;
    }, [modalVisible]);

    useEffect(() => {
      if (isFocused) {
        autoScanLockRef.current = false;
        detectionBusyRef.current = false;
        stableFrameCountRef.current = 0;
        lastDetectedTextRef.current = "";
        setIsAutoScanning(false);
        setIsManualScanning(false);
        setScanError(null);
        setTextDetected(false);
        setLiveText("");
      }
    }, [isFocused]);

    useEffect(() => {
      if (!modalVisible) stopSpeech();
    }, [modalVisible]);

    useEffect(() => {
      if (extractedText) setSpeechText(extractedText);
    }, [extractedText]);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
      if (textDetected) {
        pulseLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.4, duration: 500, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          ])
        );
        pulseLoop.current.start();
      } else {
        pulseLoop.current?.stop();
        pulseAnim.setValue(1);
      }
      return () => pulseLoop.current?.stop();
    }, [textDetected, pulseAnim]);

    useEffect(() => {
      const t = setTimeout(() => setIsReadyToActivate(true), 500);
      return () => {
        clearTimeout(t);
        setIsReadyToActivate(false);
        setIsInitialized(false);
      };
    }, []);

    useImperativeHandle(forwardedRef, () => ({
      takePhoto: (options) => internalCameraRef.current!.takePhoto(options),
      getExtractedText: () => recognizedText,
    }));

    const cameraActive =
      isCameraActive && isReadyToActivate && !isTakingShot && isFocused && !modalVisible;

    const wordCount = useMemo(() => {
      if (!extractedText.trim()) return 0;
      return extractedText.trim().split(/\s+/).length;
    }, [extractedText]);

    const showExtractedText = useCallback((text: string) => {
      const cleaned = text?.trim();
      if (!cleaned) return;
      autoScanLockRef.current = true;
      setRecognizedText(cleaned);
      setExtractedText(cleaned);
      setTextDetected(false);
      setLiveText("");
      setIsAutoScanning(false);
      setModalVisible(true);
    }, [setRecognizedText]);

    const handleCopy = useCallback(() => {
      if (!extractedText) return;
      Clipboard.setString(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }, [extractedText]);

    const handleRescan = useCallback(() => {
      resetSpeech();
      setCopied(false);
      setModalVisible(false);
      setExtractedText("");
      setRecognizedText("");
      setScanError(null);
      setTextDetected(false);
      setLiveText("");
      stableFrameCountRef.current = 0;
      lastDetectedTextRef.current = "";
      setTimeout(() => { autoScanLockRef.current = false; }, 800);
    }, [resetSpeech, setRecognizedText]);

    const handleUseText = useCallback(() => {
      stopSpeech();
      setCopied(false);
      setModalVisible(false);
      onTextConfirmed?.(extractedText);
    }, [stopSpeech, extractedText, onTextConfirmed]);

    // ── Detection loop ──
    // ✅ modalVisible removed from deps — use modalVisibleRef instead
    // This prevents the loop from restarting/cancelling mid-scan when modal opens
    useEffect(() => {
      if (!isFocused) return;

      let cancelled = false;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const scheduleNext = (ms: number) => {
        if (cancelled) return;
        timeoutId = setTimeout(loop, ms);
      };

      const loop = async () => {
        if (cancelled) return;

        const shouldSkip =
          !cameraActive ||
          !isInitialized ||
          isManualScanning ||
          autoScanLockRef.current ||
          detectionBusyRef.current ||
          modalVisibleRef.current; // ✅ read from ref, not state

        if (shouldSkip) { scheduleNext(1200); return; }

        detectionBusyRef.current = true;

        try {
          const snap = await internalCameraRef.current?.takeSnapshot({ quality: 65 });
          if (!snap?.path || cancelled) return;

          const path = snap.path.startsWith("file://") ? snap.path : `file://${snap.path}`;
          const result = await TextRecognition.recognize(path, TextRecognitionScript.LATIN);
          if (cancelled) return;

          const meaningfulBlocks = (result?.blocks ?? []).filter(
            (b) => b.text?.replace(/[^a-zA-Z0-9]/g, "").length >= 2
          );

          const hasText = meaningfulBlocks.length > 0;
          const currentText = meaningfulBlocks.map((b) => b.text).join(" ").trim();

          setTextDetected(hasText);
          setLiveText(hasText ? (meaningfulBlocks[0]?.text?.trim() ?? "") : "");

          if (hasText) {
            if (currentText === lastDetectedTextRef.current) {
              stableFrameCountRef.current += 1;
            } else {
              stableFrameCountRef.current = 1;
              lastDetectedTextRef.current = currentText;
            }

            if (stableFrameCountRef.current >= 2 && !autoScanLockRef.current && !cancelled) {
              autoScanLockRef.current = true;
              stableFrameCountRef.current = 0;
              setIsAutoScanning(true);

              try {
                await new Promise((r) => setTimeout(r, 400));
                const photo = await internalCameraRef.current?.takePhoto({
                  enableShutterSound: false,
                });
                if (!photo?.path || cancelled) {
                  autoScanLockRef.current = false;
                  return;
                }

                const fullPath = photo.path.startsWith("file://")
                  ? photo.path
                  : `file://${photo.path}`;

                const fullResult = await recognizeText(fullPath);
                const text = fullResult?.text?.trim();

                if (text && !cancelled) {
                  showExtractedText(text);
                } else {
                  autoScanLockRef.current = false;
                }
              } catch (e) {
                console.error("Auto scan error:", e);
                autoScanLockRef.current = false;
              } finally {
                if (!cancelled) setIsAutoScanning(false);
              }
            }
          } else {
            stableFrameCountRef.current = 0;
            lastDetectedTextRef.current = "";
          }
        } catch (e) {
          console.warn("Detection loop error:", e);
        } finally {
          detectionBusyRef.current = false;
          scheduleNext(1200);
        }
      };

      loop();

      return () => {
        cancelled = true;
        detectionBusyRef.current = false;
        if (timeoutId) clearTimeout(timeoutId);
      };
    // ✅ modalVisible removed — loop uses modalVisibleRef to avoid restart on modal open
    }, [cameraActive, isInitialized, isManualScanning, isFocused, recognizeText, showExtractedText]);

    const handleManualScan = useCallback(async () => {
      if (!cameraActive || !isInitialized || isManualScanning || isProcessing || modalVisibleRef.current) return;

      setScanError(null);
      setIsManualScanning(true);
      autoScanLockRef.current = true;

      try {
        const photo = await internalCameraRef.current?.takePhoto({ enableShutterSound: false });
        if (!photo?.path) {
          setScanError("Capture failed. Try again.");
          autoScanLockRef.current = false;
          return;
        }

        const path = photo.path.startsWith("file://") ? photo.path : `file://${photo.path}`;
        const result = await recognizeText(path);
        const text = result?.text?.trim();

        if (!text) {
          setScanError("No text found. Make sure text is clear and well-lit.");
          autoScanLockRef.current = false;
          return;
        }

        showExtractedText(text);
      } catch (e) {
        console.error("Manual scan error:", e);
        setScanError("Scan failed. Please try again.");
        autoScanLockRef.current = false;
      } finally {
        setIsManualScanning(false);
      }
    }, [cameraActive, isInitialized, isManualScanning, isProcessing, recognizeText, showExtractedText]);

    if (!hasPermission || !device) {
      return <View style={styles.center}><ActivityIndicator color="#1E89FF" /></View>;
    }

    if (!isReadyToActivate) return <View style={styles.container} />;

    const isBusy = isManualScanning || isAutoScanning || isProcessing;

    return (
      <View style={styles.container}>
        <Camera
          ref={internalCameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={cameraActive}
          photo={true}
          androidPreviewViewType="texture-view"
          onInitialized={() => setIsInitialized(true)}
        />

        <View style={styles.frameContainer} pointerEvents="none">
          <View style={styles.scanFrame}>
            {(["tl", "tr", "bl", "br"] as const).map((pos) => (
              <View key={pos} style={[styles.corner, styles[pos], textDetected && styles.cornerDetected]} />
            ))}
            <View style={styles.frameStatus}>
              {isAutoScanning ? (
                <View style={styles.statusRow}>
                  <ActivityIndicator size="small" color="#1E89FF" />
                  <Text style={styles.statusTextBlue}>Extracting...</Text>
                </View>
              ) : textDetected ? (
                <View style={styles.statusRow}>
                  <Animated.View style={[styles.statusDot, { transform: [{ scale: pulseAnim }] }]} />
                  <Text style={styles.statusTextGreen}>Text detected</Text>
                </View>
              ) : (
                <Text style={styles.frameHint}>Point at text to scan</Text>
              )}
            </View>
          </View>

          {!!liveText && !isAutoScanning && (
            <View style={styles.liveStrip}>
              <Ionicons name="eye-outline" size={12} color="rgba(255,255,255,0.5)" />
              <Text style={styles.liveStripText} numberOfLines={1}>{liveText}</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomControls}>
          {!!scanError && (
            <GlassCard style={styles.errorCard}>
              <Ionicons name="warning-outline" size={14} color="#ff6b6b" />
              <Text style={styles.errorText}>{scanError}</Text>
            </GlassCard>
          )}
          <TouchableOpacity
            style={[styles.manualBtn, isBusy && styles.manualBtnDisabled]}
            onPress={handleManualScan}
            activeOpacity={0.8}
            disabled={isBusy || !isInitialized}
          >
            {isBusy ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.manualBtnText}>
                  {isAutoScanning ? "Auto scanning..." : "Scanning..."}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="scan-outline" size={20} color="#fff" />
                <Text style={styles.manualBtnText}>Manual Scan</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Extracted Text Modal ── */}
        <Modal visible={modalVisible} transparent={false} animationType="slide" onRequestClose={handleRescan}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.bgOrbTop} />
            <View style={styles.bgOrbBottom} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleRescan} style={styles.modalIconBtn}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.modalHeaderCenter}>
                 ✅ After
            <Text style={styles.modalTitle}>Smart Scan</Text>
             <Text style={styles.modalSubtitle}>Text extracted successfully</Text>
              </View>
              <TouchableOpacity
                style={[styles.copyBtn, copied && styles.copyBtnDone]}
                onPress={handleCopy}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={copied ? "checkmark-done" : "copy-outline"}
                  size={18}
                  color={copied ? "#0B1220" : "#DCEAFE"}
                />
              </TouchableOpacity>
            </View>

            {/* ✅ Summary card — shows word count not hardcoded string */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryLeft}>
                <View style={styles.summaryIconWrap}>
                  <Ionicons name="document-text" size={20} color="#93C5FD" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryTitle} numberOfLines={2}>
                    {extractedText.length > 60
                      ? extractedText.slice(0, 60) + "..."
                      : extractedText}
                  </Text>
                  <Text style={styles.summaryMeta}>
                    {wordCount} words • {speechRate}x speed
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.rateBtn} onPress={cycleRate} activeOpacity={0.8}>
                <Ionicons name="speedometer-outline" size={15} color="#BFDBFE" />
                <Text style={styles.rateBtnText}>{speechRate}x</Text>
              </TouchableOpacity>
            </View>

            {/* Text Card */}
            <View style={styles.textCard}>
              <View style={styles.textCardHeader}>
                <Text style={styles.textCardTitle}>Full Text</Text>
                {isSpeaking ? (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>Speaking</Text>
                  </View>
                ) : (
                  <View style={styles.idleBadge}>
                    <Text style={styles.idleBadgeText}>Ready</Text>
                  </View>
                )}
              </View>

              <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {isSpeaking || activeWordIndex !== -1 ? (
                  <View style={styles.wordContainer}>
                    {words.map((word, idx) => (
                      <Text
                        key={`${word}-${idx}`}
                        style={[
                          styles.word,
                          idx === activeWordIndex && styles.wordActive,
                          idx < activeWordIndex && styles.wordSpoken,
                        ]}
                      >
                        {word}{" "}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.bodyText} selectable>{extractedText}</Text>
                )}
              </ScrollView>
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomBar}>
              <TouchableOpacity style={styles.secondaryAction} onPress={handleRescan} activeOpacity={0.8}>
                <Ionicons name="refresh-outline" size={18} color="#E5E7EB" />
                <Text style={styles.secondaryActionText}>Rescan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryAction, isSpeaking && styles.primaryActionStop]}
                onPress={handleSpeak}
                activeOpacity={0.85}
              >
                <Animated.View style={{ transform: [{ scale: isSpeaking ? waveAnim : 1 }] }}>
                  <Ionicons name={isSpeaking ? "stop-circle" : "volume-high"} size={22} color="#fff" />
                </Animated.View>
                <View>
                  <Text style={styles.primaryActionText}>{isSpeaking ? "Stop Reading" : "Read Aloud"}</Text>
                  <Text style={styles.primaryActionSubtext}>{isSpeaking ? "Tap to stop" : "Listen to text"}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.useBtn} onPress={handleUseText} activeOpacity={0.85}>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.useBtnText}>Use</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    );
  }
);

export default VisionReadCamera;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  frameContainer: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  scanFrame: { width: 300, height: 180, position: "relative", justifyContent: "flex-end", alignItems: "center", paddingBottom: 10 },
  corner: { position: "absolute", width: 28, height: 28, borderColor: "#1E89FF", borderWidth: 3 },
  cornerDetected: { borderColor: "#4caf50" },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  frameStatus: { alignItems: "center" },
  frameHint: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4caf50" },
  statusTextGreen: { color: "#4caf50", fontSize: 12, fontWeight: "700" },
  statusTextBlue: { color: "#1E89FF", fontSize: 12, fontWeight: "700", marginLeft: 6 },
  liveStrip: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10, backgroundColor: "rgba(0,0,0,0.55)", paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, maxWidth: 280, borderWidth: 0.5, borderColor: "rgba(76,175,80,0.4)" },
  liveStripText: { color: "rgba(255,255,255,0.8)", fontSize: 11, flex: 1 },
  bottomControls: { position: "absolute", bottom: 120, left: 0, right: 0, alignItems: "center", gap: 12, paddingHorizontal: 24 },
  errorCard: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 12 },
  errorText: { color: "#ff6b6b", fontSize: 12, flexShrink: 1 },
  manualBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(30,137,255,0.15)", borderWidth: 1, borderColor: "#1E89FF", paddingVertical: 12, paddingHorizontal: 28, borderRadius: 32 },
  manualBtnDisabled: { opacity: 0.5 },
  manualBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  modalSafe: { flex: 1, backgroundColor: "#081018" },
  bgOrbTop: { position: "absolute", top: -80, right: -40, width: 220, height: 220, borderRadius: 999, backgroundColor: "rgba(59,130,246,0.16)" },
  bgOrbBottom: { position: "absolute", bottom: 60, left: -50, width: 180, height: 180, borderRadius: 999, backgroundColor: "rgba(14,165,233,0.10)" },
  modalHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 },
  modalIconBtn: { width: 42, height: 42, borderRadius: 14, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  modalHeaderCenter: { flex: 1, paddingHorizontal: 14 },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  modalSubtitle: { color: "#94A3B8", fontSize: 12, marginTop: 2 },
  copyBtn: { width: 42, height: 42, borderRadius: 14, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(59,130,246,0.14)", borderWidth: 1, borderColor: "rgba(147,197,253,0.20)" },
  copyBtnDone: { backgroundColor: "#86EFAC", borderColor: "#86EFAC" },
  summaryCard: { marginHorizontal: 16, marginBottom: 14, padding: 16, borderRadius: 22, backgroundColor: "rgba(15,23,42,0.94)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  summaryLeft: { flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 12 },
  summaryIconWrap: { width: 42, height: 42, borderRadius: 14, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(59,130,246,0.13)", marginRight: 12 },
  summaryTitle: { color: "#fff", fontSize: 13, fontWeight: "700" },
  summaryMeta: { color: "#94A3B8", fontSize: 12, marginTop: 3 },
  rateBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: "rgba(30,41,59,0.92)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  rateBtnText: { color: "#E2E8F0", fontSize: 13, fontWeight: "700" },
  textCard: { flex: 1, marginHorizontal: 16, marginBottom: 14, borderRadius: 24, backgroundColor: "rgba(15,23,42,0.96)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  textCardHeader: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  textCardTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "rgba(34,197,94,0.14)" },
  liveDot: { width: 8, height: 8, borderRadius: 99, backgroundColor: "#22C55E" },
  liveBadgeText: { color: "#86EFAC", fontSize: 12, fontWeight: "700" },
  idleBadge: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "rgba(148,163,184,0.14)" },
  idleBadgeText: { color: "#CBD5E1", fontSize: 12, fontWeight: "700" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 24 },
  wordContainer: { flexDirection: "row", flexWrap: "wrap" },
  word: { color: "#E2E8F0", fontSize: 16, lineHeight: 30 },
  wordActive: { color: "#fff", backgroundColor: "#2563EB", borderRadius: 8, overflow: "hidden", fontWeight: "800", paddingHorizontal: 4 },
  wordSpoken: { color: "rgba(226,232,240,0.35)" },
  bodyText: { color: "#E2E8F0", fontSize: 16, lineHeight: 30 },
  bottomBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 18 },
  secondaryAction: { width: 80, height: 62, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center", gap: 4 },
  secondaryActionText: { color: "#E5E7EB", fontSize: 12, fontWeight: "700" },
  primaryAction: { flex: 1, minHeight: 62, borderRadius: 22, backgroundColor: "#2563EB", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 14 },
  primaryActionStop: { backgroundColor: "#DC2626" },
  primaryActionText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  primaryActionSubtext: { color: "rgba(255,255,255,0.82)", fontSize: 11, marginTop: 1 },
  useBtn: { width: 80, height: 62, borderRadius: 20, backgroundColor: "#16a34a", justifyContent: "center", alignItems: "center", gap: 4 },
  useBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },
});