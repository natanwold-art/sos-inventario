import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../src/constants/theme';
import { getLowStockProducts, Product } from '../src/database/db';

export default function Alerts() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = async () => {
    try {
      const data = await getLowStockProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error loading low stock products:', error);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const getUrgencyLevel = (product: Product) => {
    if (product.quantity === 0) return { level: 'critical', color: COLORS.danger, text: 'Sem estoque' };
    if (product.quantity <= product.min_quantity * 0.5) return { level: 'high', color: COLORS.danger, text: 'Crítico' };
    return { level: 'medium', color: COLORS.warning, text: 'Baixo' };
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const urgency = getUrgencyLevel(item);
    
    return (
      <TouchableOpacity
        style={[styles.productCard, { borderLeftColor: urgency.color }]}
        onPress={() => router.push(`/product/${item.id}`)}
      >
        <View style={styles.productHeader}>
          <View style={[styles.urgencyBadge, { backgroundColor: urgency.color + '20' }]}>
            <Ionicons
              name={item.quantity === 0 ? 'close-circle' : 'alert-circle'}
              size={16}
              color={urgency.color}
            />
            <Text style={[styles.urgencyText, { color: urgency.color }]}>
              {urgency.text}
            </Text>
          </View>
        </View>
        
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        
        <View style={styles.stockContainer}>
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>Atual</Text>
            <Text style={[styles.stockValue, { color: urgency.color }]}>
              {item.quantity}
            </Text>
          </View>
          <View style={styles.stockDivider} />
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>Mínimo</Text>
            <Text style={styles.stockValue}>{item.min_quantity}</Text>
          </View>
          <View style={styles.stockDivider} />
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>Repor</Text>
            <Text style={[styles.stockValue, styles.stockValuePrimary]}>
              {Math.max(0, item.min_quantity - item.quantity + Math.ceil(item.min_quantity * 0.5))}
            </Text>
          </View>
        </View>

        <View style={styles.productFooter}>
          <Text style={styles.categoryText}>{item.category}</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {products.length > 0 && (
        <View style={styles.summaryCard}>
          <Ionicons name="warning" size={24} color={COLORS.warning} />
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>
              {products.length} {products.length === 1 ? 'produto precisa' : 'produtos precisam'} de reposição
            </Text>
            <Text style={styles.summarySubtitle}>
              Toque em um item para ver detalhes e registrar entrada
            </Text>
          </View>
        </View>
      )}

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={80} color={COLORS.success} />
            <Text style={styles.emptyTitle}>Tudo em ordem!</Text>
            <Text style={styles.emptyText}>
              Não há produtos com estoque baixo no momento
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '15',
    padding: SPACING.md,
    margin: SPACING.md,
    marginBottom: 0,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.md,
  },
  summaryText: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  summarySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  productCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: SPACING.sm,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
  },
  urgencyText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  productName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  stockContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  stockItem: {
    flex: 1,
    alignItems: 'center',
  },
  stockDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  stockLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  stockValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  stockValuePrimary: {
    color: COLORS.primary,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  categoryText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.success,
    marginTop: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
