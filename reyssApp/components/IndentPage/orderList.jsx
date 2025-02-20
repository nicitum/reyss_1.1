import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import OrderCard from "./orderCard";
import moment from "moment";
import Toast from "react-native-toast-message"; // ✅ Import Toast

const showToast = (message) => {
  Toast.show({
    type: "error",
    text1: "Order Error",
    text2: message,
    position: "top",
    visibilityTime: 3000, // Duration (3 seconds)
    autoHide: true,
    topOffset: 50,
    propsOverride: {
      text2Style: { flexWrap: "wrap", width: "100%" }, // Ensure full message is displayed
    },
  });
};


const OrdersList = ({ amOrder, pmOrder, selectedDate, navigation }) => {
  const handleOrderClick = (order, shift) => {
    const currentHour = moment().hour();

    if (shift === "AM") {
      if (currentHour >= 6 && currentHour < 12) {
        navigation.navigate("PlaceOrderPage", { order, selectedDate, shift });
      } else {
        showToast("AM orders allowed only between 6 AM - 8 AM. Contact admin.");
      }
    } else if (shift === "PM") {
      if (currentHour >= 12 && currentHour < 24) {
        navigation.navigate("PlaceOrderPage", { order, selectedDate, shift });
      } else {
        showToast("PM orders allowed only between 12 PM - 4 PM. Contact admin.");

      }
    } else {
      showToast("Invalid order shift. Contact admin.");
    }
  };

  return (
    <>
      <ScrollView style={styles.ordersContainer}>
        <OrderCard shift="AM" order={amOrder} selectedDate={selectedDate} onOrderClick={handleOrderClick} />
        <OrderCard shift="PM" order={pmOrder} selectedDate={selectedDate} onOrderClick={handleOrderClick} />
      </ScrollView>
      
      <Toast /> {/* ✅ Ensure Toast component is included */}
    </>
  );
};

const styles = StyleSheet.create({
  ordersContainer: {
    flex: 1,
    padding: 10,
  },
});

export default OrdersList;
