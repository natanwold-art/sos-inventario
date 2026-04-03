import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../src/constants/theme';
import {
  activateLicenseOnline,
  getTrialInfo,
} from '../src/services/license';

export default function SubscriptionScreen() {
  const router = useRouter();

  const [activationCode, setActivationCode] = useState('');
  const [trialRemainingDays, setTrialRemainingDays] = useState(0);
  const [loading, setLoading] = useState(false);

  const PIX_KEY = '71988720448';
  const WHATSAPP_NUMBER = '5571988720448';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const trial = await getTrialInfo();
      setTrialRemainingDays(trial.remainingDays);
    } catch (error) {
      console.error('Erro ao carregar status da licença:', error);
    }
  };

  const handleActivate = async () => {
    if (!activationCode.trim()) {
      Alert.alert('Atenção', 'Digite o código de liberação.');
      return;
    }

    try {
      setLoading(true);

      const result = await activateLicenseOnline(activationCode);

      if (!result.success) {
        Alert.alert('Erro', result.message);
        return;
      }

      Alert.alert('Sucesso', result.message);
      router.replace('/dashboard' as any);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível ativar a licença.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = async () => {
    try {
      await Clipboard.setStringAsync(PIX_KEY);
      Alert.alert('Copiado', 'Chave Pix copiada com sucesso.');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível copiar a chave Pix.');
    }
  };

  const handleOpenWhatsApp = async () => {
    try {
      const message = encodeURIComponent(
        'Olá! Fiz o pagamento do SOS Inventário e quero meu código de liberação.'
      );

      const appUrl = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${message}`;
      const webUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

      const canOpenApp = await Linking.canOpenURL(appUrl);

      if (canOpenApp) {
        await Linking.openURL(appUrl);
        return;
      }

      const canOpenWeb = await Linking.canOpenURL(webUrl);

      if (canOpenWeb) {
        await Linking.openURL(webUrl);
        return;
      }

      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Planos disponíveis</Text>
          <Text style={styles.headerSubtitle}>Escolha seu plano e ative sua licença</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <Ionicons name="shield-checkmark-outline" size={42} color={COLORS.primary} />
        <Text style={styles.title}>Ative o SOS Inventário</Text>
        <Text style={styles.heroBadge}>Ideal para adegas, mercadinhos e pequenos comércios</Text>
        <Text style={styles.subtitle}>
          Continue usando o app com acesso ao estoque, dashboard, alertas e recursos premium.
        </Text>
      </View>

      <View style={styles.offlineInfoCard}>
        <Ionicons name="cloud-offline-outline" size={20} color={COLORS.primary} />
        <Text style={styles.offlineInfoText}>
          O controle do estoque funciona offline. Internet é usada apenas para validar a licença.
        </Text>
      </View>

      <View style={styles.alertBox}>
        <Text style={styles.alertTitle}>Teste grátis</Text>
        <Text style={styles.alertText}>
          Dias restantes: <Text style={styles.bold}>{trialRemainingDays}</Text>
        </Text>
      </View>

      <Text style={styles.sectionTitle}>O que continua liberado no plano</Text>

      <View style={styles.featureCard}>
        <View style={styles.featureRow}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.featureText}>Scanner inteligente offline</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.featureText}>Controle de entradas e saídas</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.featureText}>Valor total em estoque</Text>
        </View>
        <View style={styles.featureRow}>
          <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          <Text style={styles.featureText}>Valor em risco e alertas</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Planos</Text>

      <View style={styles.planCard}>
        <View style={styles.planTop}>
          <Text style={styles.planName}>Plano Mensal</Text>
          <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.planPrice}>R$ 44,90</Text>
        <Text style={styles.planDesc}>Acesso por 30 dias</Text>
      </View>

      <View style={styles.planCard}>
        <View style={styles.planTop}>
          <Text style={styles.planName}>Plano Trimestral</Text>
          <Ionicons name="layers-outline" size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.planPrice}>R$ 89,90</Text>
        <Text style={styles.planDesc}>Acesso por 90 dias</Text>
      </View>

      <View style={[styles.planCard, styles.featuredPlanCard]}>
        <View style={styles.bestValueBadge}>
          <Text style={styles.bestValueBadgeText}>Melhor custo-benefício</Text>
        </View>

        <View style={styles.planTop}>
          <Text style={styles.planName}>Plano Anual</Text>
          <Ionicons name="ribbon-outline" size={20} color={COLORS.primary} />
        </View>
        <Text style={styles.planPrice}>R$ 449,90</Text>
        <Text style={styles.planDesc}>Acesso por 365 dias</Text>
      </View>

      <Text style={styles.sectionTitle}>Pagamento</Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Chave Pix</Text>
        <Text style={styles.infoValue}>{PIX_KEY}</Text>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleCopyPix}>
          <Ionicons name="copy-outline" size={18} color={COLORS.text} />
          <Text style={styles.secondaryButtonText}>Copiar chave Pix</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Suporte e liberação</Text>
        <Text style={styles.infoValue}>WhatsApp: +{WHATSAPP_NUMBER}</Text>

        <TouchableOpacity style={styles.whatsappButton} onPress={handleOpenWhatsApp}>
          <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
          <Text style={styles.whatsappButtonText}>Abrir WhatsApp</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Código de liberação</Text>

      <TextInput
        style={styles.input}
        placeholder="Digite seu código"
        placeholderTextColor={COLORS.textLight}
        value={activationCode}
        onChangeText={setActivationCode}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.primaryButton, loading && styles.disabledButton]}
        onPress={handleActivate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="key-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Ativar licença</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.footerText}>
        Seus dados continuam salvos. Após o pagamento, basta inserir o código para liberar novamente o app.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
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
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroBadge: {
    backgroundColor: `${COLORS.primary}15`,
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 12,
    overflow: 'hidden',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  offlineInfoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  offlineInfoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontWeight: '600',
  },
  alertBox: {
    backgroundColor: '#FFF4E5',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9A3412',
    marginBottom: 6,
  },
  alertText: {
    fontSize: 14,
    color: '#7C2D12',
  },
  bold: {
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 6,
  },
  featureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  featureText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  featuredPlanCard: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    position: 'relative',
  },
  bestValueBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  bestValueBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  planPrice: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 6,
  },
  planDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  whatsappButton: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  whatsappButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.7,
  },
  footerText: {
    marginTop: 18,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
});