import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  loginUser,
  hasRegisteredUser,
  isUserLoggedIn,
} from '../src/services/auth';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../src/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      const logged = await isUserLoggedIn();

      if (logged) {
        router.replace('/' as any);
      }
    };

    checkAccess();
  }, [router]);

  const handleLogin = async () => {
    if (!name.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Preencha nome e senha');
      return;
    }

    const registered = await hasRegisteredUser();

    if (!registered) {
      Alert.alert(
        'Nenhum usuário cadastrado',
        'Você ainda não tem cadastro. Crie sua conta primeiro.'
      );
      return;
    }

    const success = await loginUser(name.trim(), password.trim());

    if (!success) {
      Alert.alert('Erro', 'Nome ou senha inválidos');
      return;
    }

    router.replace('/' as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBlock}>
        <View style={styles.logoCircle}>
          <Ionicons name="cube-outline" size={38} color="#FFFFFF" />
        </View>

        <Text style={styles.title}>SOS Inventário</Text>
        <Text style={styles.subtitle}>
          Entre para controlar seu estoque com rapidez e segurança
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Entrar</Text>

        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Seu nome"
            value={name}
            onChangeText={setName}
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.input}
            placeholder="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Entrar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/register' as any)}
        >
          <Text style={styles.secondaryButtonText}>Criar conta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  topBlock: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    minHeight: 56,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  button: {
    backgroundColor: COLORS.primary,
    minHeight: 56,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  buttonText: {
    color: '#fff',
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});