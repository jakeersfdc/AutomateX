import React, { useEffect } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const marketSummary = [
  { name: 'NIFTY 50', value: '22,136.25', change: '+0.87%' },
  { name: 'BANKNIFTY', value: '45,502.75', change: '+1.04%' },
  { name: 'GOLD', value: '65,210', change: '-0.12%' },
];

const actions = [
  { label: 'Watchlist', url: 'https://profitforce.vercel.app/dashboard?view=stocks' },
  { label: 'Live Signals', url: 'https://profitforce.vercel.app/dashboard?view=alerts' },
  { label: 'Positions', url: 'https://profitforce.vercel.app/dashboard?view=positions' },
];

export default function App() {
  useEffect(() => {
    console.log('ProfitForce Mobile: ready for API integration and push notifications');
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.brand}>ProfitForce</Text>
        <Text style={styles.tagline}>Real-time Indian market signals, simplified for mobile.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Today&apos;s pulse</Text>
          <Text style={styles.heroSubtitle}>Stay on top of the best watchlist, alerts and trade ideas.</Text>
          <View style={styles.heroStatRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Active calls</Text>
              <Text style={styles.heroStatValue}>12</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Win rate</Text>
              <Text style={styles.heroStatValue}>78%</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Market snapshot</Text>
        <View style={styles.cardsRow}>
          {marketSummary.map((item) => (
            <View key={item.name} style={styles.marketCard}>
              <Text style={styles.marketName}>{item.name}</Text>
              <Text style={styles.marketValue}>{item.value}</Text>
              <Text style={[styles.marketChange, item.change.startsWith('+') ? styles.positive : styles.negative]}>{item.change}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actionsRow}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionButton}
              onPress={() => Linking.openURL(action.url)}
            >
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Tip</Text>
          <Text style={styles.notesText}>Use the web dashboard for deeper analytics, then track your positions and alerts on mobile for faster decisions.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#04101f',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    backgroundColor: '#061025',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  brand: {
    fontSize: 28,
    fontWeight: '900',
    color: '#e7f5ff',
  },
  tagline: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#a6c8e0',
    maxWidth: '88%',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#0f1c36',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.15)',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: '#b9c7d9',
    lineHeight: 20,
  },
  heroStatRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStat: {
    flex: 1,
    marginRight: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#0a1429',
  },
  heroStatLabel: {
    fontSize: 11,
    color: '#7f95af',
    marginBottom: 6,
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#eff6ff',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dbeafe',
    marginBottom: 12,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  marketCard: {
    flex: 1,
    minWidth: 106,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#071124',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  marketName: {
    fontSize: 12,
    color: '#7dd3fc',
    marginBottom: 6,
    fontWeight: '700',
  },
  marketValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
  },
  marketChange: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  positive: {
    color: '#34d399',
  },
  negative: {
    color: '#f87171',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    minWidth: 108,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#0f2541',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.16)',
  },
  actionLabel: {
    color: '#dbeafe',
    fontWeight: '700',
  },
  notesCard: {
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#08182f',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.12)',
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#dbeafe',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#cbd5e1',
  },
});

