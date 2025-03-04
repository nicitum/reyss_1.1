import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
    ScrollView, // Changed FlatList to ScrollView
    TouchableOpacity
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { ipAddress } from "../../urls";
import { jwtDecode } from "jwt-decode";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from 'react-native-toast-message';

const OrderItem = React.memo(({ item, onStatusUpdate, loading }) => {
    const [localStatus, setLocalStatus] = useState(item.delivery_status || 'pending');
    const isDelivered = localStatus === 'delivered';

    const handleStatusChange = async (newStatus) => {
        if (isDelivered) return; // Prevent changes if already delivered

        try {
            await onStatusUpdate(item.id, newStatus);
            setLocalStatus(newStatus);
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Update Failed',
                text2: error.message
            });
        }
    };

    return (
        <View style={[styles.orderCard, isDelivered && styles.deliveredCard]}>
            <View style={styles.orderHeader}>
                <Text style={styles.orderTitle}>Order #{item.id}</Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: isDelivered ? '#4CAF50' : '#FFA000' }
                ]}>
                    <Text style={styles.statusText}>
                        {isDelivered ? 'Delivered' : 'Pending'}
                    </Text>
                </View>
            </View>

            <View style={styles.orderDetails}>
                <Text style={styles.detailText}>
                    Date: {new Date(item.placed_on * 1000).toLocaleDateString()}
                </Text>
                <Text style={styles.detailText}>
                    Amount: ₹{item.total_amount || 0}
                </Text>
            </View>

            {!isDelivered && (
                <View style={styles.actionContainer}>
                    <Picker
                        enabled={!isDelivered && !loading}
                        selectedValue={localStatus}
                        style={[styles.picker, isDelivered && styles.disabledPicker]}
                        onValueChange={handleStatusChange}
                    >
                        <Picker.Item label="Pending" value="pending" />
                        <Picker.Item label="Delivered" value="delivered" />
                    </Picker>
                </View>
            )}
        </View>
    );
});

const DeliveryStatusUpdate = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [customerId, setCustomerId] = useState(null);

    useEffect(() => {
        initializeData();
    }, []);

    const initializeData = async () => {
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            if (!token) throw new Error("Authentication required");

            const decoded = jwtDecode(token);
            setCustomerId(decoded.id);
            await fetchOrders(decoded.id);
        } catch (error) {
            setError(error.message);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to initialize data'
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async (userId) => {
        try {
            const response = await axios.get(`http://${ipAddress}:8090/get-orders/${userId}`);
            if (response.data.status) {
                setOrders(response.data.orders);
            } else {
                throw new Error(response.data.message);
            }
        } catch (error) {
            throw new Error("Failed to fetch orders");
        }
    };

    const handleStatusUpdate = async (orderId, newStatus) => {
        setLoading(true);
        try {
            const response = await axios.post(
                `http://${ipAddress}:8090/update-delivery-status`,
                {
                    customer_id: customerId,
                    order_id: orderId,
                    delivery_status: newStatus
                }
            );

            if (response.data.status) {
                // Update local state
                setOrders(prevOrders =>
                    prevOrders.map(order =>
                        order.id === orderId
                            ? { ...order, delivery_status: newStatus }
                            : order
                    )
                );

                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Status updated successfully'
                });
            } else {
                throw new Error(response.data.message);
            }
        } catch (error) {
            throw new Error("Failed to update status");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
                <Text style={styles.headerText}>Delivery Status</Text>

                {orders.length > 0 ? (
                    orders.map((item) => (
                        <OrderItem
                            key={item.id.toString()}
                            item={item}
                            onStatusUpdate={handleStatusUpdate}
                            loading={loading}
                        />
                    ))
                ) : (
                    <Text style={styles.emptyText}>No orders found</Text>
                )}
                <Toast />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    scrollContainer: { // Added scroll container style
        paddingVertical: 16, // Add vertical padding to the scroll view content
    },
    container: {
        flexGrow: 1, // Ensure container can grow within ScrollView
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 16,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerText: {
        fontSize: 22, // Slightly reduced header font size
        fontWeight: 'bold',
        marginBottom: 16, // Slightly reduced header margin
        color: '#333'
    },
    orderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8, // Slightly reduced card border radius
        padding: 12, // Reduced card padding
        marginBottom: 12, // Reduced card margin bottom
        elevation: 2, // Reduced elevation
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 }, // Reduced shadow height
        shadowOpacity: 0.1,
        shadowRadius: 2 // Reduced shadow radius
    },
    deliveredCard: {
        backgroundColor: '#F5F5F5',
        borderLeftWidth: 3, // Reduced border width
        borderLeftColor: '#4CAF50'
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8 // Reduced margin bottom
    },
    orderTitle: {
        fontSize: 16, // Reduced title font size
        fontWeight: 'bold',
        color: '#333'
    },
    statusBadge: {
        paddingHorizontal: 8, // Reduced padding horizontal
        paddingVertical: 4, // Reduced padding vertical
        borderRadius: 12 // Reduced border radius
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 12, // Reduced status text font size
        fontWeight: 'bold'
    },
    orderDetails: {
        marginBottom: 12, // Reduced margin bottom
        paddingBottom: 12, // Reduced padding bottom
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0'
    },
    detailText: {
        fontSize: 14, // Reduced detail text font size
        color: '#666',
        marginBottom: 3 // Reduced margin bottom
    },
    actionContainer: {
        marginTop: 4 // Reduced margin top
    },
    picker: {
        backgroundColor: '#F5F5F5',
        borderRadius: 6, // Reduced picker border radius
        width: '100%',
        height: 50 // Reduced picker height
    },
    disabledPicker: {
        opacity: 0.7,
        backgroundColor: '#E0E0E0'
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 14, // Reduced empty text font size
        color: '#666',
        marginTop: 24 // Reduced margin top
    }
});

export default DeliveryStatusUpdate;