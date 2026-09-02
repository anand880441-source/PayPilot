import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';

const WEB_APP_URL = 'https://paypilot-woad.vercel.app';

const MenuItem = ({ icon, label, subtitle, color = '#6366f1', onPress, isLast }) => (
    <TouchableOpacity 
        style={[styles.menuItem, isLast && styles.noBorder]} 
        onPress={onPress}
        activeOpacity={0.65}
    >
        <View style={[styles.menuIcon, { backgroundColor: color + '1f' }]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>{label}</Text>
            {subtitle && <Text style={styles.menuSub}>{subtitle}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={16} color="#475569" />
    </TouchableOpacity>
);

export default function MoreScreen() {
    const { user, logout } = useAuth();
    const displayName = user?.fullName || user?.name || 'User';

    const handleLogout = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out from PayPilot?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/login');
                },
            },
        ]);
    };

    const openWeb = (path) => {
        WebBrowser.openBrowserAsync(`${WEB_APP_URL}${path}`);
    };

    return (
        <ScrollView 
            style={styles.container} 
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Hub</Text>
                <Text style={styles.subtitle}>Account tools and external connections</Text>
            </View>

            {/* Profile Summary Card */}
            <TouchableOpacity 
                style={styles.profileCard}
                onPress={() => router.push('/screens/Profile')}
                activeOpacity={0.8}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {(displayName || 'U')[0].toUpperCase()}
                    </Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{displayName}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'Authenticated User'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748b" />
            </TouchableOpacity>

            {/* Feature Modules */}
            <Text style={styles.sectionHeader}>FINANCIAL MANAGEMENT</Text>
            <View style={styles.sectionGroup}>
                <MenuItem 
                    icon="card" 
                    label="Subscriptions" 
                    subtitle="Recurring bills and renewal reminders"
                    color="#8b5cf6"
                    onPress={() => router.push('/screens/Subscriptions')} 
                />
                <MenuItem 
                    icon="git-merge" 
                    label="Reconciliation" 
                    subtitle="Bank statement matching and auditing"
                    color="#0ea5e9"
                    onPress={() => router.push('/screens/Reconciliation')} 
                />
                <MenuItem 
                    icon="document-text" 
                    label="Statements & History" 
                    subtitle="Uploaded archives and CSV exports"
                    color="#10b981"
                    onPress={() => router.push('/screens/Statements')} 
                />
                <MenuItem 
                    icon="settings" 
                    label="Preferences & Security" 
                    subtitle="2FA, notifications and password"
                    color="#f59e0b"
                    isLast={true}
                    onPress={() => router.push('/screens/Settings')} 
                />
            </View>

            {/* External Integrations */}
            <Text style={styles.sectionHeader}>EXTERNAL INTEGRATIONS</Text>
            <View style={styles.sectionGroup}>
                <MenuItem 
                    icon="mail" 
                    label="Connect Gmail (Web)" 
                    subtitle="Auto-parse digital receipts and invoices"
                    color="#ea4335"
                    onPress={() => openWeb('/settings')} 
                />
                <MenuItem 
                    icon="link" 
                    label="Connect Plaid (Web)" 
                    subtitle="Direct institutional bank feed"
                    color="#00b090"
                    isLast={true}
                    onPress={() => openWeb('/settings')} 
                />
            </View>

            {/* Session Management */}
            <View style={[styles.sectionGroup, { marginTop: 24 }]}>
                <MenuItem 
                    icon="log-out" 
                    label="Sign Out" 
                    subtitle="Terminate local session"
                    color="#ef4444"
                    isLast={true}
                    onPress={handleLogout} 
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090a0f' },
    header: { paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12 },
    title: { fontSize: 24, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.5 },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
    profileCard: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 16, marginTop: 6, marginBottom: 20,
        backgroundColor: '#12141c', borderRadius: 20, padding: 16, gap: 14,
        borderWidth: 1, borderColor: '#1e2230',
    },
    avatar: {
        width: 50, height: 50, borderRadius: 16,
        backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
    userName: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
    userEmail: { color: '#64748b', fontSize: 12, marginTop: 2 },
    sectionHeader: { 
        color: '#64748b', fontSize: 10, fontWeight: '700', 
        paddingHorizontal: 20, marginBottom: 8, marginTop: 12,
        letterSpacing: 0.8,
    },
    sectionGroup: { 
        backgroundColor: '#12141c', marginHorizontal: 16, 
        borderRadius: 20, borderWidth: 1, borderColor: '#1e2230', overflow: 'hidden' 
    },
    menuItem: { 
        flexDirection: 'row', alignItems: 'center', 
        padding: 15, borderBottomWidth: 1, borderBottomColor: '#1e2230' 
    },
    noBorder: { borderBottomWidth: 0 },
    menuIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    menuLabel: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
    menuSub: { color: '#64748b', fontSize: 11, marginTop: 2 },
});
