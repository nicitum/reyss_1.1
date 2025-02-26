import React, { useEffect, useState } from "react";
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

const OrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation();
    const [expandedOrderDetailsId, setExpandedOrderDetailsId] = useState(null);
    const [orderDetails, setOrderDetails] = useState({});


    const fetchOrders = async () => {
        try {
            setLoading(true);
            const token = await checkTokenAndRedirect(navigation);
            if (!token) throw new Error("No authorization token found.");

            const response = await axios.get(
                `http://${ipAddress}:8090/orderHistory`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    params: {
                        orderBy: "DESC", // Keep orderBy if needed, remove pagination params
                    },
                }
            );

            setOrders(response.data.orders);
            console.log(response.data.orders)
        } catch (error) {
            console.error("Error fetching order history:", error);
            Alert.alert("Error", "Failed to fetch orders. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []); // Fetch orders on component mount


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
            <View style={styles.orderDetailsContainer}>
                <Text style={styles.orderDetailsTitle}>Order Details:</Text>
                {products.length > 0 ? (
                    products.map((product, index) => (
                        <View key={`${orderId}-${product.product_id}-${index}`} style={styles.productDetailItem}>
                            <Text style={styles.productDetailText}>
                                {product.name} - Quantity: {product.quantity}, Price: ₹{product.price}, Category: {product.category}
                            </Text>
                        </View>
                    ))
                ) : (
                    <Text style={styles.noProductsText}>No products found for this order.</Text>
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
            <ScrollView>
                {orders.length === 0 ? (
                    <Text style={styles.noOrdersText}>No orders found.</Text>
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
                            <View key={order.order_id}>
                                <TouchableOpacity style={styles.tableRow} onPress={() => handleOrderDetailsPress(order.order_id)}>
                                    <View style={styles.cell}>
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
                                    <View style={styles.cell}>
                                        <Text style={styles.cellText}>{order.order_id}</Text>
                                    </View>
                                    <View style={styles.cell}>
                                        <Text style={styles.cellText}>₹{order.total_amount}</Text>
                                    </View>
                                    <View style={[styles.cell, styles.actionCell]}>
                                        <TouchableOpacity onPress={() => handleOrderDetailsPress(order.order_id)}>
                                            <Text style={styles.detailsButtonText}>{expandedOrderDetailsId === order.order_id ? "Hide" : "View"}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={[styles.cell, styles.statusCell]}>
                                        <Text style={styles.deliveryStatusText}>
                                            {(order.delivery_status || 'pending').toUpperCase()}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                                {renderOrderDetails(order.order_id)}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
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
        width: 80, // Adjust width as needed for the button
        alignItems: "center",
    },
    statusCell: {
        width: 100, // Adjust width as needed for status text
        alignItems: "center",
    },
    cellText: {
        fontSize: 13,
        color: "#333",
        textAlign: "center",
    },
    detailsButtonText: {
        fontSize: 12,
        color: "#03A9F4", // Example color for details button
    },
    deliveryStatusText: {
        fontSize: 12,
        color: "#333",
        textAlign: "center",
    },
    orderDetailsContainer: {
        padding: 15,
        backgroundColor: '#f9f9f9',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    orderDetailsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    productDetailItem: {
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        marginBottom: 8,
    },
    productDetailText: {
        fontSize: 14,
        color: '#555',
    },
    noProductsText: {
        fontSize: 14,
        color: '#777',
        textAlign: 'center',
        marginTop: 10,
    }
});

export default OrdersPage;