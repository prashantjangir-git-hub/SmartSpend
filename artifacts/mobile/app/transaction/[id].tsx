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
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import {
  useGetTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useListCategories,
  getListTransactionsQueryKey,
  getGetAnalyticsSummaryQueryKey,
} from "@workspace/api-client-react";

export default function EditTransactionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();
  const txnId = Number(id);

  const { data: txn, isLoading } = useGetTransaction(txnId);
  const { data: categories = [] } = useListCategories();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPeriod, setRecurringPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [error, setError] = useState("");

  useEffect(() => {
    if (txn) {
      setType(txn.type as "expense" | "income");
      setAmount(String(txn.amount));
      setCategory(txn.category);
      setNote(txn.note ?? "");
      setDate(txn.date);
      setIsRecurring(txn.isRecurring);
      setRecurringPeriod((txn.recurringPeriod as "daily" | "weekly" | "monthly") ?? "monthly");
    }
  }, [txn]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
  };

  const updateMutation = useUpdateTransaction({
    mutation: {
      onSuccess: () => {
        invalidate();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      },
    },
  });

  const deleteMutation = useDeleteTransaction({
    mutation: {
      onSuccess: () => {
        invalidate();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.back();
      },
    },
  });

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setError("Enter a valid amount"); return; }
    if (!category) { setError("Select a category"); return; }
    setError("");

    updateMutation.mutate({
      id: txnId,
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

  const handleDelete = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Delete this transaction?")) {
        deleteMutation.mutate({ id: txnId });
      }
      return;
    }
    Alert.alert("Delete", "Remove this transaction permanently?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate({ id: txnId }) },
    ]);
  };

  const s = styles(colors, insets);

  if (isLoading) return <View style={[s.scroll, { justifyContent: "center", alignItems: "center" }]}><ActivityIndicator color={colors.primary} /></View>;

  const expenseCategories = categories.filter(c => !["Salary", "Pocket Money", "Freelance"].includes(c.name));
  const incomeCategories = categories.filter(c => ["Salary", "Pocket Money", "Freelance", "Other"].includes(c.name));
  const displayCategories = type === "income" ? incomeCategories : expenseCategories;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <View style={s.typeToggle}>
        <TouchableOpacity style={[s.typeBtn, type === "expense" && { backgroundColor: colors.expense }]} onPress={() => setType("expense")}>
          <Text style={[s.typeBtnText, type === "expense" && { color: "#FFF" }]}>Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.typeBtn, type === "income" && { backgroundColor: colors.income }]} onPress={() => setType("income")}>
          <Text style={[s.typeBtnText, type === "income" && { color: "#FFF" }]}>Income</Text>
        </TouchableOpacity>
      </View>

      <View style={s.amountRow}>
        <Text style={s.currencySymbol}>₹</Text>
        <TextInput style={s.amountInput} value={amount} onChangeText={setAmount} keyboardType="numeric" />
      </View>

      {error ? <Text style={s.errorText}>{error}</Text> : null}

      <Text style={s.fieldLabel}>Note</Text>
      <TextInput style={s.input} placeholder="What was this for?" placeholderTextColor={colors.mutedForeground} value={note} onChangeText={setNote} />

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

      <Text style={s.fieldLabel}>Date</Text>
      <TextInput style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground} value={date} onChangeText={setDate} />

      <View style={s.recurringRow}>
        <Text style={s.fieldLabel}>Recurring</Text>
        <Switch value={isRecurring} onValueChange={setIsRecurring} trackColor={{ true: colors.primary }} thumbColor="#FFFFFF" />
      </View>

      {isRecurring && (
        <View style={s.periodRow}>
          {(["daily", "weekly", "monthly"] as const).map(p => (
            <TouchableOpacity
              key={p}
              style={[s.catChip, recurringPeriod === p && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setRecurringPeriod(p)}
            >
              <Text style={[s.catChipText, recurringPeriod === p && { color: "#FFF" }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity style={[s.saveBtn, updateMutation.isPending && { opacity: 0.6 }]} onPress={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.saveBtnText}>Update Transaction</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} disabled={deleteMutation.isPending}>
        <Text style={s.deleteBtnText}>Delete Transaction</Text>
      </TouchableOpacity>

      <View style={{ height: Platform.OS === "web" ? 34 : 40 }} />
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    scroll: { padding: 20, flexGrow: 1 },
    typeToggle: { flexDirection: "row", backgroundColor: colors.card, borderRadius: 12, padding: 4, marginBottom: 24 },
    typeBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10 },
    typeBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    amountRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 24 },
    currencySymbol: { fontSize: 36, fontFamily: "Inter_700Bold", color: colors.mutedForeground },
    amountInput: { fontSize: 56, fontFamily: "Inter_700Bold", color: colors.foreground, minWidth: 80, textAlign: "center" },
    fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 8, marginTop: 4 },
    input: {
      height: 50, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
      paddingHorizontal: 14, fontSize: 15, color: colors.foreground,
      backgroundColor: colors.card, fontFamily: "Inter_400Regular", marginBottom: 16,
    },
    catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
    catChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    recurringRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 12 },
    periodRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    saveBtn: { height: 54, backgroundColor: colors.primary, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8, marginBottom: 12 },
    saveBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
    deleteBtn: { height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.destructive },
    deleteBtnText: { color: colors.destructive, fontSize: 15, fontFamily: "Inter_600SemiBold" },
    errorText: { color: colors.destructive, fontSize: 13, fontFamily: "Inter_500Medium", backgroundColor: colors.destructive + "18", padding: 10, borderRadius: 8, marginBottom: 12 },
  });
