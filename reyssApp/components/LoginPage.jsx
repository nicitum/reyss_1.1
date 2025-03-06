import React, { useState } from "react";
import { jwtDecode } from "jwt-decode";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ipAddress } from "../urls";

const LoginPage = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://${ipAddress}:8090/auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.status) {
        Alert.alert("Login Failed", data.message);
        setIsLoading(false);
        return;
      }

      const decodedToken = jwtDecode(data.token);
      const customerId = decodedToken.id;
      await AsyncStorage.setItem("customerId", customerId);
      await AsyncStorage.setItem("userAuthToken", data.token);
      setIsLoading(false);
      navigation.navigate("TabNavigator");
    } catch (err) {
      console.error("Login error:", err);
      setIsLoading(false);
      Alert.alert("Login Error", "An error occurred. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Section (70% white) */}
      <View style={styles.topSection}>
        <Image source={require("../assets/SL.png")} style={styles.logo} />
        <Text style={styles.title}>REYSS</Text>
        <Text style={styles.subtitle}>WELCOME TO SL ENTERPRISESS</Text>
      </View>

      {/* Bottom Yellow Background (30% yellow) */}
      <View style={styles.bottomSection}>
        {/* Form that floats over both sections */}
        <View style={styles.formContainer}>
          {/* Username Input */}
          <View style={styles.inputContainer}>
            <Icon name="person" size={24} color="#aaa" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              placeholderTextColor="#aaa"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Icon name="lock" size={24} color="#aaa" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible} // Toggle secureTextEntry based on state
              placeholderTextColor="#aaa"
            />
            <TouchableOpacity
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            >
              <Icon
                name={isPasswordVisible ? "visibility" : "visibility-off"}
                size={24}
                color="#aaa"
                style={styles.icon}
              />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  topSection: {
    flex: 7, // This makes the top section take 70% of the screen
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  bottomSection: {
    flex: 3,
    backgroundColor: "#ffcc00",
    justifyContent: "flex-end", // Ensures formContainer is above the yellow section
    alignItems: "center",
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#ffcc00",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#888",
    marginBottom: 40,
  },
  formContainer: {
    position: "absolute",
    width: "90%", // Form width
    top: -100, // This lifts the form up to overlap both sections
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 20,
    width: "100%",
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  button: {
    width: "100%",
    padding: 15,
    backgroundColor: "#ffcc00",
    borderRadius: 25,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    fontSize: 18,
    color: "white",
    fontWeight: "bold",
  },
});

export default LoginPage;