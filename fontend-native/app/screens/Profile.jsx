import React, { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TextInput,
    TouchableOpacity, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/AuthContext';
import api from '../../services/api';

export default function ProfileScreen() {
    const { user: authUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form inputs
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [organization, setOrganization] = useState('');

    const fetchProfile = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        try {
            const res = await api.get('/users/profile');
            const data = res.data?.data || res.data;
            setProfile(data);
            setFullName(data?.fullName || authUser?.fullName || '');
            setEmail(data?.email || authUser?.email || '');
            setPhone(data?.phone || '');
            setOrganization(data?.organization || '');
        } catch (e) {
            console.error('Failed to fetch profile', e.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [authUser?.fullName, authUser?.email]);

    useFocusEffect(
        useCallback(() => {
            fetchProfile();
        }, [fetchProfile])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchProfile(true);
    };

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Required', 'Full name cannot be empty.');
            return;
        }
        setSaving(true);
        try {
            const res = await api.put('/users/profile', {
                fullName: fullName.trim(),
                phone: phone.trim(),
                organization: organization.trim()
            });
            if (res.data?.success) {
                setEditing(false);
                fetchProfile(true);
            }
        } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
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
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
            }
            showsVerticalScrollIndicator={false}
        >
            {/* Header banner */}
            <View style={styles.coverBanner} />
            <View style={styles.avatarSection}>
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitials}>{getInitials(profile?.fullName || fullName)}</Text>
                </View>
                <View style={styles.avatarInfo}>
                    <Text style={styles.profileName}>{profile?.fullName || fullName || 'User'}</Text>
                    <Text style={styles.memberSince}>
                        Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recent'}
                    </Text>
                </View>
            </View>

            {/* Profile Info Form */}
            <View style={styles.contentSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>ACCOUNT DETAILS</Text>
                    <TouchableOpacity 
                        style={styles.editToggleBtn}
                        onPress={() => {
                            if (editing) {
                                setFullName(profile?.fullName || '');
                                setPhone(profile?.phone || '');
                                setOrganization(profile?.organization || '');
                            }
                            setEditing(!editing);
                        }}
                    >
                        <Text style={styles.editToggleText}>{editing ? 'Cancel' : 'Edit'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.card}>
                    {/* Full Name */}
                    <Text style={styles.fieldLabel}>FULL NAME</Text>
                    {editing ? (
                        <TextInput
                            style={styles.input}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Your Name"
                            placeholderTextColor="#475569"
                        />
                    ) : (
                        <Text style={styles.fieldValue}>{profile?.fullName || 'Not specified'}</Text>
                    )}

                    {/* Email */}
                    <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                    <Text style={[styles.fieldValue, { color: '#64748b' }]}>{profile?.email || email}</Text>

                    {/* Phone */}
                    <Text style={styles.fieldLabel}>PHONE</Text>
                    {editing ? (
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="+1 (555) 000-0000"
                            placeholderTextColor="#475569"
                            keyboardType="phone-pad"
                        />
                    ) : (
                        <Text style={styles.fieldValue}>{profile?.phone || 'Not specified'}</Text>
                    )}

                    {/* Organization */}
                    <Text style={styles.fieldLabel}>ORGANIZATION</Text>
                    {editing ? (
                        <TextInput
                            style={styles.input}
                            value={organization}
                            onChangeText={setOrganization}
                            placeholder="Organization Name"
                            placeholderTextColor="#475569"
                        />
                    ) : (
                        <Text style={styles.fieldValue}>{profile?.organization || 'Personal Account'}</Text>
                    )}

                    {editing && (
                        <TouchableOpacity 
                            style={styles.saveBtn}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveBtnText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Security Section */}
                <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 8 }]}>SECURITY STATUS</Text>
                <View style={styles.card}>
                    <View style={styles.securityRow}>
                        <View style={styles.securityIconBox}>
                            <Ionicons name="shield-checkmark" size={18} color="#818cf8" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.securityTitle}>Password Encryption</Text>
                            <Text style={styles.securitySub}>
                                Last updated: {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : 'Active'}
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.securityRow, { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1e2230' }]}>
                        <View style={styles.securityIconBox}>
                            <Ionicons name="finger-print" size={18} color="#34d399" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.securityTitle}>Multi-Factor Authentication</Text>
                            <Text style={styles.securitySub}>Configured via account settings</Text>
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090a0f' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090a0f' },
    coverBanner: { height: 90, backgroundColor: '#1e2230' },
    avatarSection: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, marginTop: -36, gap: 14 },
    avatarCircle: {
        width: 74, height: 74, borderRadius: 20,
        backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center',
        borderWidth: 4, borderColor: '#090a0f',
    },
    avatarInitials: { color: '#fff', fontSize: 24, fontWeight: '800' },
    avatarInfo: { flex: 1, paddingBottom: 4 },
    profileName: { color: '#f8fafc', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
    memberSince: { color: '#64748b', fontSize: 12, marginTop: 2 },
    contentSection: { padding: 16 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sectionTitle: { color: '#64748b', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
    editToggleBtn: { paddingVertical: 4 },
    editToggleText: { color: '#818cf8', fontSize: 13, fontWeight: '700' },
    card: {
        backgroundColor: '#12141c', borderRadius: 20, padding: 18,
        borderWidth: 1, borderColor: '#1e2230',
    },
    fieldLabel: { color: '#64748b', fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginTop: 12, marginBottom: 4 },
    fieldValue: { color: '#f8fafc', fontSize: 14, fontWeight: '600' },
    input: {
        backgroundColor: '#090a0f', color: '#f8fafc',
        borderRadius: 12, padding: 12, fontSize: 14,
        borderWidth: 1, borderColor: '#1e2230',
    },
    saveBtn: {
        backgroundColor: '#4f46e5', borderRadius: 12,
        padding: 14, alignItems: 'center', marginTop: 18,
    },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    securityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    securityIconBox: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#090a0f', justifyContent: 'center', alignItems: 'center',
    },
    securityTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '700' },
    securitySub: { color: '#64748b', fontSize: 11, marginTop: 1 },
});
