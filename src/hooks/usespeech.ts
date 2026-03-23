import { useState, useEffect, useRef, useCallback } from "react";
import { Animated, Platform, ScrollView } from "react-native";
import * as Speech from "expo-speech";

export type WordPosition = {
  start: number;
  end: number;
};

export type UseSpeechReturn = {
  isSpeaking: boolean;
  speechRate: number;
  activeWordIndex: number;
  words: string[];
  waveAnim: Animated.Value;
  scrollRef: React.RefObject<ScrollView | null>;
  handleSpeak: () => Promise<void>;
  cycleRate: () => Promise<void>;
  stopSpeech: () => Promise<void>;
  resetSpeech: () => Promise<void>;
  setText: (text: string) => void;
};

const SPEECH_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const MS_PER_WORD_AT_1X = 380;

const useSpeech = (): UseSpeechReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [bestVoice, setBestVoice] = useState<Speech.Voice | null>(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);

  const currentTextRef = useRef("");
  const wordPositionsRef = useRef<WordPosition[]>([]);
  const scrollRef = useRef<ScrollView | null>(null);

  const speechRateRef = useRef(1.0);
  const isSpeakingRef = useRef(false);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boundarySeenRef = useRef(false);

  const waveAnim = useRef(new Animated.Value(1)).current;
  const waveLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    speechRateRef.current = speechRate;
  }, [speechRate]);

  useEffect(() => {
    if (isSpeaking) {
      waveLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1.15,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(waveAnim, {
            toValue: 0.9,
            duration: 350,
            useNativeDriver: true,
          }),
        ])
      );
      waveLoopRef.current.start();
    } else {
      waveLoopRef.current?.stop();
      waveAnim.setValue(1);
    }

    return () => {
      waveLoopRef.current?.stop();
    };
  }, [isSpeaking, waveAnim]);

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const scrollToWord = useCallback((idx: number) => {
    const estimatedLine = Math.floor(idx / 6);
    scrollRef.current?.scrollTo({
      y: Math.max(0, estimatedLine * 28 - 60),
      animated: true,
    });
  }, []);

  const cleanupSpeechState = useCallback(() => {
    isSpeakingRef.current = false;
    boundarySeenRef.current = false;
    setIsSpeaking(false);
    setActiveWordIndex(-1);
    clearFallbackTimer();
  }, [clearFallbackTimer]);

  useEffect(() => {
    return () => {
      clearFallbackTimer();
      Speech.stop();
    };
  }, [clearFallbackTimer]);

  useEffect(() => {
    const initVoice = async () => {
      try {
        const available = await Speech.getAvailableVoicesAsync();
        const english = available.filter((v) => v.language?.startsWith("en"));

        if (english.length > 0) {
          const enhanced = english.filter(
            (v) => v.quality === Speech.VoiceQuality.Enhanced
          );

          const chosen =
            enhanced.find((v) =>
              v.identifier?.toLowerCase().includes("premium")
            ) ??
            enhanced.find((v) =>
              v.identifier?.toLowerCase().includes("enhanced")
            ) ??
            enhanced[0] ??
            english[0];

          setBestVoice(chosen);
        }
      } catch (error) {
        console.warn("Failed to load voices:", error);
      } finally {
        setVoiceReady(true);
      }
    };

    initVoice();
  }, []);

  const setText = useCallback((text: string) => {
    currentTextRef.current = text ?? "";

    if (!text?.trim()) {
      setWords([]);
      wordPositionsRef.current = [];
      setActiveWordIndex(-1);
      return;
    }

    const wordList: string[] = [];
    const positions: WordPosition[] = [];
    const regex = /\S+/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      wordList.push(match[0]);
      positions.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    setWords(wordList);
    wordPositionsRef.current = positions;
    setActiveWordIndex(-1);
  }, []);

  const startFallbackHighlighter = useCallback(
    (startIndex: number, rate: number) => {
      clearFallbackTimer();

      const positions = wordPositionsRef.current;
      if (!positions.length) return;

      const msPerWord = MS_PER_WORD_AT_1X / Math.max(rate, 0.1);

      const schedule = (idx: number) => {
        if (idx >= positions.length || !isSpeakingRef.current) return;

        fallbackTimerRef.current = setTimeout(() => {
          if (!isSpeakingRef.current || boundarySeenRef.current) return;

          setActiveWordIndex(idx);
          scrollToWord(idx);
          schedule(idx + 1);
        }, idx === startIndex ? 0 : msPerWord);
      };

      schedule(startIndex);
    },
    [clearFallbackTimer, scrollToWord]
  );

  const boundaryHandler = useCallback(
    (event: any) => {
      const charIndex = event?.charIndex ?? 0;
      boundarySeenRef.current = true;
      clearFallbackTimer();

      const idx = wordPositionsRef.current.findIndex(
        (pos) => charIndex >= pos.start && charIndex < pos.end
      );

      if (idx !== -1) {
        setActiveWordIndex(idx);
        scrollToWord(idx);
      }
    },
    [clearFallbackTimer, scrollToWord]
  );

  const buildSpeechOptions = useCallback(
    (rate: number): Speech.SpeechOptions => ({
      language: bestVoice?.language ?? "en-US",
      voice: bestVoice?.identifier,
      rate,
      pitch: 1.0,
      volume: 1.0,
      onStart: () => {
        boundarySeenRef.current = false;
        setIsSpeaking(true);
        setActiveWordIndex(0);

        // Only start fallback if no boundary event arrives shortly.
        fallbackTimerRef.current = setTimeout(() => {
          if (!boundarySeenRef.current && isSpeakingRef.current) {
            startFallbackHighlighter(0, speechRateRef.current);
          }
        }, Platform.OS === "android" ? 180 : 250);
      },
      onBoundary: boundaryHandler,
      onDone: cleanupSpeechState,
      onStopped: cleanupSpeechState,
      onError: (error) => {
        console.warn("Speech error:", error);
        cleanupSpeechState();
      },
    }),
    [bestVoice, boundaryHandler, cleanupSpeechState, startFallbackHighlighter]
  );

  const handleSpeak = useCallback(async () => {
    const rawText = currentTextRef.current;
    const text = rawText?.trim();

    if (!text) return;

    const safeText = text.slice(0, Speech.maxSpeechInputLength);

    const currentlySpeaking = await Speech.isSpeakingAsync();
    if (currentlySpeaking || isSpeakingRef.current) {
      await Speech.stop();
      cleanupSpeechState();
      return;
    }

    if (!voiceReady) return;

    isSpeakingRef.current = true;
    Speech.speak(safeText, buildSpeechOptions(speechRateRef.current));
  }, [buildSpeechOptions, cleanupSpeechState, voiceReady]);

  const cycleRate = useCallback(async () => {
    const currentIndex = SPEECH_RATES.indexOf(speechRateRef.current);
    const nextRate =
      SPEECH_RATES[(currentIndex + 1 + SPEECH_RATES.length) % SPEECH_RATES.length];

    setSpeechRate(nextRate);
    speechRateRef.current = nextRate;

    if (!isSpeakingRef.current) return;

    const text = currentTextRef.current?.trim();
    if (!text) return;

    const safeText = text.slice(0, Speech.maxSpeechInputLength);

    await Speech.stop();
    clearFallbackTimer();

    isSpeakingRef.current = true;
    Speech.speak(safeText, buildSpeechOptions(nextRate));
  }, [buildSpeechOptions, clearFallbackTimer]);

  const stopSpeech = useCallback(async () => {
    await Speech.stop();
    cleanupSpeechState();
  }, [cleanupSpeechState]);

  const resetSpeech = useCallback(async () => {
    await Speech.stop();
    cleanupSpeechState();
    currentTextRef.current = "";
    setWords([]);
    wordPositionsRef.current = [];
  }, [cleanupSpeechState]);

  return {
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
    setText,
  };
};

export default useSpeech;