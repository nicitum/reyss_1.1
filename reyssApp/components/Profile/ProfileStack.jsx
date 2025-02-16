import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfilePage from './profile';
import OrdersPage from './OrdersPage';


const Stack = createStackNavigator();

const ProfileStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ProfilePage" 
        component={ProfilePage} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Orders" 
        component={OrdersPage} 
        options={{ title: 'Order History' }} 
      />
    </Stack.Navigator>
  );
};

export default ProfileStack;
