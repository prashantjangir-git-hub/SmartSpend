import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { useGetAISummary } from "@workspace/api-client-react";

const QUICK_QUESTIONS = [
  "How much did I spend on food last month?",
  "Am I overspending on entertainment?",
  "What is my biggest expense category?",
  "How much can I save this month?",
  "Compare my income vs expenses",
];

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function AIScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState("");

  const month = getCurrentMonth();
  const { data: aiSummary, isLoading: summaryLoading, refetch: refetchSummary } = useGetAISummary({ month });

  const handleQuery = async (q?: string) => {
    const question = q ?? query;
    if (!question.trim()) return;
    setQueryLoading(true);
    setAnswer("");
    setQueryError("");
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const res = await fetch(`https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api/ai/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify({ query: question, month }),
      });
      const data = await res.json() as { answer?: string; error?: string };
      if (!res.ok || data.error) {
        setQueryError(data.error ?? "AI service error");
        return;
      }
      setAnswer(data.answer ?? "");
      setQuery("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setQueryError("Network error. Check your connection.");
    } finally {
      setQueryLoading(false);
    }
  };

  const s = styles(colors, insets);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior="padding">
      <View style={s.header}>
        <Text style={s.headerTitle}>AI Insights</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>Gemini</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Monthly AI Summary */}
        <View style={s.summaryCard}>
          <View style={s.summaryCardHeader}>
            <Feather name="zap" size={18} color={colors.primary} />
            <Text style={s.summaryCardTitle}>Monthly Summary</Text>
            <TouchableOpacity onPress={() => refetchSummary()} style={{ marginLeft: "auto" }}>
              <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {summaryLoading ? (
            <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />
          ) : aiSummary ? (
            <View>
              <Text style={s.summaryText}>{aiSummary.summary}</Text>
              <View style={s.insightsList}>
                {aiSummary.insights.map((insight, i) => (
                  <View key={i} style={s.insightRow}>
                    <View style={s.insightDot} />
                    <Text style={s.insightText}>{insight}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => refetchSummary()} style={s.generateBtn}>
              <Text style={s.generateBtnText}>Generate AI Summary</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Questions */}
        <Text style={s.sectionTitle}>Ask about your finances</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {QUICK_QUESTIONS.map(q => (
              <TouchableOpacity
                key={q}
                style={s.quickChip}
                onPress={() => handleQuery(q)}
                activeOpacity={0.7}
              >
                <Text style={s.quickChipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* AI Answer */}
        {queryLoading && (
          <View style={s.answerCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.mutedForeground, marginTop: 8, fontFamily: "Inter_400Regular", fontSize: 13 }}>
              Thinking...
            </Text>
          </View>
        )}

        {answer && !queryLoading && (
          <View style={s.answerCard}>
            <View style={s.answerHeader}>
              <Feather name="message-circle" size={16} color={colors.primary} />
              <Text style={s.answerLabel}>AI Response</Text>
            </View>
            <Text style={s.answerText}>{answer}</Text>
          </View>
        )}

        {queryError && (
          <View style={[s.answerCard, { borderLeftColor: colors.expense }]}>
            <Text style={{ color: colors.expense, fontFamily: "Inter_500Medium", fontSize: 14 }}>{queryError}</Text>
          </View>
        )}

        <View style={{ height: Platform.OS === "web" ? 34 : 80 }} />
      </ScrollView>

      {/* Query Input */}
      <View style={[s.inputBar, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 12) }]}>
        <TextInput
          style={s.queryInput}
          placeholder="Ask anything about your spending..."
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          returnKeyType="send"
          onSubmitEditing={() => handleQuery()}
          multiline={false}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!query.trim() || queryLoading) && { opacity: 0.4 }]}
          onPress={() => handleQuery()}
          disabled={!query.trim() || queryLoading}
        >
          <Feather name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// Helper to get token from storage
async function getToken(): Promise<string> {
  const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
  return (await AsyncStorage.getItem("auth_token")) ?? "";
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    header: {
      flexDirection: "row", alignItems: "center", gap: 10,
      paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
      paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.background,
    },
    headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    badge: { backgroundColor: colors.primary + "20", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.primary },
    scroll: { paddingHorizontal: 20, paddingTop: 4 },
    summaryCard: {
      backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 20,
      borderLeftWidth: 3, borderLeftColor: colors.primary,
    },
    summaryCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    summaryCardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    summaryText: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 12 },
    insightsList: { gap: 8 },
    insightRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
    insightDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 },
    insightText: { flex: 1, fontSize: 13, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 20 },
    generateBtn: {
      backgroundColor: colors.primary + "20", padding: 12, borderRadius: 10, alignItems: "center",
    },
    generateBtnText: { color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 10 },
    quickChip: {
      backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
      borderWidth: 1, borderColor: colors.border, maxWidth: 220,
    },
    quickChipText: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_400Regular" },
    answerCard: {
      backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 16,
      borderLeftWidth: 3, borderLeftColor: colors.primary, alignItems: "flex-start",
    },
    answerHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
    answerLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.primary },
    answerText: { fontSize: 14, color: colors.foreground, fontFamily: "Inter_400Regular", lineHeight: 22 },
    inputBar: {
      flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12,
      backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border,
    },
    queryInput: {
      flex: 1, height: 48, borderWidth: 1.5, borderColor: colors.border,
      borderRadius: 24, paddingHorizontal: 16, fontSize: 14,
      color: colors.foreground, backgroundColor: colors.background, fontFamily: "Inter_400Regular",
    },
    sendBtn: {
      width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary,
      alignItems: "center", justifyContent: "center",
    },
  });
