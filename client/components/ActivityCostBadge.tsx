import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/styles/colors';

type ActivityCostBadgeProps = {
  cost: number;
  color?: string;
  iconSize?: number;
  fontSize?: number;
  style?: object;
};

export default function ActivityCostBadge({
  cost,
  color = Colors.brand.blue,
  iconSize = 13,
  fontSize = 13,
  style,
}: ActivityCostBadgeProps) {
  if (!Number.isFinite(cost) || cost <= 0) {
    return null;
  }

  return (
    <View style={[styles.row, style]}>
      <Ionicons name="cash-outline" size={iconSize} color={color} />
      <Text style={[styles.text, { color, fontSize }]}>{cost} PLN</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  text: {
    fontWeight: '700',
  },
});
