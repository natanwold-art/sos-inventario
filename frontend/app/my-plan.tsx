import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../src/constants/theme';
import {
  getLicenseStatus,
  getDaysUntilExpiration,
  activateLicenseKey,
} from '../src/services/license';

type LicenseStatus = {
  premiumActive?: boolean;
  premiumExpiresAt?: string | null;
  licenseKey?: string | null;
};

const SUPPORT_WHATSAPP = '5571988720448';
const SUPPORT_PIX = '71988720448';

export default function MyPlan() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activating, setActivating] = useState(false);

  const [licenseActive, setLicenseActive] = useState(false);
  const [licenseExpiresAt, setLicenseExpiresAt] = useState<string | null>(null);
  const [licenseDaysRemaining, setLicenseDaysRemaining] = useState<number | null>(null);
  const [savedLicenseKey, setSavedLicenseKey] = useState<string | null>(null);

  const [licenseCode, setLicenseCode] = useState('');

  const loadPlanData = async () => {
    try {
      const [status, days] = await Promise.all([
        getLicenseStatus() as Promise<LicenseStatus>,
        getDaysUntilExpiration(),
      ]);

      setLicenseActive(!!status?.premiumActive);
      setLicenseExpiresAt(status?.premiumExpiresAt ?? null);
      setLicenseDaysRemaining(days ?? null);
      setSavedLicenseKey(status?.licenseKey ?? null);
    } catch (error) {
      console.error('Erro ao carregar plano:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do plano.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadPlanData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlanData();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return '—';

    return date.toLocaleDateString('pt-BR');
  };

  const getPlanLabel = () => {
    return licenseActive ? 'Plano Premium Ativo' : 'Plano Inativo';
  };

  const getPlanColor = () => {
    return licenseActive ? COLORS.success : COLORS.danger;
  };

  const getDaysLabel = () => {
    if (licenseDaysRemaining === null) return 'Sem informação';
    if (licenseDaysRemaining < 0) return 'Expirado';
    if (licenseDaysRemaining === 0) return 'Expira hoje';
    if (licenseDaysRemaining === 1) return '1 dia restante';
    return `${licenseDaysRemaining} dias restantes`;
  };

  const handleActivateLicense = async () => {
    const code = licenseCode.trim();

    if (!code) {
      Alert.alert('Atenção', 'Digite um código de licença para ativar.');
      return;
    }

    try {
      setActivating(true);

      const result = await activateLicenseKey(code);

      if (result?.success) {
        Alert.alert('Sucesso', 'Licença ativada com sucesso.');
        setLicenseCode('');
        await loadPlanData();
        return;
      }

      Alert.alert('Licença inválida', result?.message || 'Não foi possível ativar a licença.');
    } catch (error: any) {
      console.error('Erro ao ativar licença:', error);
      Alert.alert(
        'Erro',
        error?.message || 'Ocorreu um erro ao tentar ativar o código de licença.'
      );
    } finally {
      setActivating(false);
    }
  };

  const handlePlanAction = () => {
    router.push('/subscription' as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando informações do plano...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
      }
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Meu Plano</Text>
          <Text style={styles.subtitle}>Gerencie sua licença, pagamento e renovação</Text>
        </View>
      </View>

      <View style={styles.planCard}>
        <View style={styles.planTopRow}>
          <View style={[styles.statusDot, { backgroundColor: getPlanColor() }]} />
          <Text style={styles.planStatus}>{getPlanLabel()}</Text>
        </View>

        <Text style={styles.planName}>SOS Inventário Premium</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Vencimento</Text>
          <Text style={styles.infoValue}>{formatDate(licenseExpiresAt)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Status</Text>
          <Text style={[styles.infoValue, { color: getPlanColor() }]}>{getDaysLabel()}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Código atual</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {savedLicenseKey || 'Nenhum código vinculado'}
          </Text>
        </View>

        <TouchableOpacity style={styles.planButton} onPress={handlePlanAction} activeOpacity={0.85}>
          <Ionicons
            name={licenseActive ? 'refresh-outline' : 'card-outline'}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.planButtonText}>
            {licenseActive ? 'Renovar plano' : 'Escolher plano'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.activationCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="key-outline" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Ativar código de licença</Text>
        </View>

        <Text style={styles.sectionDescription}>
          Se você já comprou um plano, digite abaixo o código da licença para liberar o acesso.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Digite seu código de licença"
          placeholderTextColor={COLORS.textLight}
          value={licenseCode}
          onChangeText={setLicenseCode}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.activateButton, activating && styles.buttonDisabled]}
          onPress={handleActivateLicense}
          disabled={activating}
          activeOpacity={0.85}
        >
          {activating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.activateButtonText}>Ativar código</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.paymentCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Pagamento e suporte</Text>
        </View>

        <Text style={styles.sectionDescription}>
          Para contratar ou renovar manualmente, use os canais abaixo.
        </Text>

        <View style={styles.contactBox}>
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <View style={styles.contactTextWrap}>
            <Text style={styles.contactLabel}>WhatsApp</Text>
            <Text style={styles.contactValue}>+{SUPPORT_WHATSAPP}</Text>
          </View>
        </View>

        <View style={styles.contactBox}>
          <Ionicons name="qr-code-outline" size={20} color={COLORS.primary} />
          <View style={styles.contactTextWrap}>
            <Text style={styles.contactLabel}>PIX</Text>
            <Text style={styles.contactValue}>{SUPPORT_PIX}</Text>
          </View>
        </View>

        <Text style={styles.paymentNote}>
          Após o pagamento, você pode receber o código de ativação e inserir logo acima no campo de licença.
        </Text>
      </View>

      <View style={styles.benefitsCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="star-outline" size={20} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Benefícios do plano</Text>
        </View>

        <View style={styles.benefitItem}>
          <Ionicons name="checkmark" size={18} color={COLORS.success} />
          <Text style={styles.benefitText}>Acesso completo aos recursos premium</Text>
        </View>

        <View style={styles.benefitItem}>
          <Ionicons name="checkmark" size={18} color={COLORS.success} />
          <Text style={styles.benefitText}>Gestão mais rápida e profissional do estoque</Text>
        </View>

        <View style={styles.benefitItem}>
          <Ionicons name="checkmark" size={18} color={COLORS.success} />
          <Text style={styles.benefitText}>Mais controle para operação e reposição</Text>
        </View>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  planTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  planStatus: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  planName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  infoValue: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'right',
  },
  planButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  planButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  activationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: 8,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '800',
    color: COLORS.text,
  },
  sectionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  activateButton: {
    backgroundColor: COLORS.success,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  activateButtonText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactTextWrap: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  contactLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  paymentNote: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: SPACING.sm,
  },
  benefitsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: SPACING.sm,
  },
  benefitText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});