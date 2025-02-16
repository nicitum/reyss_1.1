import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Home from "./HomePage/Home";
import Transactions from "./Transactions/transactions";
import { useNavigation } from "@react-navigation/native";
import IndentStack from "./IndentPage/IndentStack";
import HomeStack from "./HomePage/HomeStack";
import ProfileStack from "./Profile/ProfileStack";

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const navigation = useNavigation();

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
        component={IndentStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="rss" size={size} color={color} />
          ),
        }}
        // listeners={{
        //   tabPress: (e) => {
        //     e.preventDefault();
        //     navigation.navigate("IndentStack", {
        //       screen: "IndentPage",
        //     });
        //   },
        // }}
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
