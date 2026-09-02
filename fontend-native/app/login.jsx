import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { router, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../store/AuthContext';

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Required', 'Please enter your email and password.');
            return;
        }
        setLoading(true);
        try {
            await login(email.trim(), password);
            router.replace('/(tabs)/dashboard');
        } catch (err) {
            const msg = err.response?.data?.message || 'Invalid email or password.';
            Alert.alert('Sign In Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView 
                contentContainerStyle={styles.inner} 
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Brand Emblem */}
                <View style={styles.brandContainer}>
                    <View style={styles.logoBadge}>
                        <Ionicons name="wallet" size={28} color="#fff" />
                    </View>
                    <Text style={styles.brandTitle}>PayPilot</Text>
                    <Text style={styles.brandTagline}>Intelligent Financial Navigation</Text>
                </View>

                {/* Form Card */}
                <View style={styles.formCard}>
                    <Text style={styles.cardHeader}>Welcome Back</Text>
                    <Text style={styles.cardSub}>Sign in to access your financial dashboard</Text>

                    {/* Email Input */}
                    <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="mail-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="name@example.com"
                            placeholderTextColor="#475569"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                        />
                    </View>

                    {/* Password Input */}
                    <Text style={styles.inputLabel}>PASSWORD</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter password"
                            placeholderTextColor="#475569"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                            <Ionicons 
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                                size={18} 
                                color="#64748b" 
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Primary Button */}
                    <TouchableOpacity 
                        style={styles.primaryBtn} 
                        onPress={handleLogin} 
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.primaryBtnText}>Sign In</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Footer Switch */}
                <View style={styles.footerRow}>
                    <Text style={styles.footerPrompt}>{"Don't have an account? "}</Text>
                    <Link href="/register" asChild>
                        <TouchableOpacity>
                            <Text style={styles.footerLink}>Create Account</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090a0f' },
    inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
    brandContainer: { alignItems: 'center', marginBottom: 28 },
    logoBadge: {
        width: 58, height: 58, borderRadius: 16,
        backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center',
        shadowColor: '#4f46e5', shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
        marginBottom: 12,
    },
    brandTitle: { fontSize: 28, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.5 },
    brandTagline: { fontSize: 13, color: '#64748b', marginTop: 4, fontWeight: '500' },
    formCard: {
        backgroundColor: '#12141c', borderRadius: 24, padding: 24,
        borderWidth: 1, borderColor: '#1e2230',
    },
    cardHeader: { fontSize: 20, fontWeight: '700', color: '#f8fafc' },
    cardSub: { fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 20 },
    inputLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 6 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#090a0f', borderRadius: 14,
        borderWidth: 1, borderColor: '#222638',
        paddingHorizontal: 14, marginBottom: 16, height: 50,
    },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, color: '#f8fafc', fontSize: 14, height: '100%' },
    eyeBtn: { padding: 6 },
    primaryBtn: {
        backgroundColor: '#4f46e5', borderRadius: 14, height: 50,
        justifyContent: 'center', alignItems: 'center', marginTop: 8,
        shadowColor: '#4f46e5', shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
    },
    primaryBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
    footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28, alignItems: 'center' },
    footerPrompt: { color: '#64748b', fontSize: 14 },
    footerLink: { color: '#818cf8', fontSize: 14, fontWeight: '700' },
});
