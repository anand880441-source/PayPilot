import React, { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../store/AuthContext';

function AuthGuard() {
    const { isAuthenticated, loading } = useAuth();

    useEffect(() => {
        if (loading) return;
        if (!isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, loading]);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090a0f' }}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <>
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: '#090a0f' },
                    headerTintColor: '#f8fafc',
                    headerTitleStyle: { fontWeight: '700', fontSize: 17 },
                    headerShadowVisible: false,
                    contentStyle: { backgroundColor: '#090a0f' },
                }}
            >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="register" options={{ headerShown: false }} />
                <Stack.Screen 
                    name="screens/Profile" 
                    options={{ title: 'Profile', headerBackTitle: 'Back' }} 
                />
                <Stack.Screen 
                    name="screens/Subscriptions" 
                    options={{ title: 'Subscriptions', headerBackTitle: 'Back' }} 
                />
                <Stack.Screen 
                    name="screens/Reconciliation" 
                    options={{ title: 'Reconciliation', headerBackTitle: 'Back' }} 
                />
                <Stack.Screen 
                    name="screens/Statements" 
                    options={{ title: 'Statements & History', headerBackTitle: 'Back' }} 
                />
                <Stack.Screen 
                    name="screens/Settings" 
                    options={{ title: 'Settings', headerBackTitle: 'Back' }} 
                />
            </Stack>
            <StatusBar style="light" />
        </>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <AuthGuard />
        </AuthProvider>
    );
}
