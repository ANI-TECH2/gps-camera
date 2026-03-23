# MlkitTextRecognition Module - Next Steps for Camera-based OCR

## Current Implementation
This module provides file-based text recognition using ML Kit's bundled Latin script model. It exposes a single method:
- `recognizeTextFromFile(imagePath: string): Promise<TextRecognitionResult>`

## Next Steps for Camera-based OCR

### 1. Real-time Camera Integration Options
To add real-time OCR capabilities, consider these approaches:

#### Option A: Using CameraX (Recommended)
- Add CameraX dependencies to `app/build.gradle`:
  ```gradle
  def camerax_version = "1.3.0"
  implementation "androidx.camera:camera-core:${camerax_version}"
  implementation "androidx.camera:camera-camera2:${camerax_version}"
  implementation "androidx.camera:camera-lifecycle:${camerax_version}"
  implementation "androidx.camera:camera-view:${camerax_version}"
  implementation "androidx.camera:camera-extensions:${camerax_version}"
  ```

- Create an ImageAnalyzer that:
  1. Receives ImageProxy from CameraX
  2. Extracts media.Image and rotation info
  3. Creates InputImage using `InputImage.fromMediaImage(mediaImage, rotationDegrees)`
  4. Processes with TextRecognizer
  5. Closes ImageProxy after processing
  6. Implements frame throttling (keep only latest frame)

#### Option B: Using Camera2 API
- More complex but gives finer control
- Similar flow: capture image → get media.Image → determine rotation → create InputImage → process

### 2. Performance Considerations
- **Image Size**: Smaller images process faster but need sufficient text size (16x16 pixels per character minimum)
- **Frame Rate**: For real-time, process at most 10-15 FPS to avoid overwhelming the ML Kit pipeline
- **Battery**: Consider processing only when needed (e.g., user taps a button) rather than continuously
- **Model Choice**: Bundled model (used here) has faster startup but larger app size; unbundled model downloads dynamically

### 3. Architecture Suggestions
- Create a separate module for camera-based OCR (e.g., `MlkitTextRecognitionCameraModule`)
- Use React Native's `emitEvent` or `sendEvent` to send recognition results to JavaScript
- Consider adding a preview overlay to show bounding boxes around detected text
- Implement pause/resume functionality to conserve resources

### 4. Error Handling for Camera
- Handle cases where camera permission is denied
- Handle device rotation changes properly
- Handle cases where ML Kit model hasn't downloaded yet (for unbundled option)
- Handle empty results (no text detected)

### 5. Dependencies to Add
For CameraX approach, add to `app/build.gradle`:
```gradle
dependencies {
    // ... existing dependencies
    
    // CameraX
    def camerax_version = "1.3.0"
    implementation "androidx.camera:camera-core:${camerax_version}"
    implementation "androidx.camera:camera-camera2:${camerax_version}"
    implementation "androidx.camera:camera-lifecycle:${camerax_version}"
    implementation "androidx.camera:camera-view:${camerax_version}"
    implementation "androidx.camera:camera-extensions:${camerax_version}"
    
    // Lifecycle (if not already present)
    implementation "androidx.lifecycle:lifecycle-runtime-ktx:2.6.2"
    implementation "androidx.lifecycle:lifecycle-common-ktx:2.6.2"
}
```

### 6. Permission Handling
Remember to add camera permission to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
```
And request it at runtime from JavaScript using Permissions API or similar.

### 7. Sample Camera Integration Flow
1. Request camera permission
2. Initialize CameraX preview and analysis use cases
3. Set up ImageAnalyzer that:
   - Gets media.Image from ImageProxy
   - Calculates rotation compensation
   - Creates InputImage
   - Processes with TextRecognizer
   - Sends results back to JS via React Native bridge
   - Closes ImageProxy
4. Clean up resources when component unmounts

## Notes on Bundled vs Unbundled Model
- **Current**: Bundled model (`com.google.mlkit:text-recognition:16.0.1`) - model included in app (~4MB size increase per architecture)
- **Alternative**: Unbundled model (`com.google.android.gms:play-services-mlkit-text-recognition:19.0.1`) - ~260KB size increase but requires Google Play Services and model download
- For unbundled model, consider adding auto-install manifest tag:
  ```xml
  <meta-data
      android:name="com.google.mlkit.vision.DEPENDENCIES"
      android:value="ocr" />
  ```

## Testing Recommendations
1. Test with various image qualities (blurry, dark, rotated)
2. Test with different text sizes and fonts
3. Test performance on different device tiers
4. Verify memory usage doesn't leak with continuous processing
5. Test orientation handling (portrait/landscape)

## References
- ML Kit Text Recognition Documentation: https://developers.google.com/ml-kit/vision/text-recognition/android
- CameraX Documentation: https://developer.android.com/training/camerax
- React Native Native Modules Guide: https://reactnative.dev/docs/native-modules-android