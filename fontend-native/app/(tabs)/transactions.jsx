import React, { useState, useCallback } from 'react';
import {
    View, Text, FlatList, TextInput,
    StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const FILTER_TABS = ['All', 'Expenses', 'Income', 'Pending'];

export default function TransactionsScreen() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');

    const fetchTransactions = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const res = await api.get('/transactions?limit=100');
            setTransactions(res.data?.data || []);
        } catch (e) {
            console.error('Failed to fetch transactions', e.message);
            setTransactions([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchTransactions();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchTransactions(true);
    };

    const filtered = (Array.isArray(transactions) ? transactions : []).filter(t => {
        const matchesSearch = (t.merchant || t.description || '').toLowerCase().includes(search.toLowerCase()) ||
                              (t.category || '').toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;

        if (activeFilter === 'Expenses') return t.type !== 'credit';
        if (activeFilter === 'Income') return t.type === 'credit';
        if (activeFilter === 'Pending') return t.status === 'pending';
        return true;
    });

    // Net stats
    const totalOut = transactions
        .filter(t => t.type !== 'credit')
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
    const totalIn = transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

    const renderItem = ({ item }) => {
        const isCredit = item.type === 'credit';
        return (
            <View style={styles.item}>
                <View style={[styles.iconBox, { backgroundColor: isCredit ? '#064e3b33' : '#1e2230' }]}>
                    <Ionicons
                        name={isCredit ? 'arrow-down' : 'arrow-up'}
                        size={16}
                        color={isCredit ? '#34d399' : '#f87171'}
                    />
                </View>
                <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.merchant || item.description || 'Transaction'}</Text>
                    <Text style={styles.itemCategory}>{item.category || 'General'} • {item.date ? new Date(item.date).toLocaleDateString() : ''}</Text>
                </View>
                <View style={styles.itemRight}>
                    <Text style={[styles.itemAmount, { color: isCredit ? '#34d399' : '#f8fafc' }]}>
                        {isCredit ? '+' : '-'}₹{Math.abs(item.amount || 0).toFixed(2)}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: item.status === 'reconciled' ? '#064e3b' : '#1e2230' }]}>
                        <Text style={[styles.statusText, { color: item.status === 'reconciled' ? '#34d399' : '#94a3b8' }]}>
                            {item.status || 'pending'}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Activity</Text>
                <Text style={styles.subtitle}>Full financial ledger and transaction audit</Text>
            </View>

            {/* Summary strip */}
            <View style={styles.summaryStrip}>
                <View style={styles.stripCol}>
                    <Text style={styles.stripLabel}>TOTAL SPENT</Text>
                    <Text style={styles.stripValOut}>-₹{totalOut.toFixed(2)}</Text>
                </View>
                <View style={styles.stripDivider} />
                <View style={styles.stripCol}>
                    <Text style={styles.stripLabel}>TOTAL CREDITS</Text>
                    <Text style={styles.stripValIn}>+₹{totalIn.toFixed(2)}</Text>
                </View>
            </View>

            {/* Search bar */}
            <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by merchant, category..."
                    placeholderTextColor="#64748b"
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={18} color="#64748b" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
                {FILTER_TABS.map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.filterChip, activeFilter === tab && styles.filterChipActive]}
                        onPress={() => setActiveFilter(tab)}
                    >
                        <Text style={[styles.filterChipText, activeFilter === tab && styles.filterChipTextActive]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item, i) => item._id || String(i)}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
                    }
                    initialNumToRender={12}
                    maxToRenderPerBatch={12}
                    windowSize={7}
                    removeClippedSubviews={true}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="receipt-outline" size={42} color="#334155" />
                            <Text style={styles.empty}>No transactions recorded</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090a0f' },
    header: { paddingHorizontal: 16, paddingTop: 54, paddingBottom: 10 },
    title: { fontSize: 24, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.5 },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
    summaryStrip: {
        flexDirection: 'row', backgroundColor: '#12141c',
        marginHorizontal: 16, marginVertical: 8, borderRadius: 16,
        padding: 14, borderWidth: 1, borderColor: '#1e2230',
    },
    stripCol: { flex: 1, alignItems: 'center' },
    stripLabel: { fontSize: 9, fontWeight: '700', color: '#64748b', letterSpacing: 0.8 },
    stripValOut: { fontSize: 15, fontWeight: '700', color: '#f87171', marginTop: 3 },
    stripValIn: { fontSize: 15, fontWeight: '700', color: '#34d399', marginTop: 3 },
    stripDivider: { width: 1, backgroundColor: '#1e2230' },
    searchBox: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#12141c', marginHorizontal: 16, marginBottom: 8,
        borderRadius: 14, paddingHorizontal: 14, height: 46,
        borderWidth: 1, borderColor: '#1e2230',
    },
    searchInput: { flex: 1, color: '#f8fafc', fontSize: 14 },
    filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 12 },
    filterChip: {
        flex: 1, paddingVertical: 8,
        borderRadius: 12, backgroundColor: '#12141c',
        alignItems: 'center', borderWidth: 1, borderColor: '#1e2230',
    },
    filterChipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
    filterChipText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
    filterChipTextActive: { color: '#ffffff', fontWeight: '700' },
    item: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#12141c', borderRadius: 16,
        padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#1e2230',
    },
    iconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    itemInfo: { flex: 1 },
    itemName: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
    itemCategory: { color: '#64748b', fontSize: 12, marginTop: 2 },
    itemRight: { alignItems: 'flex-end' },
    itemAmount: { fontSize: 15, fontWeight: '700' },
    statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
    statusText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
    emptyContainer: { alignItems: 'center', marginTop: 60 },
    empty: { color: '#64748b', fontSize: 14, fontWeight: '600', marginTop: 10 },
});
