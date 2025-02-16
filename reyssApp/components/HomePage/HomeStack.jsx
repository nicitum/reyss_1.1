import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import HomePage from "./Home";
import ProductsList from "./ProductList";

const Stack = createStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HomePage" component={HomePage} />
      <Stack.Screen name="ProductsList" component={ProductsList} />
    </Stack.Navigator>
  );
};

export default HomeStack;
