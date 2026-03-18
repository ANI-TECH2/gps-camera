import { Alert, PermissionsAndroid, Platform } from "react-native";

// Native module only works on native builds, not web / Expo Go
const DocumentScanner =
  Platform.OS !== "web"
    ? require("react-native-document-scanner-plugin").default
    : null;

export type ScanResult =
  | { uri: string; status: "success" }
  | { uri: null; status: "cancel" }
  | { uri: null; status: "error" };

export const useDocumentScanner = () => {
  const startScan = async (): Promise<ScanResult> => {
    try {
      if (Platform.OS === "web") {
        Alert.alert("Not supported", "Document scanner does not work on web.");
        return { uri: null, status: "error" };
      }

      if (!DocumentScanner) {
        Alert.alert(
          "Build Error",
          "Document scanner module not found. Use a development build, not Expo Go."
        );
        return { uri: null, status: "error" };
      }

      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert("Permission Denied", "Camera access is required.");
          return { uri: null, status: "cancel" };
        }
      }

      const result = await DocumentScanner.scanDocument({
        maxNumDocuments: 1,
        croppedImageQuality: 95,
        letUserAdjustCrop: true,
        responseType: "imageFilePath",
      });

      console.log("SCAN RESULT =>", result);

      if (
        result?.status === "success" &&
        Array.isArray(result.scannedImages) &&
        result.scannedImages.length > 0
      ) {
        return {
          uri: result.scannedImages[0],
          status: "success",
        };
      }

      return { uri: null, status: "cancel" };
    } catch (error) {
      console.error("Scanner Error:", error);
      Alert.alert("Scanner Error", "Could not open or complete document scan.");
      return { uri: null, status: "error" };
    }
  };

  return { startScan };
};