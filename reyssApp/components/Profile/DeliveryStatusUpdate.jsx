import React, { useState, useEffect, useCallback } from "react";
import { 
    View, 
    Text, 
    ActivityIndicator, 
    StyleSheet, 
    FlatList, 
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
                    Amount: ₹{item.amount || 0}
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
        <View style={styles.container}>
            <Text style={styles.headerText}>Delivery Status</Text>
            
            <FlatList
                data={orders}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                    <OrderItem
                        item={item}
                        onStatusUpdate={handleStatusUpdate}
                        loading={loading}
                    />
                )}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No orders found</Text>
                }
            />
            <Toast />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        padding: 16
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333'
    },
    orderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    deliveredCard: {
        backgroundColor: '#F5F5F5',
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50'
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    orderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333'
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold'
    },
    orderDetails: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0'
    },
    detailText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 4
    },
    actionContainer: {
        marginTop: 8
    },
    picker: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        width: '100%',
        height: 50
    },
    disabledPicker: {
        opacity: 0.7,
        backgroundColor: '#E0E0E0'
    },
    emptyText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
        marginTop: 32
    }
});

export default DeliveryStatusUpdate;