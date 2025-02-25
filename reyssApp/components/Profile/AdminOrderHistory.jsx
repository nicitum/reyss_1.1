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
import Pagination from "../general/Pagination";
import { jwtDecode } from "jwt-decode";

const AdminOrderHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [navigation, setNavigation] = useState(useNavigation());
    const [expandedOrderDetailsId, setExpandedOrderDetailsId] = useState(null);
    const [orderDetails, setOrderDetails] = useState({});

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);
    const ITEMS_PER_PAGE = 10;

    const fetchOrders = async (page) => {
        try {
            setLoading(true);
            const token = await checkTokenAndRedirect(navigation);
            if (!token) throw new Error("No authorization token found.");

            const decodedToken = jwtDecode(token);
            const adminId = decodedToken.id1;

            const response = await axios.get(
                `http://${ipAddress}:8090/get-admin-orders/${adminId}`, // **Admin-specific endpoint**
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    params: {
                        page: page,
                        limit: ITEMS_PER_PAGE,
                        orderBy: "DESC",
                    },
                }
            );

            setOrders(response.data.orders);
            setTotalOrders(response.data.count);
            setTotalPages(Math.ceil(response.data.count / ITEMS_PER_PAGE));
            console.log("FETCH ORDERS RESPONSE DATA.ORDERS:", response.data.orders); // Enhanced log - STEP 1
        } catch (error) {
            console.error("Error fetching admin orders:", error);
            Alert.alert("Error", "Failed to fetch orders. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders(currentPage);
    }, [currentPage]);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const fetchOrderProducts = async (orderId) => { // Parameter name updated to orderId
        try {
            const token = await checkTokenAndRedirect(navigation);
            if (!token) throw new Error("No authorization token found.");

            const response = await axios.get(
                `http://${ipAddress}:8090/order-products?orderId=${orderId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('FETCH ORDER PRODUCTS RESPONSE DATA:', response.data);
            return response.data;
        } catch (error) {
            console.error("Error fetching order products:", error);
            Alert.alert("Error", "Failed to fetch order details.");
            return [];
        }
    };

    const handleOrderDetailsPress = async (orderId) => { // Parameter name already orderId, no change needed
        console.log("handleOrderDetailsPress for orderId:", orderId);
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
                {products.length > 0 ? (
                    products.map((product, index) => (
                        <View key={`${orderId}-${product.product_id}-${index}`} style={detailStyles.productDetailItem}>
                            <Text style={detailStyles.productDetailText}>
                                {product.name} - Qty: {product.quantity}, Price: ₹{product.price}, Cat: {product.category}
                            </Text>
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
            <ScrollView>
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
                                <Text style={styles.headerText}>Customer Name</Text>
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
                            <View key={order.id}> {/* Corrected: key={order.id} */}
                                <TouchableOpacity style={styles.tableRow} onPress={() => handleOrderDetailsPress(order.id)}> {/* Corrected: onPress={() => handleOrderDetailsPress(order.id)} */}
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
                                        <Text style={styles.cellText}>{order.id}</Text> {/* Corrected: Display order.id */}
                                    </View>
                                    <View style={[styles.cell, { flex: 1.2 }]}>
                                        <Text style={styles.cellText}>{order.customer_id}</Text> {/* Corrected: Display order.id */}
                                    </View>
                                    <View style={[styles.cell, { flex: 1 }]}>
                                        <Text style={styles.cellText}>₹{order.total_amount}</Text>
                                    </View>
                                    <View style={[styles.cell, styles.actionCell, { flex: 0.8 }]}>
                                        <TouchableOpacity onPress={() => handleOrderDetailsPress(order.id)}> {/* Corrected: onPress={() => handleOrderDetailsPress(order.id)} */}
                                            <Text style={styles.detailsButtonText}>{expandedOrderDetailsId === order.id ? "Hide" : "View"}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={[styles.cell, styles.statusCell, { flex: 1 }]}>
                                        <Text style={styles.deliveryStatusText}>
                                            {(order.delivery_status || 'pending').toUpperCase()}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                                {renderOrderDetails(order.id)} {/* Corrected: renderOrderDetails(order.id) */}
                            </View>
                        ))}
                    </View>
                )}

                {orders.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalOrders}
                        onPageChange={handlePageChange}
                        itemsLabel="Orders"
                        primaryColor="#ffcc00"
                        style={styles.paginationStyle}
                    />
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({ // Compact Styles -  Re-applied
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
    paginationStyle: {
        borderTopWidth: 1,
        borderTopColor: "#E0E0E0",
        paddingVertical: 10,
    },
});

const detailStyles = StyleSheet.create({ // detailStyles - Re-applied (Compact)
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
    productDetailItem: {
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        marginBottom: 6,
    },
    productDetailText: {
        fontSize: 12,
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