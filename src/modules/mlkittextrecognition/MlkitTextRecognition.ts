import { NativeModules, Platform } from 'react-native';
import type { TextRecognitionResult } from './types';

const { MlkitTextRecognition } = NativeModules;

export const recognizeTextFromFile = async (
  imagePath: string
): Promise<TextRecognitionResult> => {
  if (Platform.OS !== 'android') {
    throw new Error('MlkitTextRecognition is only available on Android');
  }

  if (!MlkitTextRecognition?.recognizeTextFromFile) {
    throw new Error('MlkitTextRecognition module not properly linked');
  }

  try {
    const result = await MlkitTextRecognition.recognizeTextFromFile(imagePath);
    return result;
  } catch (error) {
    throw error;
  }
};

export default {
  recognizeTextFromFile,
};