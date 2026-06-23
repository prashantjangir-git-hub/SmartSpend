import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import {
  useCreateTransaction,
  useListCategories,
  getListTransactionsQueryKey,
  getGetAnalyticsSummaryQueryKey,
  getGetMonthlyAnalyticsQueryKey,
  getGetCategoryAnalyticsQueryKey,
} from "@workspace/api-client-react";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function NewTransactionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPeriod, setRecurringPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: categories = [] } = useListCategories();
  const createMutation = useCreateTransaction({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetMonthlyAnalyticsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetCategoryAnalyticsQueryKey() });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      },
    },
  });

  const handleAICategorize = async () => {
    if (!note.trim()) return;
    setAiLoading(true);
    try {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      const token = await AsyncStorage.getItem("auth_token");
      const res = await fetch(`https://${process.env["EXPO_PUBLIC_DOMAIN"]}/api/ai/categorize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ description: note, amount: parseFloat(amount) || undefined }),
      });
      const data = await res.json() as { category?: string; error?: string };
      if (data.category) {
        setCategory(data.category);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // silent
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setError("Enter a valid amount"); return; }
    if (!category) { setError("Select a category"); return; }
    if (!date) { setError("Enter a date"); return; }
    setError("");

    createMutation.mutate({
      data: {
        amount: amt,
        type,
        category,
        note: note || undefined,
        date,
        isRecurring,
        ...(isRecurring ? { recurringPeriod } : {}),
      },
    });
  };

  const s = styles(colors, insets);

  const expenseCategories = categories.filter(c =>
    !["Salary", "Pocket Money", "Freelance"].includes(c.name)
  );
  const incomeCategories = categories.filter(c =>
    ["Salary", "Pocket Money", "Freelance", "Other"].includes(c.name)
  );
  const displayCategories = type === "income" ? incomeCategories : expenseCategories;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      {/* Type Toggle */}
      <View style={s.typeToggle}>
        <TouchableOpacity
          style={[s.typeBtn, type === "expense" && { backgroundColor: colors.expense }]}
          onPress={() => setType("expense")}
        >
          <Feather name="arrow-up-right" size={14} color={type === "expense" ? "#FFF" : colors.mutedForeground} />
          <Text style={[s.typeBtnText, type === "expense" && { color: "#FFF" }]}>Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.typeBtn, type === "income" && { backgroundColor: colors.income }]}
          onPress={() => setType("income")}
        >
          <Feather name="arrow-down-left" size={14} color={type === "income" ? "#FFF" : colors.mutedForeground} />
          <Text style={[s.typeBtnText, type === "income" && { color: "#FFF" }]}>Income</Text>
        </TouchableOpacity>
      </View>

      {/* Amount */}
      <View style={s.amountRow}>
        <Text style={s.currencySymbol}>₹</Text>
        <TextInput
          style={s.amountInput}
          placeholder="0"
          placeholderTextColor={colors.border}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          autoFocus
        />
      </View>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      {/* Note + AI */}
      <Text style={s.fieldLabel}>Note / Description</Text>
      <View style={s.noteRow}>
        <TextInput
          style={[s.input, { flex: 1 }]}
          placeholder="What was this for?"
          placeholderTextColor={colors.mutedForeground}
          value={note}
          onChangeText={setNote}
        />
        {note.trim() && (
          <TouchableOpacity style={s.aiBtn} onPress={handleAICategorize} disabled={aiLoading}>
            {aiLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="zap" size={16} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {note.trim() && !aiLoading && !category && (
        <Text style={s.aiHint}>Tap the zap icon for AI auto-categorisation</Text>
      )}

      {/* Category */}
      <Text style={s.fieldLabel}>Category</Text>
      <View style={s.catGrid}>
        {displayCategories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[s.catChip, category === cat.name && { backgroundColor: cat.color, borderColor: cat.color }]}
            onPress={() => setCategory(cat.name)}
          >
            <Text style={[s.catChipText, category === cat.name && { color: "#FFF" }]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date */}
      <Text style={s.fieldLabel}>Date</Text>
      <TextInput
        style={s.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.mutedForeground}
        value={date}
        onChangeText={setDate}
      />

      {/* Recurring */}
      <View style={s.recurringRow}>
        <View>
          <Text style={s.fieldLabel}>Recurring</Text>
          <Text style={[s.aiHint, { marginTop: 0 }]}>Repeat this transaction</Text>
        </View>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ true: colors.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      {isRecurring && (
        <View style={s.periodRow}>
          {(["daily", "weekly", "monthly"] as const).map(p => (
            <TouchableOpacity
              key={p}
              style={[s.periodChip, recurringPeriod === p && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setRecurringPeriod(p)}
            >
              <Text style={[s.catChipText, recurringPeriod === p && { color: "#FFF" }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[s.saveBtn, createMutation.isPending && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={s.saveBtnText}>Save Transaction</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: Platform.OS === "web" ? 34 : 40 }} />
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    scroll: { padding: 20 },
    typeToggle: {
      flexDirection: "row", backgroundColor: colors.card, borderRadius: 12, padding: 4, marginBottom: 24,
    },
    typeBtn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 6, paddingVertical: 10, borderRadius: 10,
    },
    typeBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    amountRow: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      marginBottom: 24,
    },
    currencySymbol: { fontSize: 36, fontFamily: "Inter_700Bold", color: colors.mutedForeground },
    amountInput: { fontSize: 56, fontFamily: "Inter_700Bold", color: colors.foreground, minWidth: 80, textAlign: "center" },
    fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 8, marginTop: 4 },
    input: {
      height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
      paddingHorizontal: 14, fontSize: 15, color: colors.foreground,
      backgroundColor: colors.card, fontFamily: "Inter_400Regular", marginBottom: 16,
    },
    noteRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    aiBtn: {
      width: 50, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary + "50",
      alignItems: "center", justifyContent: "center", backgroundColor: colors.primary + "10",
    },
    aiHint: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 12, marginTop: -10 },
    catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    catChip: {
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
      borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
    },
    catChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    recurringRow: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 12,
    },
    periodRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    periodChip: {
      paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
      borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card,
    },
    saveBtn: {
      height: 54, backgroundColor: colors.primary, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8,
    },
    saveBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
    errorText: {
      color: colors.destructive, fontSize: 13, fontFamily: "Inter_500Medium",
      backgroundColor: colors.destructive + "18", padding: 10, borderRadius: 8, marginBottom: 12,
    },
  });
