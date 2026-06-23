import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/useColors";
import type { AuthUser } from "@/contexts/AuthContext";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json() as { token?: string; user?: AuthUser; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <View style={s.logoCircle}>
          <Text style={s.logoText}>₹</Text>
        </View>
        <Text style={s.title}>Create Account</Text>
        <Text style={s.subtitle}>Start tracking your finances today</Text>
      </View>

      <View style={s.form}>
        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <View style={s.inputWrapper}>
          <Text style={s.label}>Full Name</Text>
          <TextInput
            style={s.input}
            placeholder="Rahul Sharma"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />
        </View>

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
            placeholder="Min. 6 characters"
            placeholderTextColor={colors.mutedForeground}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[s.btn, loading && s.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={s.btnText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={s.link}>
          <Text style={s.linkText}>
            Already have an account? <Text style={s.linkBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      paddingTop: insets.top + (Platform.OS === "web" ? 67 : 20),
      paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20),
      paddingHorizontal: 24,
      justifyContent: "center",
    },
    header: {
      alignItems: "center",
      marginBottom: 40,
    },
    logoCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    logoText: { fontSize: 28, color: "#FFFFFF", fontFamily: "Inter_700Bold" },
    title: { fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 6 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    form: { gap: 16 },
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
    label: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
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
    btnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
    link: { alignItems: "center", paddingTop: 4 },
    linkText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    linkBold: { color: colors.primary, fontFamily: "Inter_600SemiBold" },
  });
