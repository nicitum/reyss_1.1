import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LoginPage from "./components/LoginPage";
import TabNavigator from "./components/TabNavigator";
import LoadingIndicator from "./components/general/Loader";
import { jwtDecode } from "jwt-decode";

const Stack = createStackNavigator();

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  useEffect(() => {
    const checkAuthAndRestore = async () => {
      try {
        const token = await AsyncStorage.getItem("userAuthToken");

        if (token) {
          try {
            const decodedToken = jwtDecode(token);
            const currentTime = Math.floor(Date.now() / 1000);

            if (decodedToken.exp && decodedToken.exp > currentTime) {
              setIsLoggedIn(true);
            } else {
              // Token expired, clear it
              await AsyncStorage.removeItem("userAuthToken");
              setIsLoggedIn(false);
            }
          } catch (decodeError) {
            console.error("JWT decode error:", decodeError);
            await AsyncStorage.removeItem("userAuthToken"); // Clear on decode error
            setIsLoggedIn(false);

          }
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Error checking/restoring auth:", error);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false); // Authentication check is complete
      }
    };

    checkAuthAndRestore();
  }, []); // Empty dependency array ensures this runs only once

  if (isLoading) {
    return <LoadingIndicator />; // Show loading indicator while checking
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isLoggedIn ? "TabNavigator" : "Login"}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Login" component={LoginPage} />
        <Stack.Screen name="TabNavigator" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;