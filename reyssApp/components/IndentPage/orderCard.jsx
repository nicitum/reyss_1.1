import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import moment from "moment";

const OrderCard = ({ shift, order, selectedDate, onOrderClick }) => {
  const isPastDate = moment(selectedDate, "YYYY-MM-DD").isBefore(
      moment().startOf("day")
  );

  // Determine if the arrow button should be shown
  const showArrowButton = order || (!order && !isPastDate);

  // Get delivery info based on shift
  const getDeliveryInfo = (shift) => {
    if (shift === "AM") {
      return "Same day delivery";
    } else if (shift === "PM") {
      return "Next day 5AM";
    }
    return "";
  };

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderContentWrapper}>
        <View style={styles.orderContent}>
          <Text style={styles.orderType}>{shift}</Text>
          <Text style={styles.orderText}>
            {selectedDate.split("-").reverse().join("-")}
          </Text>
          {order ? (
            <>
              <Text style={styles.orderText}>Order ID: {order.orderId}</Text>
              <Text style={styles.orderText}>Quantity: {order.quantity}</Text>
              <Text style={styles.orderText}>
                Total Amount: ₹{order.totalAmount}
              </Text>
            </>
          ) : (
            <Text style={styles.naText}>No Indent</Text>
          )}
        </View>

        {/* Conditionally render the arrow button */}
        {showArrowButton && (
          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() => onOrderClick(order, shift, selectedDate)}
          >
            <MaterialIcons name="arrow-forward" size={30} color="#ffcc00" />
          </TouchableOpacity>
        )}
      </View>

      {/* Display delivery info in top-right of the card */}
      <Text style={styles.deliveryInfo}>{getDeliveryInfo(shift)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginVertical: 5,
    position: "relative",
  },
  orderContentWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderContent: {
    flex: 1,
  },
  orderType: {
    fontSize: 24,
    fontWeight: "bold",
  },
  orderText: {
    fontSize: 16,
    marginVertical: 2,
  },
  naText: {
    fontSize: 16,
    color: "red",
    marginVertical: 2,
  },
  arrowButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  deliveryInfo: {
    fontSize: 12,
    color: "#007BFF",
    position: "absolute",
    top: 10,
    right: 10,
    fontWeight: "bold",
  },
});

export default OrderCard;