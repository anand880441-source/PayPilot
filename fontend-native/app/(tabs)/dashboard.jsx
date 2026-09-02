import React, { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, ActivityIndicator, Dimensions, RefreshControl, TouchableOpacity
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import api from '../../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function DashboardScreen() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [charts, setCharts] = useState(null);
    const [recentTxns, setRecentTxns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [hideBalance, setHideBalance] = useState(false);

    const fetchAll = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const [statsRes, chartsRes, txnRes] = await Promise.all([
                api.get('/dashboard/stats'),
                api.get('/dashboard/charts'),
                api.get('/transactions?limit=6'),
            ]);
            setStats(statsRes.data?.data || null);
            setCharts(chartsRes.data?.data || null);
            setRecentTxns(txnRes.data?.data || []);
        } catch (e) {
            console.error('Dashboard fetch failed', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchAll();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchAll(true);
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    const spendingTrend = charts?.spendingTrend || [];
    const chartLabels = spendingTrend.length > 0 ? spendingTrend.map(s => s.month) : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const chartValues = spendingTrend.length > 0 ? spendingTrend.map(s => s.amount || 0) : [0, 0, 0, 0, 0, 0];
    const safeValues = chartValues.every(v => v === 0) ? [1] : chartValues;
    const safeLabels = chartValues.every(v => v === 0) ? ['No data'] : chartLabels;

    const firstName = user?.fullName?.split(' ')[0] || user?.name?.split(' ')[0] || 'User';

    return (
        <ScrollView 
            style={styles.container} 
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
            }
            showsVerticalScrollIndicator={false}
        >
            {/* Top Navigation Bar */}
            <View style={styles.topBar}>
                <View style={styles.userInfo}>
                    <Text style={styles.greeting}>OVERVIEW</Text>
                    <Text style={styles.userName}>{firstName}</Text>
                </View>
                <View style={styles.topBarActions}>
                    <TouchableOpacity 
                        style={styles.iconButton}
                        onPress={() => router.push('/screens/Profile')}
                    >
                        <Ionicons name="person-circle-outline" size={26} color="#94a3b8" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Master Financial Card */}
            <View style={styles.masterCard}>
                <View style={styles.masterHeader}>
                    <Text style={styles.masterLabel}>TOTAL EXPENDITURE</Text>
                    <TouchableOpacity onPress={() => setHideBalance(!hideBalance)} style={styles.eyeBtn}>
                        <Ionicons 
                            name={hideBalance ? 'eye-off-outline' : 'eye-outline'} 
                            size={16} 
                            color="#a5b4fc" 
                        />
                    </TouchableOpacity>
                </View>

                <Text style={styles.masterAmount}>
                    {hideBalance ? '••••••••' : `₹${(stats?.totalSpend || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </Text>

                <View style={styles.cardStatsRow}>
                    <View style={styles.statCol}>
                        <Text style={styles.statColLabel}>MONTHLY SAVINGS</Text>
                        <Text style={styles.statColVal}>₹{(stats?.monthlySavings || 0).toFixed(2)}</Text>
                    </View>
                    <View style={styles.colDivider} />
                    <View style={styles.statCol}>
                        <Text style={styles.statColLabel}>UPCOMING RENEWALS</Text>
                        <Text style={[styles.statColVal, { color: stats?.upcomingRenewals > 0 ? '#fde68a' : '#fff' }]}>
                            {stats?.upcomingRenewals || 0}
                        </Text>
                    </View>
                </View>

                {/* Quick Action Navigation Pills */}
                <View style={styles.quickActionsRow}>
                    <TouchableOpacity 
                        style={styles.actionPill}
                        onPress={() => router.push('/screens/Subscriptions')}
                    >
                        <Ionicons name="card-outline" size={16} color="#fff" />
                        <Text style={styles.actionPillText}>Subscriptions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.actionPill}
                        onPress={() => router.push('/screens/Reconciliation')}
                    >
                        <Ionicons name="git-merge-outline" size={16} color="#fff" />
                        <Text style={styles.actionPillText}>Reconcile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.actionPill}
                        onPress={() => router.push('/(tabs)/wallets')}
                    >
                        <Ionicons name="wallet-outline" size={16} color="#fff" />
                        <Text style={styles.actionPillText}>Wallets</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Metrics Triplet */}
            <View style={styles.metricsRow}>
                <TouchableOpacity 
                    style={styles.metricCard} 
                    onPress={() => router.push('/screens/Subscriptions')}
                    activeOpacity={0.7}
                >
                    <View style={[styles.metricIcon, { backgroundColor: '#312e81' }]}>
                        <Ionicons name="repeat" size={16} color="#a78bfa" />
                    </View>
                    <Text style={styles.metricValue}>{stats?.activeSubscriptions || 0}</Text>
                    <Text style={styles.metricLabel}>Active Subs</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.metricCard} 
                    onPress={() => router.push('/(tabs)/rewards')}
                    activeOpacity={0.7}
                >
                    <View style={[styles.metricIcon, { backgroundColor: '#422006' }]}>
                        <Ionicons name="star" size={16} color="#f59e0b" />
                    </View>
                    <Text style={styles.metricValue}>{(stats?.rewardsEarned || 0).toFixed(0)}</Text>
                    <Text style={styles.metricLabel}>Reward Pts</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.metricCard} 
                    onPress={() => router.push('/screens/Statements')}
                    activeOpacity={0.7}
                >
                    <View style={[styles.metricIcon, { backgroundColor: '#064e3b' }]}>
                        <Ionicons name="document-text" size={16} color="#34d399" />
                    </View>
                    <Text style={styles.metricValue}>{stats?.pendingReconciliation || 0}</Text>
                    <Text style={styles.metricLabel}>Pending Audit</Text>
                </TouchableOpacity>
            </View>

            {/* Spending Trend Line Chart */}
            <View style={styles.chartContainer}>
                <View style={styles.chartHeaderRow}>
                    <Text style={styles.sectionHeader}>Spending Velocity</Text>
                    <Text style={styles.chartTag}>6-Month Trend</Text>
                </View>

                <LineChart
                    data={{ labels: safeLabels, datasets: [{ data: safeValues }] }}
                    width={SCREEN_WIDTH - 32}
                    height={180}
                    chartConfig={{
                        backgroundColor: '#12141c',
                        backgroundGradientFrom: '#12141c',
                        backgroundGradientTo: '#12141c',
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                        labelColor: () => '#64748b',
                        propsForDots: { r: '4', strokeWidth: '2', stroke: '#6366f1' },
                        propsForBackgroundLines: { stroke: '#1e2230', strokeDasharray: '' }
                    }}
                    bezier
                    style={styles.chart}
                />
            </View>

            {/* Category Breakdown */}
            {charts?.categoryBreakdown?.length > 0 && (
                <View style={styles.categorySection}>
                    <Text style={styles.sectionHeader}>Category Distribution</Text>
                    {charts.categoryBreakdown.slice(0, 4).map((cat, i) => {
                        const total = charts.categoryBreakdown.reduce((s, c) => s + (c.total || 0), 0);
                        const pct = total > 0 ? (cat.total / total) * 100 : 0;
                        return (
                            <View key={i} style={styles.catItem}>
                                <View style={styles.catInfoRow}>
                                    <Text style={styles.catName}>{cat._id || 'General'}</Text>
                                    <Text style={styles.catVal}>₹{(cat.total || 0).toFixed(2)}</Text>
                                </View>
                                <View style={styles.progressBg}>
                                    <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` }]} />
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Recent Activity */}
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeader}>Recent Activity</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
                    <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
            </View>

            {recentTxns.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="receipt-outline" size={32} color="#334155" />
                    <Text style={styles.emptyText}>No recent transactions recorded</Text>
                </View>
            ) : (
                recentTxns.map((txn, i) => {
                    const isCredit = txn.type === 'credit';
                    return (
                        <View key={txn._id || i} style={styles.txnRow}>
                            <View style={[styles.txnAvatar, { backgroundColor: isCredit ? '#064e3b33' : '#1e2230' }]}>
                                <Ionicons
                                    name={isCredit ? 'arrow-down' : 'arrow-up'}
                                    size={16}
                                    color={isCredit ? '#34d399' : '#f87171'}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.txnMerchant} numberOfLines={1}>
                                    {txn.merchant || txn.description || 'Transaction'}
                                </Text>
                                <Text style={styles.txnMeta}>
                                    {txn.date ? new Date(txn.date).toLocaleDateString() : ''} • {txn.category || 'Expense'}
                                </Text>
                            </View>
                            <Text style={[styles.txnAmount, { color: isCredit ? '#34d399' : '#f8fafc' }]}>
                                {isCredit ? '+' : '-'}₹{Math.abs(txn.amount || 0).toFixed(2)}
                            </Text>
                        </View>
                    );
                })
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090a0f', paddingHorizontal: 16 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090a0f' },
    topBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 54, paddingBottom: 16,
    },
    userInfo: { justifyContent: 'center' },
    greeting: { fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 0.8 },
    userName: { fontSize: 22, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.5, marginTop: 1 },
    topBarActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconButton: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: '#12141c', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#1e2230',
    },
    masterCard: {
        backgroundColor: '#4338ca', borderRadius: 24, padding: 22,
        marginBottom: 16, shadowColor: '#4338ca', shadowOpacity: 0.25, shadowRadius: 16, elevation: 6,
    },
    masterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    masterLabel: { fontSize: 10, fontWeight: '700', color: '#c7d2fe', letterSpacing: 0.8 },
    eyeBtn: { padding: 4 },
    masterAmount: { fontSize: 32, fontWeight: '800', color: '#ffffff', letterSpacing: -0.5, marginVertical: 6 },
    cardStatsRow: {
        flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.18)',
        borderRadius: 14, padding: 12, marginTop: 8, marginBottom: 16,
    },
    statCol: { flex: 1, alignItems: 'center' },
    statColLabel: { fontSize: 9, fontWeight: '700', color: '#c7d2fe', letterSpacing: 0.5 },
    statColVal: { fontSize: 15, fontWeight: '700', color: '#ffffff', marginTop: 3 },
    colDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
    quickActionsRow: { flexDirection: 'row', gap: 8 },
    actionPill: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.16)', paddingVertical: 10, borderRadius: 12,
    },
    actionPillText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
    metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    metricCard: {
        flex: 1, backgroundColor: '#12141c', borderRadius: 18,
        padding: 14, borderWidth: 1, borderColor: '#1e2230', alignItems: 'flex-start',
    },
    metricIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    metricValue: { fontSize: 18, fontWeight: '800', color: '#f8fafc' },
    metricLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 },
    chartContainer: {
        backgroundColor: '#12141c', borderRadius: 20, padding: 16,
        borderWidth: 1, borderColor: '#1e2230', marginBottom: 16,
    },
    chartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    sectionHeader: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
    chartTag: { fontSize: 11, fontWeight: '600', color: '#6366f1' },
    chart: { borderRadius: 14, marginVertical: 4 },
    categorySection: {
        backgroundColor: '#12141c', borderRadius: 20, padding: 16,
        borderWidth: 1, borderColor: '#1e2230', marginBottom: 16,
    },
    catItem: { marginTop: 12 },
    catInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    catName: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
    catVal: { color: '#f8fafc', fontSize: 13, fontWeight: '700' },
    progressBg: { height: 6, backgroundColor: '#090a0f', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#4f46e5', borderRadius: 3 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12 },
    viewAllText: { fontSize: 13, fontWeight: '700', color: '#818cf8' },
    txnRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#12141c', borderRadius: 16,
        padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#1e2230',
    },
    txnAvatar: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    txnMerchant: { fontSize: 14, fontWeight: '700', color: '#f8fafc' },
    txnMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
    txnAmount: { fontSize: 15, fontWeight: '700' },
    emptyState: { alignItems: 'center', paddingVertical: 24 },
    emptyText: { color: '#64748b', fontSize: 13, marginTop: 8 },
});