import React, { useEffect, useState,  useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import axios from "axios";
import { ipAddress } from "../../urls";
import { checkTokenAndRedirect } from "../../services/auth";
import { useNavigation } from "@react-navigation/native";
import { jwtDecode } from "jwt-decode";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import moment from 'moment';


const AdminOrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const [expandedOrderDetailsId, setExpandedOrderDetailsId] = useState(null);
  const [orderDetails, setOrderDetails] = useState({});

 

  // Use useCallback to memoize fetchOrders function - important for useFocusEffect
  const fetchOrders = useCallback(async () => {
    setLoading(true);// Reset error on new fetch attempt
    try {
        const token = await AsyncStorage.getItem("userAuthToken"); // Get token from AsyncStorage
        const decodedToken = jwtDecode(token);
        const adminId = decodedToken.id1;

        const url = `http://${ipAddress}:8090/get-admin-orders/${adminId}`;
        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        };

        console.log("FETCH ADMIN ORDERS - Request URL:", url);
        console.log("FETCH ADMIN ORDERS - Request Headers:", headers);

        const ordersResponse = await fetch(url, { headers });

        console.log("FETCH ADMIN ORDERS - Response Status:", ordersResponse.status);
        console.log("FETCH ADMIN ORDERS - Response Status Text:", ordersResponse.statusText);

        if (!ordersResponse.ok) {
            const errorText = await ordersResponse.text();
            const message = `Failed to fetch admin orders. Status: ${ordersResponse.status}, Text: ${errorText}`;
            console.error("FETCH ADMIN ORDERS - Error Response Text:", errorText);
            throw new Error(message);
        }

        const ordersData = await ordersResponse.json();
        console.log("FETCH ADMIN ORDERS - Response Data:", ordersData);
        let fetchedOrders = ordersData.orders;

        // **FILTER ORDERS FOR TODAY (Epoch Seconds & CORRECT FORMAT & .unix()):**
        const todayFormatted = moment().format("YYYY-MM-DD"); // Corrected format to YYYY-MM-DD (more standard)
        console.log("DEBUG: Today's Formatted Date (YYYY-MM-DD):", todayFormatted); // DEBUG LOG

        const todaysOrders = fetchedOrders.filter(order => {
            if (!order.placed_on) {
                console.log("DEBUG: order.placed_on is missing for order ID:", order.id); // DEBUG LOG
                return false; // Skip if placed_on is missing or invalid
            }

            console.log("DEBUG: Raw order.placed_on value:", order.placed_on, typeof order.placed_on); // DEBUG LOG - Raw value and type

            const parsedEpochSeconds = parseInt(order.placed_on, 10); // Still parse to integer
            console.log("DEBUG: Parsed Epoch Timestamp (parseInt) - Seconds:", parsedEpochSeconds, typeof parsedEpochSeconds); // DEBUG LOG - Parsed integer (seconds)

            // **Use moment.unix() to parse epoch seconds:**
            const orderDateMoment = moment.unix(parsedEpochSeconds); // **Use moment.unix()**
            console.log("DEBUG: Moment Object from Epoch (Seconds using .unix()):", orderDateMoment); // DEBUG LOG - Moment object (parsed as seconds)
            console.log("DEBUG: Moment Object valueOf (Epoch in ms AFTER .unix()):", orderDateMoment.valueOf()); // DEBUG LOG - Epoch value from Moment (in ms)

            const orderDateFormatted = orderDateMoment.format("YYYY-MM-DD"); // Corrected format to YYYY-MM-DD
            console.log("DEBUG: Formatted Order Date (YYYY-MM-DD):", orderDateFormatted); // DEBUG LOG - Formatted date

            return orderDateFormatted === todayFormatted; // Compare formatted dates
        });

        setOrders(todaysOrders);
        console.log('todayssss order',todaysOrders)// Set the filtered orders


    } catch (fetchOrdersError) {
        console.error("FETCH ADMIN ORDERS - Fetch Error:", fetchOrdersError);

        Alert.alert("Error", fetchOrdersError.message || "Failed to fetch admin orders."); // Show error alert
    } finally {
        setLoading(false);
    }
}, [navigation]);

useFocusEffect(  // Use useFocusEffect to fetch orders on screen focus
  useCallback(() => {
      fetchOrders();
      return () => {
          // Optional: Cleanup function if needed when screen loses focus
          // (currently empty in this example)
      };
  }, [fetchOrders]) // Dependency array: fetchOrders (memoized function)
);

  const fetchOrderProducts = async (orderId) => {
    try {
      const token = await checkTokenAndRedirect(navigation);
      if (!token) throw new Error("No authorization token found.");

      const response = await axios.get(
        `http://${ipAddress}:8090/order-products?orderId=${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching order products:", error);
      Alert.alert("Error", "Failed to fetch order details.");
      return [];
    }
  };

  const handleOrderDetailsPress = async (orderId) => {
    if (expandedOrderDetailsId === orderId) {
      setExpandedOrderDetailsId(null);
    } else {
      setExpandedOrderDetailsId(orderId);
      if (!orderDetails[orderId]) {
        const products = await fetchOrderProducts(orderId);
        setOrderDetails((prevDetails) => ({ ...prevDetails, [orderId]: products }));
      }
    }
  };

  const renderOrderDetails = (orderId) => {
    const products = orderDetails[orderId];
    if (!expandedOrderDetailsId || expandedOrderDetailsId !== orderId || !products) {
      return null;
    }

    return (
      <View style={detailStyles.orderDetailsContainer}>
        <Text style={detailStyles.orderDetailsTitle}>Order Details:</Text>
        
        {/* Header Row */}
        <View style={detailStyles.headerRow}>
          <Text style={detailStyles.headerCell}>Product</Text>
          <Text style={detailStyles.headerCell}>Category</Text>
          <Text style={detailStyles.headerCell}>Quantity</Text>
          <Text style={detailStyles.headerCell}>Price</Text>
        </View>

        {/* Product Rows */}
        {products.length > 0 ? (
          products.map((product, index) => (
            <View key={`${orderId}-${product.product_id}-${index}`} style={detailStyles.productRow}>
              <Text style={detailStyles.productCell}>{product.name}</Text>
              <Text style={detailStyles.productCell}>{product.category}</Text>
              <Text style={detailStyles.productCell}>{product.quantity}</Text>
              <Text style={detailStyles.productCell}>₹{product.price}</Text>
            </View>
          ))
        ) : (
          <Text style={detailStyles.noProductsText}>No products found.</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffcc00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
   
      <ScrollView style={styles.scrollView}>
        {orders.length === 0 ? (
          <Text style={styles.noOrdersText}>No orders found.</Text>
        ) : (
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <View style={[styles.headerCell, { flex: 0.8 }]}>
                <Text style={styles.headerText}>Date</Text>
              </View>
              <View style={[styles.headerCell, { flex: 1.2 }]}>
                <Text style={styles.headerText}>Order ID</Text>
              </View>
              <View style={[styles.headerCell, { flex: 1.2 }]}>
                <Text style={styles.headerText}>Customer ID</Text>
              </View>
              <View style={[styles.headerCell, { flex: 1 }]}>
                <Text style={styles.headerText}>Amount</Text>
              </View>
              <View style={[styles.headerCell, styles.actionCell, { flex: 0.8 }]}>
                <Text style={styles.headerText}>Details</Text>
              </View>
              <View style={[styles.headerCell, styles.statusCell, { flex: 1 }]}>
                <Text style={styles.headerText}>Status</Text>
              </View>
            </View>

            {orders.map((order) => (
              <View key={order.id}>
                <TouchableOpacity style={styles.tableRow} onPress={() => handleOrderDetailsPress(order.id)}>
                  <View style={[styles.cell, { flex: 0.8 }]}>
                    <Text style={styles.cellText}>
                      {new Date(order.placed_on * 1000).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </Text>
                  </View>
                  <View style={[styles.cell, { flex: 1.2 }]}>
                    <Text style={styles.cellText}>{order.id}</Text>
                  </View>
                  <View style={[styles.cell, { flex: 1.2 }]}>
                    <Text style={styles.cellText}>{order.customer_id}</Text>
                  </View>
                  <View style={[styles.cell, { flex: 1 }]}>
                    <Text style={styles.cellText}>₹{order.amount}</Text> {/* Corrected: use order.amount */}
                  </View>
                  <View style={[styles.cell, styles.actionCell, { flex: 0.8 }]}>
                    <TouchableOpacity onPress={() => handleOrderDetailsPress(order.id)}>
                      <Text style={styles.detailsButtonText}>{expandedOrderDetailsId === order.id ? "Hide" : "View"}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.cell, styles.statusCell, { flex: 1 }]}>
                    <Text style={styles.deliveryStatusText}>
                      {(order.approve_status|| 'pending').toUpperCase()}
                    </Text>
                  </View>
                </TouchableOpacity>
                {renderOrderDetails(order.id)}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
    dateFilterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 10,
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
      },
      dateButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#ffcc00',
        borderRadius: 5,
    },
      dateButtonText: {
        color: '#fff',
        fontSize: 14,
    },
    scrollView: {
        flex: 1,
        width: '100%',
      },
      loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      },
      container: {
        flex: 1,
        backgroundColor: "#fff",
      },
      tableContainer: {
        margin: 10,
        borderRadius: 5,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E0E0E0",
      },
      noOrdersText: {
        textAlign: "center",
        fontSize: 16,
        color: "#999",
        marginTop: 30,
      },
      tableHeader: {
        flexDirection: "row",
        backgroundColor: "#ffcc00",
        paddingVertical: 10,
      },
      headerCell: {
        flex: 1,
        paddingHorizontal: 5,
      },
      headerText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#fff",
        textAlign: "center",
      },
      tableRow: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: "#E0E0E0",
        backgroundColor: "#fff",
      },
      cell: {
        flex: 1,
        paddingVertical: 8,
        justifyContent: "center",
      },
      actionCell: {
        width: 60,
        alignItems: "center",
      },
      statusCell: {
        width: 80,
        alignItems: "center",
      },
      cellText: {
        fontSize: 12,
        color: "#333",
        textAlign: "center",
      },
      detailsButtonText: {
        fontSize: 11,
        color: "#03A9F4",
      },
      deliveryStatusText: {
        fontSize: 12,
        color: "#333",
        textAlign: "center",
      },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    paginationButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#ffcc00',
        borderRadius: 5,
    },
    paginationButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    disabledButton: {
      backgroundColor: '#ccc',
    },
    disabledButtonText:{
      color: '#666'
    },
    pageInfo: {
        fontSize: 14,
        color: '#333',
    },

});

const detailStyles = StyleSheet.create({
  orderDetailsContainer: {
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  orderDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  productRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productCell: {
    flex: 1,
    fontSize: 11,
    textAlign: 'center',
    color: '#555',
  },
  noProductsText: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    marginTop: 6,
  }
});

export default AdminOrderHistory;