import { recognizeTextFromFile } from './MlkitTextRecognition';

/**
 * Example usage of the MlkitTextRecognition module
 * This demonstrates how to use the text recognition functionality
 */
export const exampleUsage = async () => {
  try {
    // Example: Recognize text from an image file
    // Note: In a real app, you would get this path from an image picker or camera
    const imagePath = '/path/to/your/image.jpg'; // Replace with actual image path
    
    const result = await recognizeTextFromFile(imagePath);
    
    console.log('Recognized text:', result.text);
    console.log('Number of text blocks:', result.blocks.length);
    
    // Process the recognized text structure
    result.blocks.forEach((block, blockIndex) => {
      console.log(`Block ${blockIndex + 1}: "${block.text}"`);
      
      block.lines.forEach((line, lineIndex) => {
        console.log(`  Line ${lineIndex + 1}: "${line.text}"`);
        
        line.elements.forEach((element, elementIndex) => {
          console.log(`    Element ${elementIndex + 1}: "${element.text}"`);
        });
      });
    });
    
    return result;
  } catch (error) {
    console.error('Failed to recognize text:', error);
    // Handle specific error codes:
    // - 'FILE_NOT_FOUND': Image file does not exist at the provided path
    // - 'INPUT_IMAGE_ERROR': Failed to create input image from file
    // - 'TEXT_RECOGNITION_ERROR': Text recognition process failed
    throw error;
  }
};

// Example of how to use with a file picker (pseudo-code)
// In a real React Native app, you might use a library like react-native-document-picker
/*
import DocumentPicker from 'react-native-document-picker';

const pickAndRecognize = async () => {
  try {
    const res = await DocumentPicker.pickSingle({
      type: [DocumentPicker.types.images],
    });
    
    const result = await recognizeTextFromFile(res.uri);
    console.log('Recognition result:', result);
  } catch (err) {
    if (DocumentPicker.isCancel(err)) {
      // User cancelled the picker
    } else {
      throw err;
    }
  }
};
*/

export default exampleUsage;