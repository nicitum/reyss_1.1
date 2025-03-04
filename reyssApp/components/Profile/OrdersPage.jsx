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

const OrdersPage = () => {
    const [allOrders, setAllOrders] = useState([]); // State to hold all fetched orders
    const [orders, setOrders] = useState([]); // State to hold filtered orders for display
    const [loading, setLoading] = useState(true);
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
        // Filter orders based on the newly selected date
        filterOrdersByDate(date);
    };

    // useCallback for fetchOrders (fetches ALL orders now)
    const fetchOrders = useCallback(async () => {
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
                        orderBy: "DESC",
                    },
                }
            );

            setAllOrders(response.data.orders); // Store ALL fetched orders in allOrders
            console.log("Fetched ALL orders:", response.data.orders.length);
            filterOrdersByDate(selectedDate); // Initial filter to show today's orders

        } catch (error) {
            console.error("Error fetching order history:", error);
            Alert.alert("Error", "Failed to fetch orders. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [navigation]);

    // Function to filter orders based on selectedDate
    const filterOrdersByDate = useCallback((dateFilter) => {
        if (!allOrders) return; // Exit if allOrders is not yet fetched

        const filterDateFormatted = moment(dateFilter).format("YYYY-MM-DD");
        console.log("DEBUG: Filtering Orders for Date:", filterDateFormatted);

        const filteredOrders = allOrders.filter(order => {
            if (!order.placed_on) {
                console.log("DEBUG: order.placed_on is missing for order ID:", order.order_id);
                return false;
            }
            const parsedEpochSeconds = parseInt(order.placed_on, 10);
            const orderDateMoment = moment.unix(parsedEpochSeconds);
            const orderDateFormatted = orderDateMoment.format("YYYY-MM-DD");
            return orderDateFormatted === filterDateFormatted;
        });
        setOrders(filteredOrders); // Set the filtered orders to be displayed
        console.log("Filtered orders count:", filteredOrders.length);
    }, [allOrders]); // Dependency: allOrders - re-filter when allOrders changes


    useEffect(() => {
        fetchOrders(); // Fetch all orders on component mount
    }, [fetchOrders]); // Fetch orders only once on mount

    useEffect(() => {
        filterOrdersByDate(selectedDate); // Re-filter orders when selectedDate changes
    }, [selectedDate, filterOrdersByDate]); // Re-filter when selectedDate changes

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