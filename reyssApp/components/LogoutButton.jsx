import React from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LogOutButton = ({ navigation }) => {
  const handleLogout = async () => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      {
        text: "Cancel",
        onPress: () => console.log("Logout canceled"),
        style: "cancel",
      },
      {
        text: "Yes",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("userAuthToken");

            await AsyncStorage.removeItem("default");
            await AsyncStorage.removeItem("customerId");
            await AsyncStorage.removeItem("modifiedOrder");

            Alert.alert("Logout Successful", "You have been logged out.");
            navigation.navigate("Login");
          } catch (error) {
            console.error("Logout Error:", error);
            Alert.alert("Error", "An error occurred. Please try again.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutButton: {
    backgroundColor: "#ffcc00",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default LogOutButton;
