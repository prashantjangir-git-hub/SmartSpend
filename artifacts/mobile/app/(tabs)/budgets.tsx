import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import {
  useListBudgets,
  useCreateBudget,
  useDeleteBudget,
  useListCategories,
  getListBudgetsQueryKey,
  type BudgetWithProgress,
} from "@workspace/api-client-react";

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function BudgetBar({ budget, colors }: { budget: BudgetWithProgress; colors: ReturnType<typeof useColors> }) {
  const pct = Math.min(budget.percentage, 100);
  const isOver = budget.percentage >= 100;
  const isWarning = budget.percentage >= 80 && !isOver;
  const barColor = isOver ? colors.expense : isWarning ? colors.warning : colors.primary;

  const width = useSharedValue(0);
  React.useEffect(() => { width.value = withTiming(pct, { duration: 800 }); }, [pct]);
  const animStyle = useAnimatedStyle(() => ({ width: `${width.value}%` as `${number}%` }));

  return (
    <View style={budgetBarStyles.track}>
      <Animated.View style={[budgetBarStyles.fill, animStyle, { backgroundColor: barColor }]} />
    </View>
  );
}

const budgetBarStyles = StyleSheet.create({
  track: { height: 8, backgroundColor: "#E2E8F0", borderRadius: 4, overflow: "hidden", flex: 1 },
  fill: { height: 8, borderRadius: 4 },
});

export default function BudgetsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const month = getCurrentMonth();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const { data: budgets = [], isLoading } = useListBudgets({ month });
  const { data: categories = [] } = useListCategories();

  const createMutation = useCreateBudget({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListBudgetsQueryKey() });
        setModalVisible(false);
        setSelectedCategory("");
        setAmount("");
        setError("");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
    },
  });

  const deleteMutation = useDeleteBudget({
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListBudgetsQueryKey() }),
    },
  });

  const handleCreate = () => {
    if (!selectedCategory) { setError("Select a category"); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setError("Enter a valid amount"); return; }
    setError("");
    createMutation.mutate({ data: { category: selectedCategory, amount: amt, month } });
  };

  const existingCategories = new Set(budgets.map(b => b.category));
  const availableCategories = categories.filter(c => !existingCategories.has(c.name));

  const s = styles(colors, insets);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Budget Planner</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
          <Feather name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Text style={s.monthLabel}>{new Date().toLocaleString("default", { month: "long", year: "numeric" })}</Text>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : budgets.length === 0 ? (
          <View style={s.emptyState}>
            <Feather name="sliders" size={40} color={colors.mutedForeground} />
            <Text style={s.emptyText}>No budgets set</Text>
            <Text style={s.emptySubtext}>Tap + to set a monthly budget</Text>
          </View>
        ) : (
          budgets.map(budget => {
            const isOver = budget.percentage >= 100;
            const isWarning = budget.percentage >= 80 && !isOver;
            return (
              <View key={budget.id} style={s.budgetCard}>
                <View style={s.budgetHeader}>
                  <Text style={s.budgetCategory}>{budget.category}</Text>
                  <TouchableOpacity onPress={() => deleteMutation.mutate({ id: budget.id })}>
                    <Feather name="trash-2" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <View style={s.budgetAmounts}>
                  <Text style={s.budgetSpent}>
                    <Text style={{ color: isOver ? colors.expense : isWarning ? colors.warning : colors.primary }}>
                      {formatCurrency(budget.spent)}
                    </Text>
                    <Text style={{ color: colors.mutedForeground }}> / {formatCurrency(budget.amount)}</Text>
                  </Text>
                  <Text style={[s.budgetPct, {
                    color: isOver ? colors.expense : isWarning ? colors.warning : colors.primary
                  }]}>{budget.percentage}%</Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <BudgetBar budget={budget} colors={colors} />
                </View>

                {isOver && (
                  <Text style={s.alert}>Over budget by {formatCurrency(budget.spent - budget.amount)}</Text>
                )}
                {isWarning && (
                  <Text style={[s.alert, { color: colors.warning }]}>
                    Almost there — {formatCurrency(budget.amount - budget.spent)} remaining
                  </Text>
                )}
              </View>
            );
          })
        )}
        <View style={{ height: Platform.OS === "web" ? 34 : 80 }} />
      </ScrollView>

      {/* Add Budget Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Set Budget</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {error ? <Text style={s.errorText}>{error}</Text> : null}

            <Text style={s.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {availableCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[s.catChip, selectedCategory === cat.name && s.catChipActive]}
                    onPress={() => setSelectedCategory(cat.name)}
                  >
                    <Text style={[s.catChipText, selectedCategory === cat.name && { color: "#FFFFFF" }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.fieldLabel}>Monthly Budget (₹)</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. 3000"
              placeholderTextColor={colors.mutedForeground}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[s.saveBtn, createMutation.isPending && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={s.saveBtnText}>Save Budget</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>, insets: ReturnType<typeof useSafeAreaInsets>) =>
  StyleSheet.create({
    header: {
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
      paddingHorizontal: 20, paddingBottom: 4, backgroundColor: colors.background,
    },
    headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: colors.foreground },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    monthLabel: { paddingHorizontal: 20, paddingBottom: 12, fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_500Medium" },
    scroll: { paddingHorizontal: 20, paddingTop: 4 },
    budgetCard: {
      backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, gap: 10,
    },
    budgetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    budgetCategory: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground },
    budgetAmounts: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    budgetSpent: { fontSize: 14, fontFamily: "Inter_500Medium" },
    budgetPct: { fontSize: 13, fontFamily: "Inter_700Bold" },
    alert: { fontSize: 12, color: colors.expense, fontFamily: "Inter_500Medium" },
    emptyState: { alignItems: "center", paddingTop: 80, gap: 8 },
    emptyText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground },
    emptySubtext: { fontSize: 13, color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalCard: {
      backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: insets.bottom + 24,
    },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground },
    fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 8 },
    catChip: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
      borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background,
    },
    catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catChipText: { fontSize: 13, fontFamily: "Inter_500Medium", color: colors.foreground },
    input: {
      height: 52, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
      paddingHorizontal: 16, fontSize: 16, color: colors.foreground,
      backgroundColor: colors.background, fontFamily: "Inter_400Regular", marginBottom: 16,
    },
    saveBtn: { height: 52, backgroundColor: colors.primary, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    saveBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
    errorText: {
      color: colors.destructive, fontSize: 13, fontFamily: "Inter_500Medium",
      backgroundColor: colors.destructive + "18", padding: 10, borderRadius: 8, marginBottom: 12,
    },
  });
