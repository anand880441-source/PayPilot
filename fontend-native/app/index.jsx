import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../store/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    if (isAuthenticated) {
        return <Redirect href="/(tabs)/dashboard" />;
    }

    return <Redirect href="/login" />;
}
