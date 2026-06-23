import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import type { AuthUser } from "@/contexts/AuthContext";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json() as { token?: string; user?: AuthUser; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await login(data.token!, data.user!);
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors, insets);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.logoCircle}>
          <Text style={s.logoText}>₹</Text>
        </View>
        <Text style={s.title}>SmartSpend</Text>
        <Text style={s.subtitle}>Your personal finance companion</Text>
      </View>

      <View style={s.form}>
        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <View style={s.inputWrapper}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="your@email.com"
            placeholderTextColor={colors.mutedForeground}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        </View>

        <View style={s.inputWrapper}>
          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor={colors.mutedForeground}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
        </View>

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.btnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/(auth)/register")} style={s.link}>
          <Text style={s.linkText}>
            Don't have an account? <Text style={s.linkBold}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
      paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
      paddingHorizontal: 24,
      justifyContent: "center",
    },
    header: {
      alignItems: "center",
      marginBottom: 48,
    },
    logoCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    logoText: {
      fontSize: 32,
      color: "#FFFFFF",
      fontFamily: "Inter_700Bold",
    },
    title: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 15,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    form: {
      gap: 16,
    },
    errorText: {
      color: colors.destructive,
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      textAlign: "center",
      backgroundColor: colors.destructive + "18",
      padding: 10,
      borderRadius: 8,
    },
    inputWrapper: { gap: 6 },
    label: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
      color: colors.foreground,
    },
    input: {
      height: 52,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: colors.radius,
      paddingHorizontal: 16,
      fontSize: 15,
      color: colors.foreground,
      backgroundColor: colors.card,
      fontFamily: "Inter_400Regular",
    },
    btn: {
      height: 54,
      backgroundColor: colors.primary,
      borderRadius: colors.radius,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    link: { alignItems: "center", paddingTop: 4 },
    linkText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    linkBold: {
      color: colors.primary,
      fontFamily: "Inter_600SemiBold",
    },
  });
