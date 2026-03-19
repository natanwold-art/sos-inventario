import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../src/constants/theme';
import {
  getProductCount,
  getLowStockCount,
  getRecentMovements,
  Movement,
} from '../src/database/db';

export default function Dashboard() {
  const router = useRouter();
  const [productCount, setProductCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [recentMovements, setRecentMovements] = useState<Movement[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [products, lowStock, movements] = await Promise.all([
        getProductCount(),
        getLowStockCount(),
        getRecentMovements(5),
      ]);
      setProductCount(products);
      setLowStockCount(lowStock);
      setRecentMovements(movements);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
      }
    >
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push('/products')}
        >
          <Ionicons name="cube-outline" size={32} color={COLORS.primary} />
          <Text style={styles.statNumber}>{productCount}</Text>
          <Text style={styles.statLabel}>Produtos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, lowStockCount > 0 && styles.statCardWarning]}
          onPress={() => router.push('/alerts')}
        >
          <Ionicons
            name="alert-circle-outline"
            size={32}
            color={lowStockCount > 0 ? COLORS.danger : COLORS.warning}
          />
          <Text style={[styles.statNumber, lowStockCount > 0 && styles.statNumberDanger]}>
            {lowStockCount}
          </Text>
          <Text style={styles.statLabel}>Estoque Baixo</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Ações Rápidas</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionPrimary]}
          onPress={() => router.push('/scanner')}
        >
          <Ionicons name="barcode-outline" size={40} color="#FFFFFF" />
          <Text style={styles.actionTextWhite}>Escanear{"\n"}Produto</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionSecondary]}
          onPress={() => router.push('/product/add')}
        >
          <Ionicons name="add-circle-outline" size={40} color={COLORS.primary} />
          <Text style={styles.actionText}>Cadastrar{"\n"}Manual</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionSecondary]}
          onPress={() => router.push('/products')}
        >
          <Ionicons name="list-outline" size={40} color={COLORS.primary} />
          <Text style={styles.actionText}>Lista de{"\n"}Produtos</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Movements */}
      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Movimentações Recentes</Text>
        {recentMovements.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="swap-horizontal-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>Nenhuma movimentação ainda</Text>
            <Text style={styles.emptySubtext}>Escaneie um produto para começar</Text>
          </View>
        ) : (
          recentMovements.map((movement) => (
            <View key={movement.id} style={styles.movementItem}>
              <View style={styles.movementIcon}>
                <Ionicons
                  name={movement.type === 'entrada' ? 'arrow-down-circle' : 'arrow-up-circle'}
                  size={24}
                  color={movement.type === 'entrada' ? COLORS.success : COLORS.danger}
                />
              </View>
              <View style={styles.movementInfo}>
                <Text style={styles.movementProduct} numberOfLines={1}>
                  {movement.product_name}
                </Text>
                <Text style={styles.movementDate}>{formatDate(movement.created_at)}</Text>
              </View>
              <Text
                style={[
                  styles.movementQuantity,
                  movement.type === 'entrada' ? styles.quantityIn : styles.quantityOut,
                ]}
              >
                {movement.type === 'entrada' ? '+' : '-'}{movement.quantity}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardWarning: {
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  statNumber: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  statNumberDanger: {
    color: COLORS.danger,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  actionButton: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionPrimary: {
    backgroundColor: COLORS.primary,
  },
  actionSecondary: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionTextWhite: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  recentSection: {
    marginTop: SPACING.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  movementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  movementIcon: {
    marginRight: SPACING.md,
  },
  movementInfo: {
    flex: 1,
  },
  movementProduct: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  movementDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  movementQuantity: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
  },
  quantityIn: {
    color: COLORS.success,
  },
  quantityOut: {
    color: COLORS.danger,
  },
});
