import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";

// ExpenseDetailsScreen - PLACEHOLDER. Full UI implemented per Stitch design in later steps.
const ExpenseDetailsScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.text}>ExpenseDetailsScreen</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" },
  text: { color: Colors.textPrimary, fontSize: 18 },
});

export default ExpenseDetailsScreen;
