import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import {
  useGetMonthlyAnalytics,
  useGetCategoryAnalytics,
  useGetAnalyticsSummary,
} from "@workspace/api-client-react";

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function MiniBarChart({ data, colors }: {
  data: Array<{ month: string; income: number; expense: number }>;
  colors: ReturnType<typeof useColors>;
}) {
  const max = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 100, marginTop: 12 }}>
      {data.map(d => {
        const incomeH = (d.income / max) * 90;
        const expenseH = (d.expense / max) * 90;
        const shortMonth = d.month.slice(5);
        return (
          <View key={d.month} style={{ flex: 1, alignItems: "center", gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2, height: 90 }}>
              <View style={{ width: 8, height: Math.max(incomeH, 2), backgroundColor: colors.income, borderRadius: 4 }} />
              <View style={{ width: 8, height: Math.max(expenseH, 2), backgroundColor: colors.expense, borderRadius: 4 }} />
            </View>
            <Text style={{ fontSize: 9, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>{shortMonth}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedMonths, setSelectedMonths] = useState(6);
  const month = getCurrentMonth();

  const { data: monthly = [], isLoading: monthlyLoading } = useGetMonthlyAnalytics({ months: selectedMonths });
  const { data: catStats = [], isLoading: catLoading } = useGetCategoryAnalytics({ month });
  const { data: summary } = useGetAnalyticsSummary({ month });

  const s = styles(colors, insets);

  const totalExpense = catStats.reduce((s, c) => s + c.amount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Reports</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary Strip */}
        <View style={s.stripRow}>
          <View style={[s.stripCard, { borderColor: colors.income }]}>
            <Text style={s.stripLabel}>Income</Text>
            <Text style={[s.stripValue, { color: colors.income }]}>{formatCurrency(summary?.totalIncome ?? 0)}</Text>
          </View>
          <View style={[s.stripCard, { borderColor: colors.expense }]}>
            <Text style={s.stripLabel}>Expense</Text>
            <Text style={[s.stripValue, { color: colors.expense }]}>{formatCurrency(summary?.totalExpense ?? 0)}</Text>
          </View>
          <View style={[s.stripCard, { borderColor: colors.savings }]}>
            <Text style={s.stripLabel}>Saved</Text>
            <Text style={[s.stripValue, { color: colors.savings }]}>{formatCurrency(summary?.savings ?? 0)}</Text>
          </View>
        </View>

        {/* Monthly Trend */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Monthly Trend</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {[3, 6, 12].map(m => (
                <TouchableOpacity
                  key={m}
                  style={[s.monthChip, selectedMonths === m && s.monthChipActive]}
                  onPress={() => setSelectedMonths(m)}
                >
                  <Text style={[s.monthChipText, selectedMonths === m && { color: "#FFFFFF" }]}>{m}M</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.income }} />
              <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>Income</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.expense }} />
              <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>Expense</Text>
            </View>
          </View>

          {monthlyLoading ? (
            <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />
          ) : (
            <MiniBarChart data={monthly} colors={colors} />
          )}
        </View>

        {/* Category Breakdown */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Category Breakdown</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginBottom: 12 }}>
            {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
          </Text>

          {catLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : catStats.length === 0 ? (
            <View style={s.emptyState}>
              <Feather name="pie-chart" size={32} color={colors.mutedForeground} />
              <Text style={s.emptyText}>No expense data</Text>
            </View>
          ) : (
            catStats.map(cat => (
              <View key={cat.category} style={s.catRow}>
                <View style={[s.catDot, { backgroundColor: cat.color }]} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={s.catName}>{cat.category}</Text>
                    <Text style={s.catAmount}>{formatCurrency(cat.amount)}</Text>
                  </View>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, {
                      width: `${cat.percentage}%` as `${number}%`,
                      backgroundColor: cat.color,
                    }]} />
                  </View>
                  <Text style={s.catPct}>{cat.percentage}% · {cat.count} transactions</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: Platform.OS === "web" ? 34 : 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    header: {
      paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
      paddingHorizontal: 20, paddingBottom: 12, backgroundColor: colors.background,
    },
    headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    scroll: { paddingHorizontal: 20, paddingTop: 4 },
    stripRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
    stripCard: {
      flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 12,
      borderBottomWidth: 3, gap: 4,
    },
    stripLabel: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    stripValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
    card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 16 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    monthChip: {
      paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background,
    },
    monthChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    monthChipText: { fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground },
    catRow: { flexDirection: "row", gap: 10, marginBottom: 16, alignItems: "flex-start" },
    catDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    catName: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    catAmount: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    barTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden", marginBottom: 4 },
    barFill: { height: 6, borderRadius: 3 },
    catPct: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyState: { alignItems: "center", padding: 32, gap: 8 },
    emptyText: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
  });
