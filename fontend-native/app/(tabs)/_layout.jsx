import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#818cf8',
                tabBarInactiveTintColor: '#64748b',
                tabBarStyle: {
                    backgroundColor: '#090a0f',
                    borderTopColor: '#1e2230',
                    borderTopWidth: 1,
                    height: Platform.OS === 'ios' ? 88 : 64,
                    paddingTop: 8,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: '600',
                    letterSpacing: 0.2,
                },
                headerStyle: {
                    backgroundColor: '#090a0f',
                },
                headerTintColor: '#f8fafc',
                headerTitleStyle: {
                    fontWeight: '700',
                    fontSize: 18,
                },
                headerShadowVisible: false,
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    headerShown: false,
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? 'home' : 'home-outline'} 
                            size={22} 
                            color={color} 
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="transactions"
                options={{
                    title: 'Activity',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? 'swap-horizontal' : 'swap-horizontal-outline'} 
                            size={22} 
                            color={color} 
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="wallets"
                options={{
                    title: 'Wallets',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? 'wallet' : 'wallet-outline'} 
                            size={22} 
                            color={color} 
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="rewards"
                options={{
                    title: 'Rewards',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? 'sparkles' : 'sparkles-outline'} 
                            size={22} 
                            color={color} 
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="more"
                options={{
                    title: 'Hub',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons 
                            name={focused ? 'grid' : 'grid-outline'} 
                            size={22} 
                            color={color} 
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
