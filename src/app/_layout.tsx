import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      initialRouteName="index"   // ✅ THIS FIXES IT
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    />
  );
}
