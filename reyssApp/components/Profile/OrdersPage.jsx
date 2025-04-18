import React, { useEffect, useState, useCallback } from "react";
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
import moment from 'moment';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

const OrdersPage = () => {
    const [orders, setOrders] = useState([]); // State to hold fetched orders
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigation = useNavigation();
    const [expandedOrderDetailsId, setExpandedOrderDetailsId] = useState(null);
    const [orderDetails, setOrderDetails] = useState({});

    // Date Picker State
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const showDatePicker = () => {
        setDatePickerVisibility(true);
    };

    const hideDatePicker = () => {
        setDatePickerVisibility(false);
    };

    const handleConfirm = (date) => {
        hideDatePicker();
        setSelectedDate(date);
    };

    // Fetch orders using the new API
    const fetchOrders = useCallback(async () => {
        console.log("[DEBUG] Fetching user orders");
        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            if (!token) {
                throw new Error("Authentication token missing");
            }

            const decodedToken = jwtDecode(token);
            const custId = decodedToken.id;

            // Construct the URL with optional date query parameter
            let url = `http://${ipAddress}:8090/get-orders/${custId}`;
            const formattedDate = moment(selectedDate).format("YYYY-MM-DD");
            if (formattedDate) {
                url += `?date=${formattedDate}`;
            }
            console.log("[DEBUG] Fetching orders from:", url);

            const headers = {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Accept: "application/json",
            };

            const response = await axios.get(url, { headers, timeout: 10000 });

            console.log("[DEBUG] Orders response:", response.data);

            const ordersData = response.data;
            if (!ordersData.status) {
                throw new Error(ordersData.message || "Failed to fetch orders");
            }

            setOrders(ordersData.orders);
        } catch (error) {
            console.error("[ERROR] Failed to fetch orders:", error);
            const errorMsg = error.response?.data?.message || error.message || "Failed to fetch customer orders.";
            setError(errorMsg);
            Alert.alert("Error", errorMsg);
        } finally {
            setLoading(false);
        }
    }, [selectedDate, navigation]);

    useEffect(() => {
        fetchOrders(); // Fetch orders when component mounts or selectedDate changes
    }, [fetchOrders, selectedDate]);

    const fetchOrderProducts = async (orderId) => {
        try {
            const token = await checkTokenAndRedirect(navigation);
            if (!token) throw new Error("No authorization token found.");

            const response = await axios.get(
                `http://${ipAddress}:8090/order-products`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    params: {
                        orderId: orderId,
                    },
                }
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
                setOrderDetails(prevDetails => ({ ...prevDetails, [orderId]: products }));
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
            <View style={styles.dateFilterContainer}>
                <TouchableOpacity style={styles.dateButton} onPress={showDatePicker}>
                    <Text style={styles.dateButtonText}>
                        {moment(selectedDate).format('YYYY-MM-DD')}
                    </Text>
                </TouchableOpacity>
            </View>

            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleConfirm}
                onCancel={hideDatePicker}
                date={selectedDate}
            />

            <ScrollView>
                {orders.length === 0 ? (
                    <Text style={styles.noOrdersText}>No orders found for selected date.</Text>
                ) : (
                    <View style={styles.tableContainer}>
                        <View style={styles.tableHeader}>
                            <View style={styles.headerCell}>
                                <Text style={styles.headerText}>Date</Text>
                            </View>
                            <View style={styles.headerCell}>
                                <Text style={styles.headerText}>ID</Text>
                            </View>
                            <View style={styles.headerCell}>
                                <Text style={styles.headerText}>Amount</Text>
                            </View>
                            <View style={[styles.headerCell, styles.actionCell]}>
                                <Text style={styles.headerText}>Details</Text>
                            </View>
                            <View style={[styles.headerCell, styles.statusCell]}>
                                <Text style={styles.headerText}>Status</Text>
                            </View>
                        </View>

                        {orders.map((order) => (
                            <View key={order.id}>
                                <TouchableOpacity style={styles.tableRow} onPress={() => handleOrderDetailsPress(order.id)}>
                                    <View style={styles.cell}>
                                        <Text style={styles.cellText}>
                                            {moment.unix(order.placed_on).format("MMM DD, YYYY")}
                                        </Text>
                                    </View>
                                    <View style={styles.cell}>
                                        <Text style={styles.cellText}>{order.id}</Text>
                                    </View>
                                    <View style={styles.cell}>
                                        <Text style={styles.cellText}>₹{order.total_amount}</Text>
                                    </View>
                                    <View style={[styles.cell, styles.actionCell]}>
                                        <TouchableOpacity onPress={() => handleOrderDetailsPress(order.id)}>
                                            <Text style={styles.detailsButtonText}>{expandedOrderDetailsId === order.id ? "Hide" : "View"}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={[styles.cell, styles.statusCell]}>
                                        <Text style={styles.deliveryStatusText}>
                                            {(order.delivery_status || 'pending').toUpperCase()}
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
        justifyContent: 'flex-start',
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
        borderRadius: 8,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "#E0E0E0",
    },
    noOrdersText: {
        textAlign: "center",
        fontSize: 18,
        color: "#999",
        marginTop: 40,
    },
    tableHeader: {
        flexDirection: "row",
        backgroundColor: "#ffcc00",
        paddingVertical: 15,
    },
    headerCell: {
        flex: 1,
        paddingHorizontal: 8,
    },
    headerText: {
        fontSize: 14,
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
        paddingVertical: 12,
        justifyContent: "center",
    },
    actionCell: {
        width: 80,
        alignItems: "center",
    },
    statusCell: {
        width: 100,
        alignItems: "center",
    },
    cellText: {
        fontSize: 13,
        color: "#333",
        textAlign: "center",
    },
    detailsButtonText: {
        fontSize: 12,
        color: "#03A9F4",
    },
    deliveryStatusText: {
        fontSize: 12,
        color: "#333",
        textAlign: "center",
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

export default OrdersPage;