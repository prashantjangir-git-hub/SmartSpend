import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGetAnalyticsSummary,
  useListTransactions,
} from "@workspace/api-client-react";

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const month = getCurrentMonth();

  const { data: summary, refetch: refetchSummary, isLoading: summaryLoading } =
    useGetAnalyticsSummary({ month });

  const { data: recentTxns, refetch: refetchTxns } = useListTransactions({
    month,
    limit: "5",
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary(), refetchTxns()]);
    setRefreshing(false);
  };

  const s = styles(colors, insets);

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{getGreeting()},</Text>
            <Text style={s.userName}>{firstName}</Text>
          </View>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => router.push("/transaction/new")}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        {summaryLoading ? (
          <View style={[s.summaryCard, { justifyContent: "center", height: 180 }]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <View style={s.summaryCard}>
            <Text style={s.monthLabel}>{new Date().toLocaleString("default", { month: "long", year: "numeric" })}</Text>
            <Text style={s.balanceLabel}>Net Savings</Text>
            <Text style={[s.balanceAmount, { color: (summary?.savings ?? 0) >= 0 ? colors.income : colors.expense }]}>
              {formatCurrency(summary?.savings ?? 0)}
            </Text>

            <View style={s.statsRow}>
              <View style={s.statItem}>
                <View style={[s.statDot, { backgroundColor: colors.income }]} />
                <Text style={s.statLabel}>Income</Text>
                <Text style={[s.statValue, { color: colors.income }]}>
                  {formatCurrency(summary?.totalIncome ?? 0)}
                </Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <View style={[s.statDot, { backgroundColor: colors.expense }]} />
                <Text style={s.statLabel}>Expense</Text>
                <Text style={[s.statValue, { color: colors.expense }]}>
                  {formatCurrency(summary?.totalExpense ?? 0)}
                </Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <View style={[s.statDot, { backgroundColor: colors.savings }]} />
                <Text style={s.statLabel}>Rate</Text>
                <Text style={[s.statValue, { color: colors.savings }]}>
                  {summary?.savingsRate ?? 0}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Top Categories */}
        {summary?.topCategories && summary.topCategories.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Top Spending</Text>
            {summary.topCategories.slice(0, 4).map((cat) => (
              <View key={cat.category} style={s.catRow}>
                <View style={[s.catDot, { backgroundColor: cat.color }]} />
                <Text style={s.catName} numberOfLines={1}>{cat.category}</Text>
                <View style={s.catBarTrack}>
                  <View
                    style={[s.catBar, { width: `${cat.percentage}%` as `${number}%`, backgroundColor: cat.color }]}
                  />
                </View>
                <Text style={s.catAmount}>{formatCurrency(cat.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent Transactions */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Recent</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/transactions")}>
              <Text style={s.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {!recentTxns || recentTxns.length === 0 ? (
            <View style={s.emptyState}>
              <Feather name="inbox" size={32} color={colors.mutedForeground} />
              <Text style={s.emptyText}>No transactions yet</Text>
              <Text style={s.emptySubtext}>Tap + to add your first transaction</Text>
            </View>
          ) : (
            recentTxns.map((txn) => (
              <TouchableOpacity
                key={txn.id}
                style={s.txnRow}
                onPress={() => router.push(`/transaction/${txn.id}`)}
                activeOpacity={0.7}
              >
                <View style={[s.txnIcon, { backgroundColor: txn.type === "income" ? colors.income + "20" : colors.expense + "20" }]}>
                  <Feather
                    name={txn.type === "income" ? "arrow-down-left" : "arrow-up-right"}
                    size={16}
                    color={txn.type === "income" ? colors.income : colors.expense}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.txnCategory} numberOfLines={1}>{txn.category}</Text>
                  {txn.note ? <Text style={s.txnNote} numberOfLines={1}>{txn.note}</Text> : null}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[s.txnAmount, { color: txn.type === "income" ? colors.income : colors.expense }]}>
                    {txn.type === "income" ? "+" : "-"}{formatCurrency(txn.amount)}
                  </Text>
                  <Text style={s.txnDate}>{txn.date}</Text>
                </View>
              </TouchableOpacity>
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
    scroll: {
      paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    greeting: { fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    userName: { fontSize: 24, fontFamily: "Inter_700Bold", color: colors.foreground },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    summaryCard: {
      backgroundColor: colors.foreground,
      borderRadius: 20,
      padding: 24,
      marginBottom: 20,
    },
    monthLabel: { fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "Inter_500Medium", marginBottom: 4 },
    balanceLabel: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular" },
    balanceAmount: { fontSize: 40, fontFamily: "Inter_700Bold", marginTop: 2, marginBottom: 20 },
    statsRow: { flexDirection: "row", alignItems: "center" },
    statItem: { flex: 1, alignItems: "center", gap: 4 },
    statDot: { width: 6, height: 6, borderRadius: 3 },
    statLabel: { fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular" },
    statValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    statDivider: { width: 1, height: 36, backgroundColor: "rgba(255,255,255,0.15)" },
    section: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
    },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginBottom: 12 },
    seeAll: { fontSize: 13, color: colors.primary, fontFamily: "Inter_500Medium" },
    catRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    catDot: { width: 8, height: 8, borderRadius: 4 },
    catName: { width: 100, fontSize: 13, color: colors.foreground, fontFamily: "Inter_500Medium" },
    catBarTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: "hidden" },
    catBar: { height: 6, borderRadius: 3 },
    catAmount: { fontSize: 13, color: colors.foreground, fontFamily: "Inter_600SemiBold", width: 72, textAlign: "right" },
    txnRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    txnIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    txnCategory: { fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground },
    txnNote: { fontSize: 12, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    txnAmount: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    txnDate: { fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    emptyState: { alignItems: "center", paddingVertical: 32, gap: 8 },
    emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    emptySubtext: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
  });
