import React, { useState, useEffect } from "react";
import { View, Text, Picker, ActivityIndicator, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import axios from "axios";
import { ipAddress } from "../../urls";
import { jwtDecode } from "jwt-decode";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DeliveryStatusUpdate = () => {
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [customerId, setCustomerId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatedOrders, setUpdatedOrders] = useState(new Set()); // Store updated order IDs

  useEffect(() => {
    const fetchAuthToken = async () => {
      try {
        setLoading(true);
        const storedToken = await AsyncStorage.getItem("userAuthToken");
        if (storedToken) {
          const decodedToken = jwtDecode(storedToken);
          if (decodedToken?.id) {
            setCustomerId(decodedToken.id);
            fetchOrders(decodedToken.id);
            loadUpdatedOrders(); // Load updated orders from AsyncStorage
          }
        }
      } catch (error) {
        console.error("Error decoding auth token:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAuthToken();
  }, []);

  const fetchOrders = async (customerId) => {
    try {
      const response = await axios.get(`http://${ipAddress}:8090/get-orders/${customerId}`);
      if (response.data.status) {
        setOrders(response.data.orders);
        if (response.data.orders.length > 0) {
          setSelectedOrderId(response.data.orders[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const loadUpdatedOrders = async () => {
    try {
      const storedUpdatedOrders = await AsyncStorage.getItem("updatedOrders");
      if (storedUpdatedOrders) {
        setUpdatedOrders(new Set(JSON.parse(storedUpdatedOrders)));
      }
    } catch (error) {
      console.error("Error loading updated orders:", error);
    }
  };

  const saveUpdatedOrders = async (updatedSet) => {
    try {
      await AsyncStorage.setItem("updatedOrders", JSON.stringify(Array.from(updatedSet)));
    } catch (error) {
      console.error("Error saving updated orders:", error);
    }
  };

  const updateDeliveryStatus = async () => {
    if (!customerId || !selectedOrderId) {
      alert("Please select an order.");
      return;
    }
    try {
      const payload = {
        customer_id: customerId,
        delivery_status: selectedStatus,
      };
      const response = await axios.post(
        `http://${ipAddress}:8090/update-delivery-status`,
        payload,
        { headers: { "Content-Type": "application/json" } }
      );
      if (response.data.status) {
        alert("Delivery status updated successfully!");
        fetchOrders(customerId); // Refresh orders list

        // Save updated order ID
        setUpdatedOrders((prev) => {
          const newUpdatedSet = new Set(prev).add(selectedOrderId);
          saveUpdatedOrders(newUpdatedSet); // Save to AsyncStorage
          return newUpdatedSet;
        });
      } else {
        alert("Failed to update delivery status.");
      }
    } catch (error) {
      console.error("Error updating delivery status:", error);
      alert("Failed to update delivery status.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Delivery Status Update</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.orderContainer}>
              <TouchableOpacity
                style={[
                  styles.orderItem,
                  selectedOrderId === item.id && styles.selectedOrder,
                ]}
                onPress={() => setSelectedOrderId(item.id)}
              >
                <Text>Order ID: {item.id} - Status: {item.delivery_status}</Text>
              </TouchableOpacity>

              {/* Show dropdown only if the order has NOT been updated */}
              {!updatedOrders.has(item.id) && (
                <View>
                  <Picker
                    selectedValue={selectedStatus}
                    onValueChange={(itemValue) => setSelectedStatus(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Pending" value="pending" />
                    <Picker.Item label="Delivered" value="delivered" />
                  </Picker>

                  <TouchableOpacity style={styles.button} onPress={updateDeliveryStatus} disabled={loading}>
                    <Text style={styles.buttonText}>Update Status</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", padding: 20 },
  headerText: { fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  loader: { marginTop: 20 },
  orderContainer: { marginBottom: 20 },
  orderItem: { padding: 10, marginVertical: 5, backgroundColor: "#f9f9f9", borderRadius: 5 },
  selectedOrder: { backgroundColor: "#FFD700" },
  picker: { width: "100%", marginVertical: 10 },
  button: { 
    width: "60%", 
    alignSelf: "center", 
    backgroundColor: "#FFD700", 
    padding: 10, 
    borderRadius: 5, 
    alignItems: "center",
    marginTop: 5,
  },
  buttonText: { 
    color: "#000", 
    fontSize: 16, 
    fontWeight: "bold" 
  },
});

export default DeliveryStatusUpdate;
