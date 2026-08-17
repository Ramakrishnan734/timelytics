import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";

// ProductivityHubScreen - PLACEHOLDER. Full UI implemented per Stitch design in later steps.
const ProductivityHubScreen: React.FC = () => (
  <View style={styles.container}>
    <Text style={styles.text}>ProductivityHubScreen</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: "center", justifyContent: "center" },
  text: { color: Colors.textPrimary, fontSize: 18 },
});

export default ProductivityHubScreen;
