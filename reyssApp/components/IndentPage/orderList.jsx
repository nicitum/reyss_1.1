import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import OrderCard from "./orderCard";

const OrdersList = ({ amOrder, pmOrder, selectedDate, navigation }) => {
  const handleOrderClick = (order, shift) => {
    navigation.navigate("PlaceOrderPage", {
      order,
      selectedDate,
      shift,
    });
  };

  return (
    <ScrollView style={styles.ordersContainer}>
      <OrderCard
        shift="AM"
        order={amOrder}
        selectedDate={selectedDate}
        onOrderClick={handleOrderClick}
      />
      <OrderCard
        shift="PM"
        order={pmOrder}
        selectedDate={selectedDate}
        onOrderClick={handleOrderClick}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  ordersContainer: {
    flex: 1,
    padding: 10,
  },
});

export default OrdersList;
