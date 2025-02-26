import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProfilePage from './profile';
import OrdersPage from './OrdersPage';
import DeliveryStatusUpdate from './DeliveryStatusUpdate';
import UpdateOrderScreen from './UpdateOrders';
import UpdateOrdersU from './UpdateOrdersU';
import AdminOrderHistory from './AdminOrderHistory';
import PlaceOrderAdmin from './PlaceOrderAdmin';

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
      <Stack.Screen 
        name="DeliveryStatusUpdate" 
        component={DeliveryStatusUpdate} 
        options={{ title: 'Update Delivery Status' }} 
      />

      <Stack.Screen 
        name="UpdateOrders" 
        component={UpdateOrderScreen} 
        options={{ title: 'Edit/Update Orders' }} 
      />

      <Stack.Screen 
        name="UpdateOrdersU" 
        component={UpdateOrdersU} 
        options={{ title: 'Update Orders' }} 
      />

      <Stack.Screen 
        name="AdminOrderHistory" 
        component={AdminOrderHistory} 
        options={{ title: 'Admin Order History' }} 
      />

      <Stack.Screen 
        name="PlaceOrderAdmin" 
        component={PlaceOrderAdmin} 
        options={{ title: 'Place Order Admin' }} 
      />





    </Stack.Navigator>
    
  );
};

export default ProfileStack;
