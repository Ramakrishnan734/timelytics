import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";

// SpendingAnalyticsScreen - PLACEHOLDER. Full UI implemented per Stitch design in later steps.
const SpendingAnalyticsScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.text}>SpendingAnalyticsScreen</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" },
  text: { color: Colors.textPrimary, fontSize: 18 },
});

export default SpendingAnalyticsScreen;
