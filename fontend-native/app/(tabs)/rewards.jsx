import React, { useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, ActivityIndicator,
    TouchableOpacity, RefreshControl, Dimensions, Alert
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const FILTER_TABS = ['All', 'Points', 'Cashback', 'Redeemed'];

export default function RewardsScreen() {
    const [rewards, setRewards] = useState([]);
    const [summary, setSummary] = useState({ totalPoints: 0, totalCashback: 0, pendingAmount: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('All');
    const [chartPeriod, setChartPeriod] = useState('6months');

    const fetchRewards = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const res = await api.get('/rewards');
            setRewards(res.data?.data || []);
            setSummary(res.data?.summary || { totalPoints: 0, totalCashback: 0, pendingAmount: 0 });
        } catch (e) {
            console.error('Failed to fetch rewards', e.message);
            setRewards([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchRewards();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchRewards(true);
    };

    const handleRedeem = async (rewardId) => {
        try {
            const res = await api.put(`/rewards/${rewardId}`, {
                status: 'redeemed',
                redemptionMethod: 'manual'
            });
            if (res.data?.success) {
                Alert.alert('Redeemed', 'Reward cleared and added to your portfolio.');
                fetchRewards(true);
            }
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to redeem reward');
        }
    };

    const handleBulkRedeem = () => {
        const readyRewards = rewards.filter(r => r.status === 'credited' && (r.pointsEarned > 0 || r.cashbackAmount > 0));
        if (readyRewards.length === 0) {
            Alert.alert('Notice', 'No rewards currently available for redemption.');
            return;
        }

        Alert.alert(
            'Redeem All',
            `Redeem ${readyRewards.length} reward(s) worth ${summary.totalPoints.toLocaleString()} pts and ₹${summary.totalCashback.toFixed(2)}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Redeem All',
                    onPress: async () => {
                        try {
                            for (const reward of readyRewards) {
                                await api.put(`/rewards/${reward._id}`, {
                                    status: 'redeemed',
                                    redemptionMethod: 'bulk'
                                });
                            }
                            fetchRewards(true);
                        } catch (_e) {
                            Alert.alert('Error', 'Failed to redeem all rewards');
                        }
                    }
                }
            ]
        );
    };

    const filtered = (Array.isArray(rewards) ? rewards : []).filter(r => {
        if (activeTab === 'Points') return r.rewardType === 'points' && r.status !== 'redeemed';
        if (activeTab === 'Cashback') return r.rewardType === 'cashback' && r.status !== 'redeemed';
        if (activeTab === 'Redeemed') return r.status === 'redeemed';
        return true;
    });

    const statusColor = (status) => {
        if (status === 'credited') return '#34d399';
        if (status === 'redeemed') return '#818cf8';
        return '#f59e0b';
    };

    const sourceRewards = [
        {
            name: 'American Express',
            type: 'Platinum Business',
            amount: `${Math.floor(summary.totalPoints * 0.4).toLocaleString()} pts`,
            status: summary.totalPoints > 0 ? 'Ready' : 'Pending',
            icon: 'card',
            color: '#006FCF',
            rewardId: rewards.find(r => r.sourceName?.includes('American Express') && r.status === 'credited')?._id
        },
        {
            name: 'Chase Ultimate',
            type: 'Sapphire Reserve',
            amount: `${Math.floor(summary.totalPoints * 0.2).toLocaleString()} pts`,
            status: summary.totalPoints > 0 ? 'Ready' : 'Pending',
            icon: 'shield',
            color: '#117ACA',
            rewardId: rewards.find(r => r.sourceName?.includes('Chase') && r.status === 'credited')?._id
        },
        {
            name: 'PayPilot Cashback',
            type: 'Platform Cashback',
            amount: `₹${summary.totalCashback.toFixed(2)}`,
            status: summary.totalCashback > 0 ? 'Ready' : 'Pending',
            icon: 'wallet',
            color: '#4f46e5',
            rewardId: rewards.find(r => r.rewardType === 'cashback' && r.status === 'credited')?._id
        }
    ];

    const chartLabels = chartPeriod === '6months'
        ? ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']
        : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const chartValues = chartPeriod === '6months'
        ? [50, 65, 75, 85, 90, 100]
        : [35, 45, 50, 65, 75, 85, 90, 100, 95, 85, 90, 110];

    const renderRewardItem = ({ item }) => (
        <View style={styles.item}>
            <View style={[styles.iconBox, { backgroundColor: item.rewardType === 'cashback' ? '#064e3b33' : '#1e2230' }]}>
                <Ionicons
                    name={item.rewardType === 'cashback' ? 'cash-outline' : 'sparkles-outline'}
                    size={18}
                    color={item.rewardType === 'cashback' ? '#34d399' : '#818cf8'}
                />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>{item.sourceName || 'Reward'}</Text>
                <Text style={styles.itemSource}>{item.sourceType || 'Cashback'} • {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</Text>
            </View>
            <View style={styles.itemRight}>
                {item.rewardType === 'cashback'
                    ? <Text style={styles.cashbackText}>₹{(item.cashbackAmount || 0).toFixed(2)}</Text>
                    : <Text style={styles.pointsText}>+{item.pointsEarned || 0} pts</Text>
                }
                <View style={[styles.badge, { backgroundColor: statusColor(item.status) + '22' }]}>
                    <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>{item.status || 'pending'}</Text>
                </View>
                {item.status === 'credited' && (
                    <TouchableOpacity onPress={() => handleRedeem(item._id)}>
                        <Text style={styles.redeemActionText}>Redeem</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <FlatList
            style={styles.container}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            data={filtered}
            keyExtractor={(item, i) => item._id || String(i)}
            renderItem={renderRewardItem}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
            }
            initialNumToRender={8}
            ListHeaderComponent={
                <View>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>Rewards</Text>
                            <Text style={styles.subtitle}>Loyalty point values and cashback ledger</Text>
                        </View>
                        <TouchableOpacity style={styles.redeemBtn} onPress={handleBulkRedeem}>
                            <Text style={styles.redeemBtnText}>Redeem All</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Summary Bento Grid */}
                    <View style={styles.summaryRow}>
                        <View style={[styles.summaryCard, { backgroundColor: '#12141c' }]}>
                            <Text style={styles.summaryLabel}>TOTAL POINTS</Text>
                            <Text style={styles.summaryValue}>{summary.totalPoints.toLocaleString()}</Text>
                        </View>
                        <View style={[styles.summaryCard, { backgroundColor: '#12141c' }]}>
                            <Text style={styles.summaryLabel}>CASHBACK</Text>
                            <Text style={[styles.summaryValue, { color: '#34d399' }]}>₹{summary.totalCashback.toFixed(2)}</Text>
                        </View>
                        <View style={[styles.summaryCard, { backgroundColor: '#12141c' }]}>
                            <Text style={styles.summaryLabel}>PROCESSING</Text>
                            <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>₹{summary.pendingAmount.toFixed(2)}</Text>
                        </View>
                    </View>

                    {/* Chart Container */}
                    <View style={styles.chartCard}>
                        <View style={styles.chartHeader}>
                            <Text style={styles.chartTitle}>Earnings Trajectory</Text>
                            <View style={styles.periodSwitcher}>
                                <TouchableOpacity 
                                    style={[styles.periodBtn, chartPeriod === '6months' && styles.periodBtnActive]}
                                    onPress={() => setChartPeriod('6months')}
                                >
                                    <Text style={[styles.periodBtnText, chartPeriod === '6months' && styles.periodBtnTextActive]}>6M</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.periodBtn, chartPeriod === '1year' && styles.periodBtnActive]}
                                    onPress={() => setChartPeriod('1year')}
                                >
                                    <Text style={[styles.periodBtnText, chartPeriod === '1year' && styles.periodBtnTextActive]}>1Y</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <LineChart
                            data={{ labels: chartLabels, datasets: [{ data: chartValues }] }}
                            width={SCREEN_WIDTH - 64}
                            height={150}
                            chartConfig={{
                                backgroundColor: '#12141c',
                                backgroundGradientFrom: '#12141c',
                                backgroundGradientTo: '#12141c',
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                                labelColor: () => '#64748b',
                                propsForDots: { r: '3', strokeWidth: '2', stroke: '#6366f1' },
                                propsForBackgroundLines: { stroke: '#1e2230', strokeDasharray: '' }
                            }}
                            bezier
                            style={{ borderRadius: 12 }}
                        />
                    </View>

                    {/* Sources */}
                    <Text style={styles.sectionHeading}>Reward Sources</Text>
                    <View style={{ gap: 8, marginBottom: 16 }}>
                        {sourceRewards.map((source, idx) => (
                            <View key={idx} style={styles.sourceCard}>
                                <View style={[styles.sourceIcon, { backgroundColor: source.color }]}>
                                    <Ionicons name={source.icon} size={16} color="#fff" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.sourceName}>{source.name}</Text>
                                    <Text style={styles.sourceType}>{source.type}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.sourceAmount}>{source.amount}</Text>
                                    {source.rewardId ? (
                                        <TouchableOpacity onPress={() => handleRedeem(source.rewardId)}>
                                            <Text style={styles.sourceRedeemText}>Redeem</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <Text style={styles.sourcePendingText}>{source.status}</Text>
                                    )}
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Filter Tabs */}
                    <View style={styles.tabsRow}>
                        {FILTER_TABS.map(tab => (
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
                </View>
            }
            ListEmptyComponent={
                loading ? (
                    <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 20 }} />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="sparkles-outline" size={42} color="#334155" />
                        <Text style={styles.empty}>No rewards in this category</Text>
                    </View>
                )
            }
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090a0f' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 54, paddingBottom: 12 },
    title: { fontSize: 24, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.5 },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
    redeemBtn: {
        backgroundColor: '#4f46e5', paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 12,
    },
    redeemBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    summaryCard: {
        flex: 1, borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: '#1e2230',
    },
    summaryLabel: { color: '#64748b', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
    summaryValue: { color: '#f8fafc', fontSize: 16, fontWeight: '800', marginTop: 4 },
    chartCard: {
        backgroundColor: '#12141c', borderRadius: 20, padding: 16,
        borderWidth: 1, borderColor: '#1e2230', marginBottom: 16,
    },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    chartTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
    periodSwitcher: { flexDirection: 'row', backgroundColor: '#090a0f', borderRadius: 8, padding: 2 },
    periodBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    periodBtnActive: { backgroundColor: '#4f46e5' },
    periodBtnText: { color: '#64748b', fontSize: 11, fontWeight: '600' },
    periodBtnTextActive: { color: '#fff' },
    sectionHeading: { color: '#f8fafc', fontSize: 16, fontWeight: '700', marginBottom: 10 },
    sourceCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#12141c', padding: 14, borderRadius: 16,
        borderWidth: 1, borderColor: '#1e2230',
    },
    sourceIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    sourceName: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
    sourceType: { color: '#64748b', fontSize: 11, marginTop: 1 },
    sourceAmount: { color: '#f8fafc', fontWeight: '700', fontSize: 14 },
    sourceRedeemText: { color: '#818cf8', fontSize: 11, fontWeight: '700', marginTop: 2 },
    sourcePendingText: { color: '#f59e0b', fontSize: 10, fontWeight: '600', marginTop: 2 },
    tabsRow: { flexDirection: 'row', gap: 6, marginTop: 8, marginBottom: 12 },
    tabChip: {
        flex: 1, paddingVertical: 8,
        borderRadius: 12, backgroundColor: '#12141c',
        alignItems: 'center', borderWidth: 1, borderColor: '#1e2230',
    },
    tabChipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
    tabChipText: { color: '#64748b', fontSize: 11, fontWeight: '600' },
    tabChipTextActive: { color: '#ffffff', fontWeight: '700' },
    item: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#12141c', borderRadius: 16,
        padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#1e2230',
    },
    iconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    itemName: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
    itemSource: { color: '#64748b', fontSize: 11, marginTop: 1 },
    itemRight: { alignItems: 'flex-end' },
    pointsText: { color: '#818cf8', fontWeight: '700', fontSize: 14 },
    cashbackText: { color: '#34d399', fontWeight: '700', fontSize: 14 },
    badge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
    badgeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
    redeemActionText: { color: '#818cf8', fontSize: 11, fontWeight: '700', marginTop: 4 },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    empty: { color: '#64748b', fontSize: 14, marginTop: 8 },
});
