import React, { useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, ActivityIndicator,
    TouchableOpacity, RefreshControl, Alert
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function ReconciliationScreen() {
    const [stats, setStats] = useState({
        totalTransactions: 0,
        matchedTransactions: 0,
        pendingTransactions: 0,
        unmatchedTransactions: 0,
        totalAmount: 0,
        categoryBreakdown: []
    });
    const [pendingTxns, setPendingTxns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fetchData = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const [statsRes, txnsRes] = await Promise.all([
                api.get('/reconciliation/stats'),
                api.get('/transactions?status=pending&limit=50')
            ]);
            if (statsRes.data?.success && statsRes.data?.data) {
                setStats(statsRes.data.data);
            }
            setPendingTxns(txnsRes.data?.data || []);
        } catch (e) {
            console.error('Failed to fetch reconciliation stats', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData(true);
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
            const isCsvOrPdf = file.name?.endsWith('.csv') || file.name?.endsWith('.pdf') || file.mimeType?.includes('csv') || file.mimeType?.includes('pdf');

            if (!isCsvOrPdf) {
                Alert.alert('Unsupported Format', 'Please choose a CSV or PDF bank statement.');
                return;
            }

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
                    'Reconciliation Complete',
                    `Parsed ${res.data.transactionsCount || 0} transactions and identified ${res.data.detectedCount || 0} potential subscriptions.`
                );
                fetchData(true);
            } else {
                Alert.alert('Upload Failed', res.data?.message || 'Failed to process statement');
            }
        } catch (e) {
            Alert.alert('Upload Error', e.response?.data?.message || 'Could not upload statement.');
        } finally {
            setUploading(false);
        }
    };

    const matchRate = stats.totalTransactions > 0
        ? ((stats.matchedTransactions / stats.totalTransactions) * 100).toFixed(1)
        : 0;

    const renderPendingItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardIconBox}>
                    <Ionicons name="time" size={16} color="#f59e0b" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.merchant || 'Transaction'}</Text>
                    <Text style={styles.cardCategory}>{item.category || 'General'}</Text>
                </View>
                <View style={styles.cardRight}>
                    <Text style={styles.cardAmount}>₹{(item.amount || 0).toFixed(2)}</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.status || 'pending'}</Text>
                    </View>
                </View>
            </View>
            <Text style={styles.cardDate}>{item.date ? new Date(item.date).toLocaleDateString() : ''}</Text>
        </View>
    );

    return (
        <FlatList
            style={styles.container}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            data={pendingTxns}
            keyExtractor={(item, i) => item._id || String(i)}
            renderItem={renderPendingItem}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
            }
            initialNumToRender={10}
            ListHeaderComponent={
                <View>
                    {/* Header */}
                    <Text style={styles.title}>Reconciliation</Text>
                    <Text style={styles.subtitle}>Bank statement audit and automatic ledger matching</Text>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>TOTAL ENTRIES</Text>
                            <Text style={styles.statValue}>{stats.totalTransactions || 0}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={[styles.statLabel, { color: '#34d399' }]}>MATCHED</Text>
                            <Text style={[styles.statValue, { color: '#34d399' }]}>{stats.matchedTransactions || 0}</Text>
                            <Text style={styles.statSub}>{matchRate}% match rate</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={[styles.statLabel, { color: '#f59e0b' }]}>PENDING</Text>
                            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.pendingTransactions || 0}</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statLabel}>TOTAL AUDITED</Text>
                            <Text style={styles.statValue}>₹{(stats.totalAmount || 0).toFixed(0)}</Text>
                        </View>
                    </View>

                    {/* Upload Card */}
                    <View style={styles.uploadCard}>
                        <View style={styles.uploadIconCircle}>
                            <Ionicons name="cloud-upload" size={24} color="#818cf8" />
                        </View>
                        <Text style={styles.uploadTitle}>Import Bank Statement</Text>
                        <Text style={styles.uploadSubtitle}>
                            Select a CSV or PDF statement to auto-match against recorded transactions
                        </Text>
                        <TouchableOpacity
                            style={styles.uploadBtn}
                            onPress={handlePickAndUpload}
                            disabled={uploading}
                            activeOpacity={0.8}
                        >
                            {uploading ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <ActivityIndicator color="#fff" size="small" />
                                    <Text style={styles.uploadBtnText}>Analyzing Statement...</Text>
                                </View>
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="document-attach" size={18} color="#fff" />
                                    <Text style={styles.uploadBtnText}>Choose CSV / PDF File</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Breakdown */}
                    {stats.categoryBreakdown && stats.categoryBreakdown.length > 0 && (
                        <View style={styles.categoryCard}>
                            <Text style={styles.sectionHeading}>Spending by Category</Text>
                            {stats.categoryBreakdown.map((cat, idx) => {
                                const percentage = stats.totalAmount > 0 ? (cat.total / stats.totalAmount) * 100 : 0;
                                return (
                                    <View key={idx} style={styles.catItem}>
                                        <View style={styles.catHeader}>
                                            <Text style={styles.catName}>{cat._id || 'Uncategorized'}</Text>
                                            <Text style={styles.catAmount}>₹{(cat.total || 0).toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.progressBarBg}>
                                            <View style={[styles.progressBarFill, { width: `${Math.min(percentage, 100)}%` }]} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    <Text style={[styles.sectionHeading, { marginTop: 18, marginBottom: 8 }]}>
                        Pending Verification ({pendingTxns.length})
                    </Text>
                </View>
            }
            ListEmptyComponent={
                loading ? (
                    <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 20 }} />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="checkmark-circle-outline" size={42} color="#34d399" />
                        <Text style={styles.empty}>All entries verified and matched</Text>
                    </View>
                )
            }
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090a0f' },
    title: { fontSize: 24, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.5, paddingTop: 14 },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 2, marginBottom: 14 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    statCard: {
        width: '48.5%', backgroundColor: '#12141c', borderRadius: 16,
        padding: 14, borderWidth: 1, borderColor: '#1e2230',
    },
    statLabel: { color: '#64748b', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
    statValue: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginTop: 4 },
    statSub: { color: '#34d399', fontSize: 11, fontWeight: '600', marginTop: 2 },
    uploadCard: {
        backgroundColor: '#12141c', borderRadius: 20, padding: 20,
        alignItems: 'center', borderWidth: 1, borderColor: '#1e2230', marginBottom: 14,
    },
    uploadIconCircle: {
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: '#1e2230', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    uploadTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
    uploadSubtitle: { color: '#64748b', fontSize: 12, textAlign: 'center', marginVertical: 8, paddingHorizontal: 10 },
    uploadBtn: {
        backgroundColor: '#4f46e5', paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: 12, marginTop: 6,
    },
    uploadBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    categoryCard: {
        backgroundColor: '#12141c', borderRadius: 18, padding: 16,
        borderWidth: 1, borderColor: '#1e2230',
    },
    sectionHeading: { color: '#f8fafc', fontSize: 15, fontWeight: '700', marginBottom: 10 },
    catItem: { marginBottom: 10 },
    catHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    catName: { color: '#94a3b8', fontSize: 13 },
    catAmount: { color: '#f8fafc', fontWeight: '700', fontSize: 13 },
    progressBarBg: { height: 5, backgroundColor: '#090a0f', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#4f46e5', borderRadius: 3 },
    card: {
        backgroundColor: '#12141c', borderRadius: 16, padding: 14,
        marginBottom: 8, borderWidth: 1, borderColor: '#1e2230',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    cardIconBox: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: '#1e2230', justifyContent: 'center', alignItems: 'center',
    },
    cardName: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
    cardCategory: { color: '#64748b', fontSize: 12, marginTop: 1 },
    cardRight: { alignItems: 'flex-end' },
    cardAmount: { color: '#f8fafc', fontWeight: '700', fontSize: 14 },
    badge: {
        backgroundColor: '#1e2230', paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: 5, marginTop: 4,
    },
    badgeText: { color: '#f59e0b', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
    cardDate: { color: '#64748b', fontSize: 11, marginTop: 4 },
    emptyContainer: { alignItems: 'center', marginTop: 30, paddingBottom: 20 },
    empty: { color: '#64748b', fontSize: 14, fontWeight: '600', marginTop: 8 },
});
