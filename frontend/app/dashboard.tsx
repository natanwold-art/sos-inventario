import React, { useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { logoutUser } from '../src/services/auth';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../src/constants/theme';
import {
  getProductCount,
  getLowStockCount,
  getRecentMovements,
  getTotalInventoryValue,
  getLowStockInventoryValue,
  Movement,
} from '../src/database/db';
import {
  getLicenseStatus,
  getDaysUntilExpiration,
} from '../src/services/license';

export default function Dashboard() {
  const router = useRouter();
  const [productCount, setProductCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [recentMovements, setRecentMovements] = useState<Movement[]>([]);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [lowStockInventoryValue, setLowStockInventoryValue] = useState(0);
  const [licenseActive, setLicenseActive] = useState(false);
  const [licenseExpiresAt, setLicenseExpiresAt] = useState<string | null>(null);
  const [licenseDaysRemaining, setLicenseDaysRemaining] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [products, lowStock, movements, totalValue, riskValue] = await Promise.all([
        getProductCount(),
        getLowStockCount(),
        getRecentMovements(5),
        getTotalInventoryValue(),
        getLowStockInventoryValue(),
      ]);

      const licenseStatus = await getLicenseStatus();
      const licenseDays = await getDaysUntilExpiration();

      setProductCount(products);
      setLowStockCount(lowStock);
      setRecentMovements(movements);
      setTotalInventoryValue(totalValue);
      setLowStockInventoryValue(riskValue);
      setLicenseActive(!!licenseStatus.premiumActive);
      setLicenseExpiresAt(licenseStatus.premiumExpiresAt ?? null);
      setLicenseDaysRemaining(licenseDays);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sair',
      'Deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logoutUser();
            router.replace('/login' as any);
          },
        },
      ]
    );
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

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatLicenseDate = (dateString: string | null) => {
    if (!dateString) return '—';

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('pt-BR');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>SOS Inventário</Text>
          <Text style={styles.appSubtitle}>Controle seu estoque em segundos</Text>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.planBanner}>
        <View style={styles.planBannerLeft}>
          <Ionicons
            name={licenseActive ? 'shield-checkmark' : 'alert-circle'}
            size={22}
            color={licenseActive ? COLORS.success : COLORS.danger}
          />
          <View style={styles.planBannerTextWrap}>
            <Text style={styles.planBannerTitle}>
              {licenseActive ? 'Plano ativo' : 'Plano inativo'}
            </Text>
            <Text style={styles.planBannerSubtitle}>
              Vencimento: {formatLicenseDate(licenseExpiresAt)}
              {licenseDaysRemaining !== null ? ` • ${licenseDaysRemaining} dias restantes` : ''}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.planBannerButton}
          onPress={() => router.push('/my-plan' as any)}
        >
          <Text style={styles.planBannerButtonText}>Meu Plano</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.heroButton}
        onPress={() => router.push('/scanner' as any)}
        activeOpacity={0.85}
      >
        <View style={styles.heroIconWrap}>
          <Ionicons name="barcode-outline" size={30} color="#FFFFFF" />
        </View>
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroTitle}>ESCANEAR PRODUTO</Text>
          <Text style={styles.heroSubtitle}>
            Registre entradas e saídas com rapidez
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={styles.insightCard}>
        <Text style={styles.insightTitle}>📊 Resumo do seu estoque</Text>

        <View style={styles.insightRow}>
          <Text style={styles.insightLabel}>Total de produtos:</Text>
          <Text style={styles.insightValue}>{productCount}</Text>
        </View>

        <View style={styles.insightRow}>
          <Text style={styles.insightLabel}>Itens em estoque baixo:</Text>
          <Text style={[styles.insightValue, lowStockCount > 0 && styles.insightDanger]}>
            {lowStockCount}
          </Text>
        </View>

        <View style={styles.insightDivider} />

        <Text style={styles.insightTip}>
          {lowStockCount > 0
            ? 'Seu estoque precisa de atenção. Verifique agora os produtos para reposição e evite perder vendas.'
            : 'Seu estoque está sob controle. Continue registrando entradas e saídas para manter tudo atualizado.'}
        </Text>

        {lowStockCount > 0 && (
          <TouchableOpacity
            style={styles.restockButton}
            onPress={() => router.push('/alerts' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.restockText}>🛒 Ver produtos para reposição</Text>
          </TouchableOpacity>
        )}
      </View>

      {lowStockCount > 0 && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() => router.push('/alerts' as any)}
          activeOpacity={0.85}
        >
          <Ionicons name="warning" size={22} color="#FFFFFF" />
          <View style={styles.warningTextWrap}>
            <Text style={styles.warningTitle}>⚠️ Produto acabando</Text>
            <Text style={styles.warningSubtitle}>
              Você tem {lowStockCount} {lowStockCount === 1 ? 'item com' : 'itens com'} estoque baixo
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <View style={styles.attentionCard}>
        <View style={styles.attentionHeader}>
          <Ionicons name="flash-outline" size={20} color={COLORS.primary} />
          <Text style={styles.attentionTitle}>Atenção hoje</Text>
        </View>

        <Text style={styles.attentionText}>
          {lowStockCount > 0
            ? `Você já tem ${lowStockCount} ${lowStockCount === 1 ? 'item precisando' : 'itens precisando'} de reposição. Conferir isso agora pode evitar perda de venda no balcão.`
            : 'Nenhum alerta crítico no momento. Esse é o melhor cenário para manter a operação organizada.'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Visão Financeira</Text>
      <View style={styles.financeContainer}>
        <View style={styles.financeCard}>
          <View style={styles.financeIconWrap}>
            <Ionicons name="wallet-outline" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.financeLabel}>Valor total em estoque</Text>
          <Text style={styles.financeValue}>{formatCurrency(totalInventoryValue)}</Text>
        </View>

        <View style={[styles.financeCard, lowStockInventoryValue > 0 && styles.financeCardWarning]}>
          <View style={styles.financeIconWrap}>
            <Ionicons
              name="trending-down-outline"
              size={24}
              color={lowStockInventoryValue > 0 ? COLORS.danger : COLORS.warning}
            />
          </View>
          <Text style={styles.financeLabel}>Valor em risco</Text>
          <Text
            style={[
              styles.financeValue,
              lowStockInventoryValue > 0 && styles.financeValueDanger,
            ]}
          >
            {formatCurrency(lowStockInventoryValue)}
          </Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => router.push('/products' as any)}
        >
          <Ionicons name="cube-outline" size={32} color={COLORS.primary} />
          <Text style={styles.statNumber}>{productCount}</Text>
          <Text style={styles.statLabel}>Produtos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, lowStockCount > 0 && styles.statCardWarning]}
          onPress={() => router.push('/alerts' as any)}
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

      <Text style={styles.sectionTitle}>Ações Rápidas</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButtonLarge, styles.actionPrimary]}
          onPress={() => router.push('/scanner' as any)}
        >
          <Ionicons name="barcode-outline" size={38} color="#FFFFFF" />
          <Text style={styles.actionTextWhiteLarge}>Escanear Produto</Text>
          <Text style={styles.actionSubtextWhite}>Entrada e saída rápida</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButtonLarge, styles.actionSecondary]}
          onPress={() => router.push('/product/add' as any)}
        >
          <Ionicons name="add-circle-outline" size={38} color={COLORS.primary} />
          <Text style={styles.actionTextLarge}>Cadastrar Manual</Text>
          <Text style={styles.actionSubtext}>Novo item no estoque</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButtonLarge, styles.actionSecondary]}
          onPress={() => router.push('/products' as any)}
        >
          <Ionicons name="list-outline" size={38} color={COLORS.primary} />
          <Text style={styles.actionTextLarge}>Lista de Produtos</Text>
          <Text style={styles.actionSubtext}>Consultar estoque</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButtonLarge, styles.actionSecondary]}
          onPress={() => router.push('/my-plan' as any)}
        >
          <Ionicons name="card-outline" size={38} color={COLORS.primary} />
          <Text style={styles.actionTextLarge}>Meu Plano</Text>
          <Text style={styles.actionSubtext}>Licença e renovação</Text>
        </TouchableOpacity>
      </View>

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
                {movement.type === 'entrada' ? '+' : '-'}
                {movement.quantity}
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
    paddingBottom: SPACING.xl,
  },
  header: {
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planBanner: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  planBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  planBannerTextWrap: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  planBannerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  planBannerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  planBannerButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    marginLeft: SPACING.sm,
  },
  planBannerButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  heroButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  heroIconWrap: {
    marginRight: SPACING.md,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroSubtitle: {
    color: '#EAFBF1',
    fontSize: FONT_SIZES.sm,
  },
  insightCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  insightTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  insightLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  insightValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  insightDanger: {
    color: COLORS.danger,
  },
  insightDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  insightTip: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  restockButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.md,
  },
  restockText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
  },
  warningBanner: {
    backgroundColor: COLORS.danger,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  warningTextWrap: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  warningTitle: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
  },
  warningSubtitle: {
    color: '#FFEAEA',
    fontSize: FONT_SIZES.sm,
    marginTop: 2,
  },
  attentionCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  attentionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  attentionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  attentionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  financeContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  financeCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  financeCardWarning: {
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  financeIconWrap: {
    marginBottom: SPACING.sm,
  },
  financeLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  financeValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.text,
  },
  financeValueDanger: {
    color: COLORS.danger,
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
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },

  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  actionButtonLarge: {
    width: '47%',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 145,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
    fontWeight: '700',
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
  actionTextWhiteLarge: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  actionSubtextWhite: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  actionTextLarge: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  actionSubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
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
    fontWeight: '600',
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