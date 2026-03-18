import { useCallback, useRef, useState } from "react";
import TextRecognition, {
  TextRecognitionScript,
  TextRecognitionResult,
} from "@react-native-ml-kit/text-recognition";

export const useTextRecognition = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const busyRef = useRef(false);

  const recognizeText = useCallback(
    async (
      imageUri: string,
      script: TextRecognitionScript = TextRecognitionScript.LATIN
    ): Promise<TextRecognitionResult | null> => {
      if (!imageUri || typeof imageUri !== "string") return null;
      if (busyRef.current) return null;

      try {
        busyRef.current = true;
        setIsProcessing(true);

        const normalizedPath = imageUri.startsWith("file://")
          ? imageUri
          : `file://${imageUri}`;

        console.log("OCR input path:", normalizedPath);

        const result = await TextRecognition.recognize(normalizedPath, script);

        console.log("OCR result:", result);

        return result ?? null;
      } catch (error) {
        console.error("OCR Recognition Error:", error);
        return null;
      } finally {
        busyRef.current = false;
        setIsProcessing(false);
      }
    },
    []
  );

  return { recognizeText, isProcessing };
};