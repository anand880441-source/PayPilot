import React, { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TextInput,
    TouchableOpacity, Alert, ActivityIndicator, Switch, RefreshControl
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const WEB_APP_URL = 'https://paypilot-woad.vercel.app';
const SETTING_TABS = ['General', 'Alerts', 'Security', 'Integrations'];

export default function SettingsScreen() {
    const [activeTab, setActiveTab] = useState('General');
    const [settings, setSettings] = useState({
        theme: 'dark',
        notifications: {
            email: true,
            push: true,
            renewalReminders: true,
            weeklyDigest: true,
            marketing: false
        },
        currency: 'USD',
        language: 'en',
        autoDetectSubscriptions: true,
        twoFactorAuth: false
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Password form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Connected services state
    const [gmailConnected, setGmailConnected] = useState(false);
    const [plaidConnected, setPlaidConnected] = useState(false);

    const fetchSettingsAndStatus = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const [settingsRes, gmailRes, plaidRes] = await Promise.all([
                api.get('/users/settings'),
                api.get('/users/gmail-status').catch(() => ({ data: { connected: false } })),
                api.get('/users/plaid-status').catch(() => ({ data: { connected: false } }))
            ]);

            if (settingsRes.data?.success && settingsRes.data?.data) {
                setSettings(prev => ({ ...prev, ...settingsRes.data.data }));
            }
            setGmailConnected(!!gmailRes.data?.connected);
            setPlaidConnected(!!plaidRes.data?.connected);
        } catch (e) {
            console.error('Failed to fetch settings', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchSettingsAndStatus();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchSettingsAndStatus(true);
    };

    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            const res = await api.put('/users/settings', settings);
            if (res.data?.success) {
                Alert.alert('Saved', 'Preferences updated.');
            }
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const toggleNotification = (key) => {
        setSettings(prev => ({
            ...prev,
            notifications: {
                ...prev.notifications,
                [key]: !prev.notifications?.[key]
            }
        }));
    };

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Required', 'Please fill in all password fields.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Mismatch', 'New passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Weak', 'Password must be at least 6 characters.');
            return;
        }

        setPasswordLoading(true);
        try {
            await api.put('/users/settings/password', { currentPassword, newPassword });
            Alert.alert('Success', 'Password updated successfully.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to update password.');
        } finally {
            setPasswordLoading(false);
        }
    };

    const openWebConnect = () => {
        WebBrowser.openBrowserAsync(`${WEB_APP_URL}/settings`);
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    return (
        <ScrollView 
            style={styles.container} 
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 50 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
            }
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Application preferences and external synchronization</Text>

            {/* Tab Chips */}
            <View style={styles.tabsRow}>
                {SETTING_TABS.map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabChip, activeTab === tab && styles.tabChipActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabChipText, activeTab === tab && styles.tabChipTextActive]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* GENERAL */}
            {activeTab === 'General' && (
                <View style={styles.section}>
                    <Text style={styles.sectionHeading}>DETECTION ENGINE</Text>
                    <View style={styles.card}>
                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={styles.toggleLabel}>Auto-Detect Subscriptions</Text>
                                <Text style={styles.toggleDesc}>Scan statements for recurring merchant signatures</Text>
                            </View>
                            <Switch
                                value={settings.autoDetectSubscriptions}
                                onValueChange={(val) => setSettings(prev => ({ ...prev, autoDetectSubscriptions: val }))}
                                trackColor={{ false: '#1e2230', true: '#4f46e5' }}
                                thumbColor="#fff"
                            />
                        </View>
                    </View>

                    <Text style={[styles.sectionHeading, { marginTop: 16 }]}>CURRENCY STANDARD</Text>
                    <View style={styles.card}>
                        <View style={styles.currencyRow}>
                            {['INR (₹)', 'USD ($)', 'EUR (€)', 'GBP (£)'].map((curr) => {
                                const currCode = curr.split(' ')[0];
                                const isSelected = settings.currency === currCode || (currCode === 'USD' && !settings.currency);
                                return (
                                    <TouchableOpacity
                                        key={curr}
                                        style={[styles.currBtn, isSelected && styles.currBtnActive]}
                                        onPress={() => setSettings(prev => ({ ...prev, currency: currCode }))}
                                    >
                                        <Text style={[styles.currText, isSelected && styles.currTextActive]}>{curr}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <Text style={[styles.sectionHeading, { marginTop: 16 }]}>DEVELOPER ACCESS</Text>
                    <View style={styles.card}>
                        <View style={styles.apiKeyRow}>
                            <Ionicons name="key" size={16} color="#818cf8" />
                            <Text style={styles.apiKeyText}>sk_live_••••••••93kF2</Text>
                        </View>
                        <Text style={styles.apiDesc}>Endpoint key for webhook feeds</Text>
                    </View>
                </View>
            )}

            {/* ALERTS / NOTIFICATIONS */}
            {activeTab === 'Alerts' && (
                <View style={styles.section}>
                    <Text style={styles.sectionHeading}>COMMUNICATION PREFERENCES</Text>
                    <View style={styles.card}>
                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={styles.toggleLabel}>Email Summaries</Text>
                                <Text style={styles.toggleDesc}>Weekly ledger digest</Text>
                            </View>
                            <Switch
                                value={settings.notifications?.email}
                                onValueChange={() => toggleNotification('email')}
                                trackColor={{ false: '#1e2230', true: '#4f46e5' }}
                                thumbColor="#fff"
                            />
                        </View>

                        <View style={[styles.toggleRow, styles.divider]}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={styles.toggleLabel}>Push Alerts</Text>
                                <Text style={styles.toggleDesc}>Instant transaction alerts</Text>
                            </View>
                            <Switch
                                value={settings.notifications?.push}
                                onValueChange={() => toggleNotification('push')}
                                trackColor={{ false: '#1e2230', true: '#4f46e5' }}
                                thumbColor="#fff"
                            />
                        </View>

                        <View style={[styles.toggleRow, styles.divider]}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={styles.toggleLabel}>Renewal Reminders</Text>
                                <Text style={styles.toggleDesc}>Notification 72 hours before charge</Text>
                            </View>
                            <Switch
                                value={settings.notifications?.renewalReminders}
                                onValueChange={() => toggleNotification('renewalReminders')}
                                trackColor={{ false: '#1e2230', true: '#4f46e5' }}
                                thumbColor="#fff"
                            />
                        </View>
                    </View>
                </View>
            )}

            {/* SECURITY */}
            {activeTab === 'Security' && (
                <View style={styles.section}>
                    <Text style={styles.sectionHeading}>AUTHENTICATION</Text>
                    <View style={styles.card}>
                        <View style={styles.toggleRow}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={styles.toggleLabel}>Two-Factor Authentication</Text>
                                <Text style={styles.toggleDesc}>Require verification on new sessions</Text>
                            </View>
                            <Switch
                                value={settings.twoFactorAuth}
                                onValueChange={(val) => setSettings(prev => ({ ...prev, twoFactorAuth: val }))}
                                trackColor={{ false: '#1e2230', true: '#4f46e5' }}
                                thumbColor="#fff"
                            />
                        </View>
                    </View>

                    <Text style={[styles.sectionHeading, { marginTop: 16 }]}>UPDATE PASSWORD</Text>
                    <View style={styles.card}>
                        <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Current password"
                            placeholderTextColor="#475569"
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            secureTextEntry
                        />

                        <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Min 6 characters"
                            placeholderTextColor="#475569"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                        />

                        <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Repeat new password"
                            placeholderTextColor="#475569"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                        />

                        <TouchableOpacity 
                            style={styles.passwordBtn}
                            onPress={handleChangePassword}
                            disabled={passwordLoading}
                        >
                            {passwordLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.passwordBtnText}>Update Password</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* INTEGRATIONS */}
            {activeTab === 'Integrations' && (
                <View style={styles.section}>
                    <Text style={styles.sectionHeading}>EXTERNAL CHANNELS</Text>
                    <View style={styles.card}>
                        {/* Gmail */}
                        <View style={styles.serviceRow}>
                            <View style={[styles.serviceIcon, { backgroundColor: '#ea433522' }]}>
                                <Ionicons name="mail" size={18} color="#ea4335" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.serviceName}>Google Gmail</Text>
                                <Text style={styles.serviceDesc}>Invoice auto-parsing</Text>
                            </View>
                            <View style={[styles.serviceStatus, { backgroundColor: gmailConnected ? '#064e3b' : '#1e2230' }]}>
                                <Text style={[styles.serviceStatusText, { color: gmailConnected ? '#34d399' : '#64748b' }]}>
                                    {gmailConnected ? 'CONNECTED' : 'DISCONNECTED'}
                                </Text>
                            </View>
                        </View>

                        {/* Plaid */}
                        <View style={[styles.serviceRow, styles.divider]}>
                            <View style={[styles.serviceIcon, { backgroundColor: '#00b09022' }]}>
                                <Ionicons name="link" size={18} color="#00b090" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.serviceName}>Plaid Bank Feed</Text>
                                <Text style={styles.serviceDesc}>Direct institutional sync</Text>
                            </View>
                            <View style={[styles.serviceStatus, { backgroundColor: plaidConnected ? '#064e3b' : '#1e2230' }]}>
                                <Text style={[styles.serviceStatusText, { color: plaidConnected ? '#34d399' : '#64748b' }]}>
                                    {plaidConnected ? 'CONNECTED' : 'DISCONNECTED'}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.connectWebBtn} onPress={openWebConnect}>
                            <Ionicons name="open-outline" size={16} color="#fff" />
                            <Text style={styles.connectWebText}>Manage on Web Portal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Save Preferences Button */}
            {(activeTab === 'General' || activeTab === 'Alerts') && (
                <TouchableOpacity 
                    style={styles.saveBtn}
                    onPress={handleSaveSettings}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.saveBtnText}>Save Preferences</Text>
                    )}
                </TouchableOpacity>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090a0f' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090a0f' },
    title: { fontSize: 24, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.5, paddingTop: 14 },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 2, marginBottom: 14 },
    tabsRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
    tabChip: {
        flex: 1, paddingVertical: 8, borderRadius: 12,
        backgroundColor: '#12141c', alignItems: 'center',
        borderWidth: 1, borderColor: '#1e2230',
    },
    tabChipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
    tabChipText: { color: '#64748b', fontSize: 11, fontWeight: '600' },
    tabChipTextActive: { color: '#fff', fontWeight: '700' },
    section: { marginBottom: 16 },
    sectionHeading: { color: '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
    card: {
        backgroundColor: '#12141c', borderRadius: 20, padding: 16,
        borderWidth: 1, borderColor: '#1e2230',
    },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    toggleLabel: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
    toggleDesc: { color: '#64748b', fontSize: 12, marginTop: 2 },
    divider: { borderTopWidth: 1, borderTopColor: '#1e2230', marginTop: 10, paddingTop: 10 },
    fieldLabel: { color: '#64748b', fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
    currencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    currBtn: {
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
        backgroundColor: '#090a0f', borderWidth: 1, borderColor: '#1e2230',
    },
    currBtnActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
    currText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
    currTextActive: { color: '#fff', fontWeight: '700' },
    apiKeyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    apiKeyText: { color: '#818cf8', fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },
    apiDesc: { color: '#64748b', fontSize: 11, marginTop: 4 },
    input: {
        backgroundColor: '#090a0f', color: '#f8fafc',
        borderRadius: 12, padding: 12, fontSize: 14,
        borderWidth: 1, borderColor: '#1e2230', marginBottom: 10,
    },
    passwordBtn: {
        backgroundColor: '#0ea5e9', borderRadius: 12,
        padding: 13, alignItems: 'center', marginTop: 4,
    },
    passwordBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
    serviceIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    serviceName: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
    serviceDesc: { color: '#64748b', fontSize: 11, marginTop: 1 },
    serviceStatus: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
    serviceStatusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    connectWebBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: '#4f46e5', borderRadius: 12, padding: 12, marginTop: 14,
    },
    connectWebText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    saveBtn: {
        backgroundColor: '#4f46e5', borderRadius: 14,
        padding: 14, alignItems: 'center', marginTop: 16,
    },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
