import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import {
  useListTransactions,
  useDeleteTransaction,
  getListTransactionsQueryKey,
  getGetAnalyticsSummaryQueryKey,
  type Transaction,
} from "@workspace/api-client-react";

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

const MONTHS = ["All", "This Month", "Last Month", "3 Months"];

function getCurrentMonth(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function TransactionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const [selectedFilter, setSelectedFilter] = useState(1);
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");

  const monthParam = selectedFilter === 0 ? undefined : selectedFilter === 1
    ? getCurrentMonth()
    : selectedFilter === 2
      ? getCurrentMonth(1)
      : getCurrentMonth(2);

  const { data: txns = [], refetch, isLoading } = useListTransactions({
    ...(monthParam ? { month: monthParam } : {}),
    ...(typeFilter !== "all" ? { type: typeFilter } : {}),
    limit: "100",
  });

  const deleteMutation = useDeleteTransaction({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetAnalyticsSummaryQueryKey() });
      },
    },
  });

  const handleDelete = (txn: Transaction) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete this transaction?`)) {
        deleteMutation.mutate({ id: txn.id });
      }
      return;
    }
    Alert.alert("Delete", "Remove this transaction?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteMutation.mutate({ id: txn.id });
        },
      },
    ]);
  };

  const s = styles(colors, insets);

  const grouped: { title: string; data: Transaction[] }[] = [];
  const dateMap = new Map<string, Transaction[]>();
  for (const t of txns) {
    const list = dateMap.get(t.date) ?? [];
    list.push(t);
    dateMap.set(t.date, list);
  }
  for (const [date, items] of Array.from(dateMap.entries()).sort((a, b) => b[0].localeCompare(a[0]))) {
    grouped.push({ title: date, data: items });
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Transactions</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push("/transaction/new")} activeOpacity={0.8}>
          <Feather name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Month filter */}
      <View style={s.filterRow}>
        {MONTHS.map((m, i) => (
          <TouchableOpacity
            key={m}
            style={[s.filterChip, selectedFilter === i && s.filterChipActive]}
            onPress={() => setSelectedFilter(i)}
          >
            <Text style={[s.filterChipText, selectedFilter === i && s.filterChipTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Type filter */}
      <View style={s.typeRow}>
        {(["all", "income", "expense"] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.typeChip, typeFilter === t && s.typeChipActive, typeFilter === t && {
              backgroundColor: t === "income" ? colors.income : t === "expense" ? colors.expense : colors.primary,
            }]}
            onPress={() => setTypeFilter(t)}
          >
            <Text style={[s.typeChipText, typeFilter === t && { color: "#FFFFFF" }]}>
              {t === "all" ? "All" : t === "income" ? "Income" : "Expense"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={grouped}
        keyExtractor={item => item.title}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : 80, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Feather name="inbox" size={40} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No transactions found</Text>
          </View>
        }
        renderItem={({ item: group }) => (
          <View>
            <Text style={s.dateHeader}>{group.title}</Text>
            {group.data.map(txn => (
              <TouchableOpacity
                key={txn.id}
                style={s.txnCard}
                onPress={() => router.push(`/transaction/${txn.id}`)}
                onLongPress={() => handleDelete(txn)}
                activeOpacity={0.7}
              >
                <View style={[s.txnIcon, {
                  backgroundColor: txn.type === "income" ? colors.income + "20" : colors.expense + "20",
                }]}>
                  <Feather
                    name={txn.type === "income" ? "arrow-down-left" : "arrow-up-right"}
                    size={16}
                    color={txn.type === "income" ? colors.income : colors.expense}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.txnCategory}>{txn.category}</Text>
                  {txn.note ? <Text style={s.txnNote} numberOfLines={1}>{txn.note}</Text> : null}
                  {txn.isRecurring && (
                    <Text style={s.recurringBadge}>↻ {txn.recurringPeriod}</Text>
                  )}
                </View>
                <Text style={[s.txnAmount, { color: txn.type === "income" ? colors.income : colors.expense }]}>
                  {txn.type === "income" ? "+" : "-"}{formatCurrency(txn.amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
      paddingHorizontal: 20,
      paddingBottom: 12,
      backgroundColor: colors.background,
    },
    headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 10 },
    filterChip: {
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.card,
    },
    filterChipActive: { backgroundColor: colors.foreground, borderColor: colors.foreground },
    filterChipText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    filterChipTextActive: { color: colors.background },
    typeRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
    typeChip: {
      paddingHorizontal: 14, paddingVertical: 6,
      borderRadius: 20, borderWidth: 1, borderColor: colors.border,
      backgroundColor: colors.card,
    },
    typeChipActive: { borderColor: "transparent" },
    typeChipText: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    dateHeader: { paddingHorizontal: 20, paddingVertical: 6, fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    txnCard: {
      flexDirection: "row", alignItems: "center", gap: 12,
      marginHorizontal: 20, marginBottom: 2,
      backgroundColor: colors.card, borderRadius: 12, padding: 14,
    },
    txnIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    txnCategory: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    txnNote: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    recurringBadge: { fontSize: 11, color: colors.primary, fontFamily: "Inter_500Medium", marginTop: 2 },
    txnAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
    emptyText: { fontSize: 16, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
  });
