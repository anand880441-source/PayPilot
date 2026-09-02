import React, { useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, ActivityIndicator,
    TouchableOpacity, RefreshControl, Modal, TextInput, Alert, ScrollView
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function WalletsScreen() {
    const [wallets, setWallets] = useState([]);
    const [totalBalance, setTotalBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [compareView, setCompareView] = useState(false);
    const [expandedWalletId, setExpandedWalletId] = useState(null);

    // Modal state for Add Wallet
    const [modalVisible, setModalVisible] = useState(false);
    const [walletName, setWalletName] = useState('');
    const [provider, setProvider] = useState('');
    const [balance, setBalance] = useState('');
    const [linkedCard, setLinkedCard] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchWallets = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const res = await api.get('/wallets');
            setWallets(res.data?.data || []);
            setTotalBalance(res.data?.totalBalance || 0);
        } catch (e) {
            console.error('Failed to fetch wallets', e.message);
            setWallets([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchWallets();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchWallets(true);
    };

    const handleCreateWallet = async () => {
        if (!walletName.trim() || !provider.trim()) {
            Alert.alert('Required', 'Please enter a wallet name and institution provider.');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/wallets', {
                walletName: walletName.trim(),
                provider: provider.trim(),
                balance: parseFloat(balance) || 0,
                linkedCard: linkedCard.trim()
            });
            setModalVisible(false);
            setWalletName('');
            setProvider('');
            setBalance('');
            setLinkedCard('');
            fetchWallets(true);
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to create wallet');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteWallet = (wallet) => {
        Alert.alert(
            'Remove Wallet',
            `Remove "${wallet.walletName || wallet.provider}" from your portfolio?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/wallets/${wallet._id}`);
                            fetchWallets(true);
                        } catch (e) {
                            Alert.alert('Error', e.response?.data?.message || 'Failed to delete wallet');
                        }
                    }
                }
            ]
        );
    };

    const toggleExpand = (id) => {
        setExpandedWalletId(expandedWalletId === id ? null : id);
    };

    const renderWallet = ({ item }) => {
        const isExpanded = expandedWalletId === item._id;

        if (viewMode === 'list') {
            return (
                <View style={styles.listCard}>
                    <TouchableOpacity 
                        style={styles.listCardMain}
                        onPress={() => toggleExpand(item._id)}
                    >
                        <View style={styles.cardIcon}>
                            <Ionicons name="card" size={18} color="#818cf8" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardName}>{item.walletName || item.provider}</Text>
                            <Text style={styles.cardProvider}>{item.provider || 'Digital Wallet'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
                            <Text style={styles.listBalance}>₹{(item.balance || 0).toFixed(2)}</Text>
                            <Text style={styles.listRewards}>{(item.rewardsBalance || 0).toFixed(0)} pts</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDeleteWallet(item)}>
                            <Ionicons name="trash-outline" size={18} color="#64748b" />
                        </TouchableOpacity>
                    </TouchableOpacity>
                    {isExpanded && (
                        <View style={styles.expandedInfo}>
                            <Text style={styles.expandedText}>Linked: {item.linkedCard || 'None'}</Text>
                            <Text style={styles.expandedText}>Status: {item.status || 'active'}</Text>
                        </View>
                    )}
                </View>
            );
        }

        // Apple Wallet Style Card
        return (
            <View style={styles.card}>
                <View style={styles.cardTopRow}>
                    <View style={styles.providerBadge}>
                        <Text style={styles.providerBadgeText}>{(item.provider || 'WALLET').toUpperCase()}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteWallet(item)} style={styles.trashBtn}>
                        <Ionicons name="ellipsis-horizontal" size={18} color="#64748b" />
                    </TouchableOpacity>
                </View>

                {/* EMV Chip Glyph & Card Name */}
                <View style={styles.cardMiddle}>
                    <View style={styles.chipGraphic}>
                        <View style={styles.chipLine} />
                    </View>
                    <Text style={styles.cardName} numberOfLines={1}>{item.walletName || item.provider}</Text>
                    <Text style={styles.maskedNumber}>
                        {item.linkedCard ? `•••• •••• •••• ${item.linkedCard.slice(-4)}` : 'DIGITAL LIQUIDITY ACCOUNT'}
                    </Text>
                </View>

                <View style={styles.cardBottomRow}>
                    <View>
                        <Text style={styles.cardBalanceLabel}>AVAILABLE BALANCE</Text>
                        <Text style={styles.cardBalance}>₹{(item.balance || 0).toFixed(2)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.cardBalanceLabel}>REWARDS</Text>
                        <Text style={styles.rewardsBalance}>
                            {(item.rewardsBalance || 0).toFixed(0)} pts
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <FlatList
            style={styles.container}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            data={wallets}
            keyExtractor={(item, i) => item._id || String(i)}
            renderItem={renderWallet}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
            }
            initialNumToRender={8}
            ListHeaderComponent={
                <View>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>Wallets</Text>
                            <Text style={styles.subtitle}>Liquidity and reward points across accounts</Text>
                        </View>
                        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                            <Ionicons name="add" size={18} color="#fff" />
                            <Text style={styles.addBtnText}>Add</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Master Liquidity Summary Banner */}
                    <View style={styles.totalCard}>
                        <Text style={styles.totalLabel}>PORTFOLIO LIQUIDITY</Text>
                        <Text style={styles.totalAmount}>₹{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                        <Text style={styles.walletCount}>{wallets.length} active connection{wallets.length !== 1 ? 's' : ''}</Text>
                    </View>

                    {/* Controls Bar */}
                    <View style={styles.toolbar}>
                        <View style={styles.viewModeGroup}>
                            <TouchableOpacity
                                style={[styles.viewModeBtn, viewMode === 'grid' && styles.viewModeBtnActive]}
                                onPress={() => setViewMode('grid')}
                            >
                                <Ionicons name="grid-outline" size={14} color={viewMode === 'grid' ? '#fff' : '#64748b'} />
                                <Text style={[styles.viewModeText, viewMode === 'grid' && styles.viewModeTextActive]}>Cards</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.viewModeBtn, viewMode === 'list' && styles.viewModeBtnActive]}
                                onPress={() => setViewMode('list')}
                            >
                                <Ionicons name="list-outline" size={14} color={viewMode === 'list' ? '#fff' : '#64748b'} />
                                <Text style={[styles.viewModeText, viewMode === 'list' && styles.viewModeTextActive]}>List</Text>
                            </TouchableOpacity>
                        </View>

                        {wallets.length >= 2 && (
                            <TouchableOpacity
                                style={[styles.compareBtn, compareView && styles.compareBtnActive]}
                                onPress={() => setCompareView(!compareView)}
                            >
                                <Ionicons name="git-compare-outline" size={14} color={compareView ? '#fff' : '#818cf8'} />
                                <Text style={[styles.compareText, compareView && styles.compareTextActive]}>
                                    Compare
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Compare View Table */}
                    {compareView && wallets.length >= 2 && (
                        <View style={styles.compareContainer}>
                            <Text style={styles.compareHeading}>Side-by-Side Comparison</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View>
                                    <View style={styles.compareRowHeader}>
                                        <Text style={[styles.compareCellHeader, { width: 90 }]}>METRIC</Text>
                                        {wallets.slice(0, 4).map(w => (
                                            <Text key={w._id} style={[styles.compareCellHeader, { width: 110, color: '#818cf8' }]}>
                                                {w.walletName || w.provider}
                                            </Text>
                                        ))}
                                    </View>
                                    <View style={styles.compareRow}>
                                        <Text style={[styles.compareCell, { width: 90, color: '#64748b' }]}>Balance</Text>
                                        {wallets.slice(0, 4).map(w => (
                                            <Text key={w._id} style={[styles.compareCell, { width: 110, fontWeight: '700' }]}>
                                                ₹{(w.balance || 0).toFixed(2)}
                                            </Text>
                                        ))}
                                    </View>
                                    <View style={styles.compareRow}>
                                        <Text style={[styles.compareCell, { width: 90, color: '#64748b' }]}>Rewards</Text>
                                        {wallets.slice(0, 4).map(w => (
                                            <Text key={w._id} style={[styles.compareCell, { width: 110, color: '#f59e0b' }]}>
                                                {(w.rewardsBalance || 0).toFixed(0)} pts
                                            </Text>
                                        ))}
                                    </View>
                                    <View style={styles.compareRow}>
                                        <Text style={[styles.compareCell, { width: 90, color: '#64748b' }]}>Provider</Text>
                                        {wallets.slice(0, 4).map(w => (
                                            <Text key={w._id} style={[styles.compareCell, { width: 110 }]}>
                                                {w.provider}
                                            </Text>
                                        ))}
                                    </View>
                                </View>
                            </ScrollView>
                        </View>
                    )}

                    <Text style={[styles.sectionHeading, { marginTop: 16, marginBottom: 10 }]}>
                        Connected Accounts ({wallets.length})
                    </Text>
                </View>
            }
            ListEmptyComponent={
                loading ? (
                    <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 20 }} />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="wallet-outline" size={42} color="#334155" />
                        <Text style={styles.empty}>No accounts connected yet</Text>
                        <TouchableOpacity style={styles.emptyBtn} onPress={() => setModalVisible(true)}>
                            <Text style={styles.emptyBtnText}>Connect Wallet</Text>
                        </TouchableOpacity>
                    </View>
                )
            }
            ListFooterComponent={
                <Modal
                    visible={modalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Connect Wallet</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>ACCOUNT / WALLET NAME</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. HDFC Salary, Amex Platinum"
                                placeholderTextColor="#475569"
                                value={walletName}
                                onChangeText={setWalletName}
                            />

                            <Text style={styles.label}>INSTITUTION / PROVIDER</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Chase, HDFC, Apple Pay"
                                placeholderTextColor="#475569"
                                value={provider}
                                onChangeText={setProvider}
                            />

                            <Text style={styles.label}>INITIAL BALANCE (₹)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                placeholderTextColor="#475569"
                                value={balance}
                                onChangeText={setBalance}
                                keyboardType="numeric"
                            />

                            <Text style={styles.label}>LAST 4 DIGITS (OPTIONAL)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="4242"
                                placeholderTextColor="#475569"
                                value={linkedCard}
                                onChangeText={setLinkedCard}
                                maxLength={4}
                            />

                            <TouchableOpacity 
                                style={styles.submitBtn} 
                                onPress={handleCreateWallet}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Add to Portfolio</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            }
        />
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090a0f' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 54, paddingBottom: 12 },
    title: { fontSize: 24, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.5 },
    subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
    addBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#4f46e5', paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 12,
    },
    addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    totalCard: {
        backgroundColor: '#12141c', borderRadius: 20, padding: 20, marginBottom: 14,
        borderWidth: 1, borderColor: '#1e2230',
    },
    totalLabel: { color: '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
    totalAmount: { color: '#f8fafc', fontSize: 30, fontWeight: '800', marginVertical: 4, letterSpacing: -0.5 },
    walletCount: { color: '#818cf8', fontSize: 12, fontWeight: '600' },
    toolbar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#12141c', borderRadius: 14, padding: 6, borderWidth: 1, borderColor: '#1e2230',
    },
    viewModeGroup: { flexDirection: 'row', gap: 4 },
    viewModeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    viewModeBtnActive: { backgroundColor: '#1e2230' },
    viewModeText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
    viewModeTextActive: { color: '#f8fafc' },
    compareBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1e2230' },
    compareBtnActive: { backgroundColor: '#4f46e5' },
    compareText: { color: '#818cf8', fontSize: 12, fontWeight: '700' },
    compareTextActive: { color: '#fff' },
    compareContainer: {
        backgroundColor: '#12141c', borderRadius: 16, padding: 16,
        borderWidth: 1, borderColor: '#1e2230', marginTop: 12,
    },
    compareHeading: { color: '#f8fafc', fontSize: 14, fontWeight: '700', marginBottom: 12 },
    compareRowHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1e2230', paddingBottom: 8 },
    compareCellHeader: { fontSize: 10, fontWeight: '700', color: '#64748b', letterSpacing: 0.5 },
    compareRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1e2230' },
    compareCell: { fontSize: 12, color: '#f8fafc' },
    sectionHeading: { color: '#f8fafc', fontSize: 16, fontWeight: '700' },
    card: {
        backgroundColor: '#12141c', borderRadius: 20, padding: 20,
        marginBottom: 12, borderWidth: 1, borderColor: '#1e2230',
    },
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    providerBadge: { backgroundColor: '#1e2230', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    providerBadgeText: { color: '#818cf8', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    trashBtn: { padding: 4 },
    cardMiddle: { marginVertical: 18 },
    chipGraphic: { width: 34, height: 24, borderRadius: 6, backgroundColor: '#334155', justifyContent: 'center', paddingHorizontal: 4, marginBottom: 12 },
    chipLine: { height: 2, backgroundColor: '#475569' },
    cardName: { color: '#f8fafc', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
    maskedNumber: { color: '#64748b', fontSize: 12, fontWeight: '600', letterSpacing: 1.5, marginTop: 4 },
    cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 14, borderTopWidth: 1, borderTopColor: '#1e2230' },
    cardBalanceLabel: { color: '#64748b', fontSize: 9, fontWeight: '700', letterSpacing: 0.6, marginBottom: 2 },
    cardBalance: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
    rewardsBalance: { color: '#f59e0b', fontSize: 15, fontWeight: '700' },
    listCard: {
        backgroundColor: '#12141c', borderRadius: 16, padding: 14,
        marginBottom: 8, borderWidth: 1, borderColor: '#1e2230',
    },
    listCardMain: { flexDirection: 'row', alignItems: 'center' },
    cardIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1e2230', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardProvider: { color: '#64748b', fontSize: 12, marginTop: 2 },
    listBalance: { color: '#f8fafc', fontWeight: '700', fontSize: 14 },
    listRewards: { color: '#f59e0b', fontSize: 11, marginTop: 2 },
    expandedInfo: { marginTop: 10, backgroundColor: '#090a0f', padding: 12, borderRadius: 10 },
    expandedText: { color: '#94a3b8', fontSize: 11, paddingVertical: 2 },
    emptyContainer: { alignItems: 'center', marginTop: 40, paddingBottom: 20 },
    empty: { color: '#64748b', fontSize: 14, fontWeight: '600', marginTop: 10 },
    emptyBtn: { marginTop: 14, backgroundColor: '#4f46e5', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
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
    submitBtn: {
        backgroundColor: '#4f46e5', borderRadius: 12,
        padding: 14, alignItems: 'center', marginTop: 22, marginBottom: 16,
    },
    submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
