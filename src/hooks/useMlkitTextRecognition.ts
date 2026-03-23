import { useCallback, useState } from "react";
import MlkitTextRecognition from "@/modules/mlkittextrecognition/MlkitTextRecognition";

export const useMlkitTextRecognition = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognizeTextFromFile = useCallback(
    async (imagePath: string): Promise<string | null> => {
      if (!imagePath || typeof imagePath !== "string") {
        setError("Invalid image path provided");
        return null;
      }

      try {
        setIsProcessing(true);
        setError(null);

        const result =
          await MlkitTextRecognition.recognizeTextFromFile(imagePath);

        return result?.text ?? null;
      } catch (err: any) {
        console.error("ML Kit Text Recognition Error:", err);
        setError(err?.message ?? "Text recognition failed");
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [] // ✅ important fix
  );

  return {
    recognizeTextFromFile,
    isProcessing,
    error,
    clearError: () => setError(null),
  };
};