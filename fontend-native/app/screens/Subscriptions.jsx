import React, { useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, ActivityIndicator,
    TouchableOpacity, Alert, RefreshControl, Modal, TextInput
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function SubscriptionsScreen() {
    const [subscriptions, setSubscriptions] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Modal state for adding a subscription
    const [modalVisible, setModalVisible] = useState(false);
    const [merchant, setMerchant] = useState('');
    const [amount, setAmount] = useState('');
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [submitting, setSubmitting] = useState(false);

    // Cancellation modal state
    const [cancelModalVisible, setCancelModalVisible] = useState(false);
    const [selectedSub, setSelectedSub] = useState(null);

    const fetchAllData = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const [subsRes, suggRes] = await Promise.all([
                api.get('/subscriptions'),
                api.get('/subscriptions/suggestions')
            ]);
            setSubscriptions(subsRes.data?.data || []);
            setSuggestions(suggRes.data?.data || []);
        } catch (e) {
            console.error('Failed to fetch subscriptions/suggestions', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchAllData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchAllData(true);
    };

    const handlePickAndUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'text/comma-separated-values', 'application/pdf', '*/*'],
                copyToCacheDirectory: true
            });

            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }

            const file = result.assets[0];
            setUploading(true);

            const formData = new FormData();
            formData.append('statement', {
                uri: file.uri,
                name: file.name || 'statement.csv',
                type: file.mimeType || (file.name?.endsWith('.pdf') ? 'application/pdf' : 'text/csv')
            });

            const res = await api.post('/reconciliation/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data?.success) {
                Alert.alert(
                    'Statement Analyzed',
                    `Found ${res.data.detectedCount || 0} potential subscriptions.`
                );
                fetchAllData(true);
            }
        } catch (e) {
            Alert.alert('Upload Error', e.response?.data?.message || 'Failed to upload statement');
        } finally {
            setUploading(false);
        }
    };

    const handleAddSubscription = async () => {
        if (!merchant.trim() || !amount) {
            Alert.alert('Required', 'Please enter merchant and amount.');
            return;
        }
        setSubmitting(true);
        try {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            await api.post('/subscriptions', {
                merchant: merchant.trim(),
                amount: parseFloat(amount),
                billingCycle,
                nextRenewalDate: nextMonth.toISOString()
            });
            setModalVisible(false);
            setMerchant('');
            setAmount('');
            fetchAllData(true);
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to add subscription');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApproveSuggestion = async (suggestionId) => {
        try {
            await api.post(`/subscriptions/suggestions/${suggestionId}/approve`);
            fetchAllData(true);
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to approve suggestion');
        }
    };

    const handleRejectSuggestion = async (suggestionId) => {
        try {
            await api.delete(`/subscriptions/suggestions/${suggestionId}/reject`);
            fetchAllData(true);
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to reject suggestion');
        }
    };

    const handleTogglePause = async (item) => {
        const isPaused = item.status === 'paused';
        const action = isPaused ? 'resume' : 'pause';
        try {
            await api.patch(`/subscriptions/${item._id}/${action}`);
            fetchAllData(true);
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || `Failed to ${action} subscription`);
        }
    };

    const handleConfirmCancel = async () => {
        if (!selectedSub) return;
        try {
            await api.delete(`/subscriptions/${selectedSub._id}`);
            setCancelModalVisible(false);
            setSelectedSub(null);
            fetchAllData(true);
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to remove subscription');
        }
    };

    const totalMonthly = Array.isArray(subscriptions)
        ? subscriptions
            .filter(s => s.status === 'active')
            .reduce((sum, s) => sum + (s.amount || 0), 0)
        : 0;

    const renderItem = ({ item }) => {
        const isPaused = item.status === 'paused';
        return (
            <View style={styles.card}>
                <View style={styles.cardLeft}>
                    <View style={[styles.iconBox, { backgroundColor: isPaused ? '#1e2230' : '#312e81' }]}>
                        <Ionicons 
                            name="card" 
                            size={18} 
                            color={isPaused ? '#64748b' : '#a78bfa'} 
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.subName} numberOfLines={1}>{item.merchant || 'Subscription'}</Text>
                        <Text style={styles.subBilling}>
                            ₹{(item.amount || 0).toFixed(2)} • {item.billingCycle || 'Monthly'}
                        </Text>
                        <Text style={styles.renewalDate}>
                            {item.nextRenewalDate ? `Renews: ${new Date(item.nextRenewalDate).toLocaleDateString()}` : ''}
                        </Text>
                    </View>
                </View>
                <View style={styles.cardActions}>
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: isPaused ? '#064e3b' : '#1e2230' }]}
                        onPress={() => handleTogglePause(item)}
                    >
                        <Ionicons 
                            name={isPaused ? 'play' : 'pause'} 
                            size={15} 
                            color={isPaused ? '#34d399' : '#f59e0b'} 
                        />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: '#1e2230' }]}
                        onPress={() => {
                            setSelectedSub(item);
                            setCancelModalVisible(true);
                        }}
                    >
                        <Ionicons name="trash-outline" size={15} color="#f87171" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <FlatList
            style={styles.container}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            data={subscriptions}
            keyExtractor={(item, i) => item._id || String(i)}
            renderItem={renderItem}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
            }
            initialNumToRender={10}
            ListHeaderComponent={
                <View>
                    {/* Header */}
                    <View style={styles.headerRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>Subscriptions</Text>
                            <Text style={styles.subtitle}>Recurring obligations and renewal schedules</Text>
                        </View>
                        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                            <Ionicons name="add" size={16} color="#fff" />
                            <Text style={styles.addBtnText}>Add</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Spend Banner */}
                    <View style={styles.totalCard}>
                        <Text style={styles.totalLabel}>MONTHLY RECURRING COMMITMENT</Text>
                        <Text style={styles.totalAmount}>₹{totalMonthly.toFixed(2)}</Text>
                        <Text style={styles.subCount}>{subscriptions.length} active service{subscriptions.length !== 1 ? 's' : ''}</Text>
                    </View>

                    {/* Statement Analyzer */}
                    <TouchableOpacity 
                        style={styles.uploadCta} 
                        onPress={handlePickAndUpload}
                        disabled={uploading}
                    >
                        <View style={styles.uploadCtaIcon}>
                            <Ionicons name="sparkles" size={18} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.uploadCtaTitle}>
                                {uploading ? 'Analyzing Document...' : 'Scan Statement for Subscriptions'}
                            </Text>
                            <Text style={styles.uploadCtaSub}>Upload CSV / PDF to auto-detect recurring bills</Text>
                        </View>
                        {uploading ? (
                            <ActivityIndicator size="small" color="#818cf8" />
                        ) : (
                            <Ionicons name="cloud-upload-outline" size={20} color="#818cf8" />
                        )}
                    </TouchableOpacity>

                    {/* Suggestions Section */}
                    {suggestions.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                            <View style={styles.suggestionsHeader}>
                                <Ionicons name="bulb-outline" size={18} color="#f59e0b" />
                                <Text style={styles.suggestionsTitle}>
                                    Detected Subscriptions ({suggestions.length})
                                </Text>
                            </View>
                            {suggestions.map((sugg) => (
                                <View key={sugg._id} style={styles.suggestionCard}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.suggMerchant}>{sugg.data?.merchant || 'Service'}</Text>
                                        <Text style={styles.suggDetails}>
                                            ₹{(sugg.data?.amount || 0).toFixed(2)} • {sugg.data?.billingCycle || 'monthly'}
                                        </Text>
                                    </View>
                                    <View style={styles.suggActions}>
                                        <TouchableOpacity 
                                            style={styles.approveBtn}
                                            onPress={() => handleApproveSuggestion(sugg._id)}
                                        >
                                            <Text style={styles.suggBtnText}>Accept</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={styles.rejectBtn}
                                            onPress={() => handleRejectSuggestion(sugg._id)}
                                        >
                                            <Ionicons name="close" size={14} color="#64748b" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    <Text style={[styles.sectionHeading, { marginTop: 14, marginBottom: 8 }]}>
                        Active Subscriptions ({subscriptions.length})
                    </Text>
                </View>
            }
            ListEmptyComponent={
                loading ? (
                    <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 20 }} />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="card-outline" size={42} color="#334155" />
                        <Text style={styles.empty}>No recurring subscriptions logged</Text>
                    </View>
                )
            }
            ListFooterComponent={
                <>
                    <Modal
                        visible={modalVisible}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Add Subscription</Text>
                                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                                        <Ionicons name="close" size={24} color="#94a3b8" />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.label}>SERVICE NAME</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. Netflix, Spotify, AWS"
                                    placeholderTextColor="#475569"
                                    value={merchant}
                                    onChangeText={setMerchant}
                                />

                                <Text style={styles.label}>AMOUNT (₹)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0.00"
                                    placeholderTextColor="#475569"
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="numeric"
                                />

                                <Text style={styles.label}>BILLING FREQUENCY</Text>
                                <View style={styles.cycleRow}>
                                    {['monthly', 'yearly', 'weekly'].map(c => (
                                        <TouchableOpacity
                                            key={c}
                                            style={[styles.cycleBtn, billingCycle === c && styles.cycleBtnActive]}
                                            onPress={() => setBillingCycle(c)}
                                        >
                                            <Text style={[styles.cycleText, billingCycle === c && styles.cycleTextActive]}>
                                                {c.toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TouchableOpacity 
                                    style={styles.submitBtn} 
                                    onPress={handleAddSubscription}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Add Subscription</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    <Modal
                        visible={cancelModalVisible}
                        animationType="fade"
                        transparent={true}
                        onRequestClose={() => setCancelModalVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={styles.cancelModalContent}>
                                <Text style={styles.cancelTitle}>Remove Subscription</Text>
                                <Text style={styles.cancelDesc}>
                                    Stop tracking <Text style={{ fontWeight: '700', color: '#fff' }}>{selectedSub?.merchant}</Text>? Renewal reminders will be deactivated.
                                </Text>
                                <View style={styles.cancelActionRow}>
                                    <TouchableOpacity 
                                        style={styles.cancelDismissBtn}
                                        onPress={() => {
                                            setCancelModalVisible(false);
                                            setSelectedSub(null);
                                        }}
                                    >
                                        <Text style={styles.cancelDismissText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles.cancelConfirmBtn}
                                        onPress={handleConfirmCancel}
                                    >
                                        <Text style={styles.cancelConfirmText}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                </>
            }
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090a0f' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginBottom: 12 },
    title: { fontSize: 24, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.5 },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#4f46e5', paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 12,
    },
    addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    totalCard: {
        backgroundColor: '#12141c', borderRadius: 20, padding: 18, marginBottom: 12,
        borderWidth: 1, borderColor: '#1e2230',
    },
    totalLabel: { color: '#64748b', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
    totalAmount: { color: '#f8fafc', fontSize: 28, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
    subCount: { color: '#818cf8', fontSize: 12, fontWeight: '600', marginTop: 2 },
    uploadCta: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#12141c', padding: 14, borderRadius: 16,
        borderWidth: 1, borderColor: '#1e2230', marginBottom: 14,
    },
    uploadCtaIcon: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center',
    },
    uploadCtaTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
    uploadCtaSub: { color: '#64748b', fontSize: 11, marginTop: 2 },
    suggestionsContainer: {
        backgroundColor: '#12141c', borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: '#1e2230', marginBottom: 14,
    },
    suggestionsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    suggestionsTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
    suggestionCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#090a0f', padding: 12, borderRadius: 12, marginBottom: 6,
        borderWidth: 1, borderColor: '#1e2230',
    },
    suggMerchant: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
    suggDetails: { color: '#34d399', fontSize: 12, fontWeight: '700', marginTop: 2 },
    suggActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    approveBtn: { backgroundColor: '#064e3b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    rejectBtn: { backgroundColor: '#12141c', padding: 6, borderRadius: 8, borderWidth: 1, borderColor: '#1e2230' },
    suggBtnText: { color: '#34d399', fontSize: 12, fontWeight: '700' },
    sectionHeading: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
    card: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#12141c', borderRadius: 16, padding: 14, marginBottom: 8,
        borderWidth: 1, borderColor: '#1e2230',
    },
    cardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1, marginRight: 8 },
    iconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
    subName: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
    subBilling: { color: '#818cf8', fontSize: 13, fontWeight: '600', marginTop: 2 },
    renewalDate: { color: '#64748b', fontSize: 11, marginTop: 2 },
    cardActions: { flexDirection: 'row', gap: 6 },
    actionBtn: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', marginTop: 30, paddingBottom: 20 },
    empty: { color: '#64748b', fontSize: 14, fontWeight: '600', marginTop: 8 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
    modalContent: { backgroundColor: '#12141c', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    modalTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
    label: { color: '#94a3b8', fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6, marginTop: 10 },
    input: {
        backgroundColor: '#090a0f', color: '#f8fafc',
        borderRadius: 12, padding: 12, fontSize: 14,
        borderWidth: 1, borderColor: '#1e2230',
    },
    cycleRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
    cycleBtn: {
        flex: 1, paddingVertical: 10, borderRadius: 10,
        backgroundColor: '#090a0f', alignItems: 'center',
        borderWidth: 1, borderColor: '#1e2230',
    },
    cycleBtnActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
    cycleText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
    cycleTextActive: { color: '#fff' },
    submitBtn: {
        backgroundColor: '#4f46e5', borderRadius: 12,
        padding: 14, alignItems: 'center', marginTop: 22, marginBottom: 16,
    },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    cancelModalContent: {
        marginHorizontal: 24, alignSelf: 'center', marginVertical: 'auto',
        backgroundColor: '#12141c', borderRadius: 20, padding: 24,
        borderWidth: 1, borderColor: '#1e2230', width: '90%',
    },
    cancelTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
    cancelDesc: { color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
    cancelActionRow: { flexDirection: 'row', gap: 10 },
    cancelDismissBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#1e2230', alignItems: 'center' },
    cancelDismissText: { color: '#f8fafc', fontWeight: '600' },
    cancelConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#dc2626', alignItems: 'center' },
    cancelConfirmText: { color: '#fff', fontWeight: '700' },
});
