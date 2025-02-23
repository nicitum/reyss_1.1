import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import HomeStack from "./HomePage/HomeStack";
import ProfileStack from "./Profile/ProfileStack";
import Transactions from "./Transactions/transactions";
import IndentStack from "./IndentPage/IndentStack";
import { View, Text, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import AdminAssignedUsersPage from "./route_mgr/AdminAssignedUsers";



const Tab = createBottomTabNavigator();



const TabNavigator = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserRole = async () => {
      setIsLoading(true);
      const userAuthToken = await AsyncStorage.getItem("userAuthToken");
      console.log("userAuthToken from AsyncStorage:", userAuthToken);

      if (userAuthToken) {
        try {
          const decodedToken = jwtDecode(userAuthToken);
          console.log("Decoded JWT Token:", decodedToken);
          if (decodedToken.role === "admin") {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Token verification error:", error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setIsLoading(false);
    };
    checkUserRole();
  }, []);

  console.log("isAdmin state in TabNavigator:", isAdmin);

  if (isLoading) {
    return (
      <View>
        <Text>Loading Tabs...</Text>
      </View>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#ffcc00",
        tabBarInactiveTintColor: "gray",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Indent"
        component={isAdmin ? AdminAssignedUsersPage : IndentStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="rss" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={Transactions}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="sync" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;