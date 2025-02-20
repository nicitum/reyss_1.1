import React from "react";
import { View, Text, StyleSheet } from "react-native";

const OrderDetails = ({ orderDetails, selectedDate, shift, isEditable }) => {
  // ✅ Safe way to access total_amount
  const total_amount = orderDetails?.order?.total_amount || 0;

  // ✅ Prevent rendering if orderDetails is undefined
  if (!orderDetails || !orderDetails.order) {
    return <Text style={styles.orderText}>Loading order details...</Text>;
  }

  return (
    <View style={styles.orderInfoContainer}>
      {/* Hide Order ID when in editable mode */}
      {/* {!isEditable && orderDetails.order.id && (
        <Text style={styles.orderText}>Order ID: {orderDetails.order.id}</Text>
      )} */}

      {/* <Text style={styles.orderText}>Delivery Date: {selectedDate}</Text> */}
      <Text style={styles.orderText}>Shift: {shift}</Text>

      {/* Hide Total Amount when in editable mode */}
      {!isEditable && (
        <Text style={styles.orderText}>Total Amount: ₹{total_amount}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  orderInfoContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    margin: 10,
  },
  orderText: {
    fontSize: 16,
    marginVertical: 2,
  },
});

export default OrderDetails;
