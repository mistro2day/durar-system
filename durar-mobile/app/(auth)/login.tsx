import { useState } from "react";
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components";
import { Colors, Typography, Spacing, TouchTarget, BorderRadius } from "../../constants/theme";
import api from "../../services/api";

export default function Login() {
    const { signIn } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert("خطأ", "الرجاء إدخال البريد الإلكتروني وكلمة المرور");
            return;
        }

        setLoading(true);
        try {
            const response = await api.post("/api/auth/login", { email, password });
            const { token, user } = response.data;
            await signIn(token, user);
        } catch (error: any) {
            const msg = error.response?.data?.message || "فشل تسجيل الدخول";
            Alert.alert("خطأ", msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: "center",
                        padding: Spacing.lg,
                    }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Logo Section */}
                    <View style={{ alignItems: "center", marginBottom: Spacing.xxl }}>
                        <View style={{
                            width: 80,
                            height: 80,
                            borderRadius: 20,
                            backgroundColor: Colors.light.primary,
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: Spacing.md,
                        }}>
                            <Text style={{ ...Typography.largeTitle, color: "#FFFFFF" }}>د</Text>
                        </View>
                        <Text style={{ ...Typography.largeTitle, color: Colors.light.text }}>
                            درر
                        </Text>
                        <Text style={{ ...Typography.subhead, color: Colors.light.textSecondary, marginTop: Spacing.xs }}>
                            نظام إدارة العقارات
                        </Text>
                    </View>

                    {/* Form Section */}
                    <View style={{
                        backgroundColor: Colors.light.surface,
                        borderRadius: BorderRadius.xl,
                        padding: Spacing.lg,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 3,
                    }}>
                        <Text style={{ ...Typography.title3, color: Colors.light.text, textAlign: "right", marginBottom: Spacing.lg }}>
                            تسجيل الدخول
                        </Text>

                        {/* Email Input */}
                        <View style={{ marginBottom: Spacing.md }}>
                            <Text style={{ ...Typography.subhead, color: Colors.light.textSecondary, textAlign: "right", marginBottom: Spacing.xs }}>
                                البريد الإلكتروني
                            </Text>
                            <TextInput
                                style={{
                                    backgroundColor: Colors.light.background,
                                    borderRadius: BorderRadius.md,
                                    padding: Spacing.md,
                                    minHeight: TouchTarget.minHeight,
                                    ...Typography.body,
                                    color: Colors.light.text,
                                    textAlign: "right",
                                }}
                                placeholder="example@durar.local"
                                placeholderTextColor={Colors.light.textTertiary}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoCorrect={false}
                            />
                        </View>

                        {/* Password Input */}
                        <View style={{ marginBottom: Spacing.lg }}>
                            <Text style={{ ...Typography.subhead, color: Colors.light.textSecondary, textAlign: "right", marginBottom: Spacing.xs }}>
                                كلمة المرور
                            </Text>
                            <TextInput
                                style={{
                                    backgroundColor: Colors.light.background,
                                    borderRadius: BorderRadius.md,
                                    padding: Spacing.md,
                                    minHeight: TouchTarget.minHeight,
                                    ...Typography.body,
                                    color: Colors.light.text,
                                    textAlign: "right",
                                }}
                                placeholder="********"
                                placeholderTextColor={Colors.light.textTertiary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        {/* Login Button */}
                        <Button
                            title="دخول"
                            onPress={handleLogin}
                            loading={loading}
                            fullWidth
                            size="lg"
                        />
                    </View>

                    {/* Footer */}
                    <Text style={{
                        ...Typography.caption1,
                        color: Colors.light.textTertiary,
                        textAlign: "center",
                        marginTop: Spacing.xl,
                    }}>
                        Durar System Mobile v1.0
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
