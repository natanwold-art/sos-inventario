import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { initDatabase } from '../src/database/db';
import { COLORS } from '../src/constants/theme';

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError('Erro ao inicializar o banco de dados');
        setIsLoading(false);
      }
    };
    init();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.primary,
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'SOS Inventário',
          }}
        />
        <Stack.Screen
          name="scanner"
          options={{
            title: 'Escanear Produto',
            presentation: 'modal',
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
        <Stack.Screen
          name="alerts"
          options={{
            title: 'Alertas de Estoque',
          }}
        />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    textAlign: 'center',
    padding: 20,
  },
});
