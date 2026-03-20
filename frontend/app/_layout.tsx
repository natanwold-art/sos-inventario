import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { initDatabase } from '../src/database/db';
import { isUserLoggedIn } from '../src/services/auth';
import { COLORS } from '../src/constants/theme';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        await initDatabase();

        const logged = await isUserLoggedIn();
        const currentRoute = segments[0];
        const isAuthScreen =
          currentRoute === 'login' || currentRoute === 'register';

        if (!logged) {
          if (!isAuthScreen) {
            router.replace('/login' as any);
          }
        } else {
          if (isAuthScreen) {
            router.replace('/' as any);
          }
        }
      } catch (error) {
        console.log('Erro ao preparar app:', error);
      } finally {
        setIsReady(true);
      }
    };

    prepareApp();
  }, [router, segments]);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: 'Entrar',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: 'Criar conta',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="index"
        options={{
          title: 'SOS Inventário',
        }}
      />
      <Stack.Screen
        name="scanner"
        options={{
          title: 'Scanner Inteligente',
        }}
      />
      <Stack.Screen
        name="alerts"
        options={{
          title: 'Alertas',
        }}
      />
      <Stack.Screen
        name="products"
        options={{
          title: 'Produtos',
        }}
      />
      <Stack.Screen
        name="product/add"
        options={{
          title: 'Novo Produto',
        }}
      />
      <Stack.Screen
        name="product/[id]"
        options={{
          title: 'Detalhes do Produto',
        }}
      />
    </Stack>
  );
}