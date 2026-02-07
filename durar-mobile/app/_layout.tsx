import "../global.css";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

function RootStack() {
    const { colors, isDark } = useTheme();

    return (
        <>
            <StatusBar style={isDark ? "light" : "dark"} />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                }}
            >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
                <Stack.Screen
                    name="unit/[id]"
                    options={{
                        headerShown: true,
                        title: 'تفاصيل الوحدة',
                        headerBackTitle: 'رجوع',
                    }}
                />
                <Stack.Screen
                    name="tenant/[id]"
                    options={{
                        headerShown: true,
                        title: 'تفاصيل المستأجر',
                        headerBackTitle: 'رجوع',
                    }}
                />
                <Stack.Screen
                    name="contract/[id]"
                    options={{
                        headerShown: true,
                        title: 'تفاصيل العقد',
                        headerBackTitle: 'رجوع',
                    }}
                />
                <Stack.Screen
                    name="property/[id]"
                    options={{
                        headerShown: true,
                        title: 'تفاصيل العقار',
                        headerBackTitle: 'رجوع',
                    }}
                />
                <Stack.Screen
                    name="activities"
                    options={{
                        headerShown: true,
                        title: 'الأنشطة الأخيرة',
                        headerBackTitle: 'رجوع',
                    }}
                />
            </Stack>
        </>
    );
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <AuthProvider>
                    <RootStack />
                </AuthProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
