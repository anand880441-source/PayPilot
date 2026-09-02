import React, { useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, ActivityIndicator,
    TouchableOpacity, RefreshControl, Alert, Share
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const STATUS_FILTERS = ['All', 'Parsed', 'Pending'];

export default function StatementsScreen() {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({
        totalUploaded: 0,
        recentUploads: 0,
        pendingReview: 0,
        matchAccuracy: '0%',
        detectedSubscriptions: 0
    });
    const [preview, setPreview] = useState({
        recentEntries: [],
        totalEntries: 0,
        matchedEntries: 0,
        pendingEntries: 0
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [filterStatus, setFilterStatus] = useState('All');

    const fetchAllData = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const [historyRes, statsRes, previewRes] = await Promise.all([
                api.get('/statements/history'),
                api.get('/statements/stats'),
                api.get('/statements/preview')
            ]);
            setHistory(historyRes.data?.data || []);
            if (statsRes.data?.data) setStats(statsRes.data.data);
            if (previewRes.data?.data) setPreview(previewRes.data.data);
        } catch (e) {
            console.error('Failed to fetch statements data', e.message);
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
                    'Document Processed',
                    `Parsed ${res.data.transactionsCount || 0} entries successfully.`
                );
                fetchAllData(true);
            }
        } catch (e) {
            Alert.alert('Upload Error', e.response?.data?.message || 'Failed to upload statement');
        } finally {
            setUploading(false);
        }
    };

    const handleExport = async () => {
        if (history.length === 0) {
            Alert.alert('Notice', 'No statement data available to export.');
            return;
        }

        const csvHeaders = 'Upload Date,File Name,Entries,Total Amount,Status\n';
        const csvRows = history.map(item =>
            `"${item.date || ''}","${item.fileName || ''}",${item.entries || 0},${(item.totalAmount || 0).toFixed(2)},"${item.status || 'Parsed'}"`
        ).join('\n');

        try {
            await Share.share({
                title: 'Statements Audit Report',
                message: csvHeaders + csvRows
            });
        } catch (error) {
            console.error('Share error:', error);
        }
    };

    const filteredHistory = history.filter(item => {
        if (filterStatus === 'All') return true;
        return item.status?.toLowerCase() === filterStatus.toLowerCase();
    });

    const renderHistoryItem = ({ item }) => {
        const isPdf = item.type === 'pdf' || item.fileName?.toLowerCase().endsWith('.pdf');
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconBox, { backgroundColor: isPdf ? '#7f1d1d22' : '#1e3a5f22' }]}>
                        <Ionicons
                            name={isPdf ? 'document-text' : 'grid'}
                            size={18}
                            color={isPdf ? '#f87171' : '#60a5fa'}
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.fileName} numberOfLines={1}>{item.fileName || 'Statement.csv'}</Text>
                        <Text style={styles.fileSub}>
                            {item.entries || 0} entries • ₹{(item.totalAmount || 0).toFixed(2)}
                        </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: item.status === 'Parsed' ? '#064e3b' : '#1e2230' }]}>
                        <Text style={[styles.statusText, { color: item.status === 'Parsed' ? '#34d399' : '#f59e0b' }]}>
                            {item.status || 'Parsed'}
                        </Text>
                    </View>
                </View>
                <View style={styles.cardFooter}>
                    <Text style={styles.dateText}>{item.date || ''}</Text>
                    <Text style={styles.accountText}>{item.account || 'Bank Statement'}</Text>
                </View>
            </View>
        );
    };

    return (
        <FlatList
            style={styles.container}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            data={filteredHistory}
            keyExtractor={(item, i) => item._id || String(i)}
            renderItem={renderHistoryItem}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
            }
            initialNumToRender={10}
            ListHeaderComponent={
                <View>
                    {/* Header */}
                    <View style={styles.titleRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>Statements</Text>
                            <Text style={styles.subtitle}>Historical imports and data archives</Text>
                        </View>
                        <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
                            <Ionicons name="download-outline" size={16} color="#cbd5e1" />
                            <Text style={styles.exportBtnText}>Export</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>UPLOADED</Text>
                            <Text style={styles.statVal}>{stats.totalUploaded || history.length}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>ACCURACY</Text>
                            <Text style={[styles.statVal, { color: '#34d399' }]}>{stats.matchAccuracy || '99.8%'}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>PENDING</Text>
                            <Text style={[styles.statVal, { color: '#f59e0b' }]}>{stats.pendingReview || 0}</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>DETECTED</Text>
                            <Text style={[styles.statVal, { color: '#818cf8' }]}>{stats.detectedSubscriptions || 0}</Text>
                        </View>
                    </View>

                    {/* Upload CTA */}
                    <TouchableOpacity
                        style={styles.uploadActionCard}
                        onPress={handlePickAndUpload}
                        disabled={uploading}
                    >
                        <View style={styles.uploadActionIcon}>
                            <Ionicons name="cloud-upload" size={20} color="#fff" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.uploadActionTitle}>
                                {uploading ? 'Processing File...' : 'Upload New Statement'}
                            </Text>
                            <Text style={styles.uploadActionSub}>Import CSV or PDF bank statement</Text>
                        </View>
                        {uploading ? (
                            <ActivityIndicator color="#818cf8" size="small" />
                        ) : (
                            <Ionicons name="add" size={20} color="#818cf8" />
                        )}
                    </TouchableOpacity>

                    {/* Data Preview Box */}
                    {preview.recentEntries && preview.recentEntries.length > 0 && (
                        <View style={styles.previewCard}>
                            <View style={styles.previewHeader}>
                                <Text style={styles.previewTitle}>Live Data Sample</Text>
                                <Ionicons name="shield-checkmark" size={16} color="#34d399" />
                            </View>
                            {preview.recentEntries.slice(0, 3).map((entry, idx) => (
                                <View key={idx} style={styles.previewRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.previewMerchant} numberOfLines={1}>{entry.merchant}</Text>
                                        <Text style={styles.previewDate}>
                                            {entry.date ? new Date(entry.date).toLocaleDateString() : ''} • {entry.category || 'General'}
                                        </Text>
                                    </View>
                                    <Text style={[styles.previewAmount, { color: entry.amount < 0 ? '#34d399' : '#f87171' }]}>
                                        {entry.amount < 0 ? '+' : '-'}₹{Math.abs(entry.amount || 0).toFixed(2)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* History Header */}
                    <View style={styles.historyHeader}>
                        <Text style={styles.sectionHeading}>Import Archives ({filteredHistory.length})</Text>
                        <View style={styles.filterChipRow}>
                            {STATUS_FILTERS.map(tab => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.filterChip, filterStatus === tab && styles.filterChipActive]}
                                    onPress={() => setFilterStatus(tab)}
                                >
                                    <Text style={[styles.filterChipText, filterStatus === tab && styles.filterChipTextActive]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            }
            ListEmptyComponent={
                loading ? (
                    <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 20 }} />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={42} color="#334155" />
                        <Text style={styles.empty}>No statements imported yet</Text>
                    </View>
                )
            }
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090a0f' },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginBottom: 12 },
    title: { fontSize: 24, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.5 },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
    exportBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#12141c', paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 10, borderWidth: 1, borderColor: '#1e2230',
    },
    exportBtnText: { color: '#cbd5e1', fontSize: 12, fontWeight: '600' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    statBox: {
        width: '48.5%', backgroundColor: '#12141c', borderRadius: 14,
        padding: 12, borderWidth: 1, borderColor: '#1e2230',
    },
    statLabel: { color: '#64748b', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
    statVal: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginTop: 3 },
    uploadActionCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#12141c', padding: 14, borderRadius: 16,
        borderWidth: 1, borderColor: '#1e2230', marginBottom: 12,
    },
    uploadActionIcon: {
        width: 38, height: 38, borderRadius: 12,
        backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center',
    },
    uploadActionTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
    uploadActionSub: { color: '#64748b', fontSize: 11, marginTop: 2 },
    previewCard: {
        backgroundColor: '#12141c', borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: '#1e2230', marginBottom: 12,
    },
    previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    previewTitle: { color: '#f8fafc', fontSize: 13, fontWeight: '700' },
    previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e2230' },
    previewMerchant: { color: '#f8fafc', fontSize: 13, fontWeight: '600' },
    previewDate: { color: '#64748b', fontSize: 11, marginTop: 2 },
    previewAmount: { fontWeight: '700', fontSize: 13 },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 10 },
    sectionHeading: { color: '#f8fafc', fontSize: 15, fontWeight: '700' },
    filterChipRow: { flexDirection: 'row', gap: 4 },
    filterChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#12141c' },
    filterChipActive: { backgroundColor: '#4f46e5' },
    filterChipText: { color: '#64748b', fontSize: 11, fontWeight: '500' },
    filterChipTextActive: { color: '#fff', fontWeight: '700' },
    card: {
        backgroundColor: '#12141c', borderRadius: 16, padding: 14,
        marginBottom: 8, borderWidth: 1, borderColor: '#1e2230',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    fileName: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
    fileSub: { color: '#64748b', fontSize: 11, marginTop: 2 },
    statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
    statusText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#1e2230' },
    dateText: { color: '#64748b', fontSize: 11 },
    accountText: { color: '#818cf8', fontSize: 11 },
    emptyContainer: { alignItems: 'center', marginTop: 30, paddingBottom: 20 },
    empty: { color: '#64748b', fontSize: 14, fontWeight: '600', marginTop: 8 },
});
