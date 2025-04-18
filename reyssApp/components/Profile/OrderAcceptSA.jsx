import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    ScrollView,
} from "react-native";
import { Checkbox } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from 'jwt-decode';
import { ipAddress } from "../../urls";
import moment from 'moment';
import Toast from "react-native-toast-message";
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';

const OrderAcceptSA = () => {
    const [users, setUsers] = useState([]);
    const [amOrders, setAmOrders] = useState([]);
    const [pmOrders, setPmOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedOrderIds, setSelectedOrderIds] = useState({});
    const [selectAllOrders, setSelectAllOrders] = useState(false);

    // Fetch all users
    const fetchAllUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            if (!token) {
                throw new Error("Authentication token not found. Please log in.");
            }

            const url = `http://${ipAddress}:8090/allUsers/`;
            const response = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch users: ${response.status} - ${errorText}`);
            }

            const responseJson = await response.json();
            if (responseJson && responseJson.data && Array.isArray(responseJson.data)) {
                setUsers(responseJson.data);
            } else {
                setUsers([]);
                setError("No customers found.");
            }
        } catch (fetchError) {
            setError(fetchError.message || "Failed to fetch users.");
            Toast.show({ type: 'error', text1: 'Fetch Error', text2: fetchError.message });
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAllOrders = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            if (!token) throw new Error("No authentication token found");
    
            // Get today's date in YYYY-MM-DD format
            const todayFormatted = moment().format("YYYY-MM-DD");
    
            const response = await axios.get(`http://${ipAddress}:8090/get-orders-sa?date=${todayFormatted}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });
            console.log("Response from get-orders-sa:", response.data);
    
            if (!response.data || !response.data.status) {
                throw new Error(response.data?.message || "No valid data received from server");
            }
    
            // Backend filters by date, so use orders directly
            const orders = response.data.orders;
            console.log("todaysOrders:", orders);
    
            // Filter into AM and PM orders
            const amOrdersToday = orders.filter(order => order.order_type === 'AM');
            const pmOrdersToday = orders.filter(order => order.order_type === 'PM');
    
            setAmOrders(amOrdersToday);
            setPmOrders(pmOrdersToday);
    
        } catch (error) {
            const errorMessage = error.response?.data?.message ||
                error.message ||
                "Failed to fetch orders";
            setError(errorMessage);
            Toast.show({
                type: 'error',
                text1: 'Fetch Error',
                text2: errorMessage
            });
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            const fetchData = async () => {
                try {
                    await Promise.all([fetchAllUsers(), fetchAllOrders()]);
                    setSelectedOrderIds({});
                    setSelectAllOrders(false);
                } catch (err) {
                    console.error("Error initializing data:", err);
                }
            };
            fetchData();

            return () => {
                setAmOrders([]);
                setPmOrders([]);
                setUsers([]);
            };
        }, [fetchAllUsers, fetchAllOrders])
    );

    useEffect(() => {
        if (selectAllOrders) {
            let allOrderIds = {};
            amOrders.forEach(order => allOrderIds[order.id] = true);
            pmOrders.forEach(order => allOrderIds[order.id] = true);
            setSelectedOrderIds(allOrderIds);
        } else {
            setSelectedOrderIds({});
        }
    }, [selectAllOrders, amOrders, pmOrders]);

    const updateOrderStatusInState = (orderId, status) => {
        const updatedAMOrders = amOrders.map(order => {
            if (order.id === orderId) {
                return { ...order, approve_status: status };
            }
            return order;
        });
        setAmOrders(updatedAMOrders);

        const updatedPMOrders = pmOrders.map(order => {
            if (order.id === orderId) {
                return { ...order, approve_status: status };
            }
            return order;
        });
        setPmOrders(updatedPMOrders);
    };

    const handleCheckboxChange = (orderId, isSelected) => {
        setSelectedOrderIds(prevSelectedOrderIds => {
            const updatedSelectedOrderIds = { ...prevSelectedOrderIds };
            if (isSelected) {
                updatedSelectedOrderIds[orderId] = true;
            } else {
                delete updatedSelectedOrderIds[orderId];
            }
            return updatedSelectedOrderIds;
        });
    };

    const handleBulkApprove = async () => {
        const orderIdsToApprove = Object.keys(selectedOrderIds);
        if (orderIdsToApprove.length === 0) {
            Alert.alert("No Orders Selected", "Please select orders to approve.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const userAuthToken = await AsyncStorage.getItem("userAuthToken");
            for (const orderId of orderIdsToApprove) {
                const response = await fetch(`http://${ipAddress}:8090/update-order-status`, {
                    method: 'POST',
                    headers: {
                        "Authorization": `Bearer ${userAuthToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ id: parseInt(orderId), approve_status: 'Accepted' })
                });

                if (!response.ok) {
                    const message = `HTTP Error approving order ID ${orderId}. Status: ${response.status}`;
                    console.error(message);
                    continue;
                }
                const responseData = await response.json();
                if (responseData.success) {
                    updateOrderStatusInState(parseInt(orderId), 'Accepted');
                }
            }

            Alert.alert("Success", "Selected orders approved successfully");
            setSelectedOrderIds({});
            setSelectAllOrders(false);

            // Refresh orders after approval
            await fetchAllOrders();
        } catch (err) {
            console.error("Error bulk approving orders:", err);
            Alert.alert("Error", "Failed to approve selected orders. Please try again.");
            setError("Failed to approve selected orders. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const renderUserOrderItem = ({ item: user }) => {
        const today = moment();
        const userAMOrdersToday = amOrders.filter(order => order.customer_id === user.customer_id);
        const userPMOrdersToday = pmOrders.filter(order => order.customer_id === user.customer_id);

        return (
            <View style={styles.userOrderItemContainer}>
                <View style={styles.userInfoSection}>
                    <Text style={styles.userNameText}>{user.name}</Text>
                    <Text style={styles.userRouteText}><Text style={styles.boldText}>Route:</Text> {user.route}</Text>
                </View>

                <View style={styles.userOrdersSection}>
                    <Text style={styles.sectionHeaderText}>AM Orders:</Text>
                    {userAMOrdersToday.length > 0 ? (
                        userAMOrdersToday.map(order => (
                            <View key={order.id} style={styles.orderItem}>
                                <View style={styles.orderRow}>
                                    <Checkbox
                                        status={!!selectedOrderIds[order.id] ? 'checked' : 'unchecked'}
                                        onPress={() => handleCheckboxChange(order.id, !selectedOrderIds[order.id])}
                                        style={styles.orderCheckbox}
                                    />
                                    <View style={styles.orderInfo}>
                                        <Text style={styles.orderIdText}><Text style={styles.boldText}>Order ID:</Text> {order.id}</Text>
                                        <Text style={styles.orderDateText}><Text style={styles.boldText}>Placed On:</Text> {moment.unix(order.placed_on).format('DD MMM, YYYY')}</Text>
                                        <Text style={styles.orderAmountText}><Text style={styles.boldText}>Amount:</Text> ₹{order.total_amount || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.orderStatusContainer}>
                                        <Text style={styles.orderStatusLabel}><Text style={styles.boldText}>Status: </Text>
                                            {order.approve_status === 'Altered' ? (
                                                <Text style={styles.orderAlteredText}>Altered</Text>
                                            ) : (
                                                <Text style={order.approve_status === 'Accepted' ? styles.orderAcceptedText : styles.orderPendingText}>
                                                    {order.approve_status === 'Accepted' ? 'Accepted' : 'PENDING'}
                                                </Text>
                                            )}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noOrdersText}>No AM orders for today.</Text>
                    )}

                    <Text style={[styles.sectionHeaderText, styles.pmOrdersHeaderText]}>PM Orders:</Text>
                    {userPMOrdersToday.length > 0 ? (
                        userPMOrdersToday.map(order => (
                            <View key={order.id} style={styles.orderItem}>
                                <View style={styles.orderRow}>
                                    <Checkbox
                                        status={!!selectedOrderIds[order.id] ? 'checked' : 'unchecked'}
                                        onPress={() => handleCheckboxChange(order.id, !selectedOrderIds[order.id])}
                                        style={styles.orderCheckbox}
                                    />
                                    <View style={styles.orderInfo}>
                                        <Text style={styles.orderIdText}><Text style={styles.boldText}>Order ID:</Text> {order.id}</Text>
                                        <Text style={styles.orderDateText}><Text style={styles.boldText}>Placed On:</Text> {moment.unix(order.placed_on).format('DD MMM, YYYY hh:mm A')}</Text>
                                        <Text style={styles.orderAmountText}><Text style={styles.boldText}>Amount:</Text> ₹{order.total_amount || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.orderStatusContainer}>
                                        <Text style={styles.orderStatusLabel}><Text style={styles.boldText}>Status: </Text>
                                            {order.approve_status === 'Altered' ? (
                                                <Text style={styles.orderAlteredText}>Altered</Text>
                                            ) : (
                                                <Text style={order.approve_status === 'Accepted' ? styles.orderAcceptedText : styles.orderPendingText}>
                                                    {order.approve_status === 'Accepted' ? 'Accepted' : 'PENDING'}
                                                </Text>
                                            )}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noOrdersText}>No PM orders for today.</Text>
                    )}
                </View>
            </View>
        );
    };

    const renderContent = () => {
        return (
            <View style={styles.tabContentContainer}>
                <View style={[styles.bulkActionsContainer, { justifyContent: 'flex-start' }]}>
                    <View style={styles.selectAllContainer}>
                        <Checkbox
                            status={selectAllOrders ? 'checked' : 'unchecked'}
                            onPress={() => setSelectAllOrders(!selectAllOrders)}
                            style={styles.selectAllCheckbox}
                        />
                        <Text style={styles.selectAllText}>Select All Orders</Text>
                    </View>

                    <TouchableOpacity style={styles.bulkActionButton} onPress={handleBulkApprove}>
                        <Text style={styles.bulkActionButtonText}>Accept Selected</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.usersScrollView}>
                    {users.length > 0 ? (
                        users.map(user => renderUserOrderItem({ item: user }))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                No users found.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ffcc00" />
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {renderContent()}
                </View>
            )}
        </View>
    );
};

// Reuse the same styles from AdminAssignedUsersPage
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f4f4',
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: 'red',
        textAlign: 'center',
    },
    tabContentContainer: {
        flex: 1,
        paddingHorizontal: 15,
        paddingBottom: 15,
    },
    usersScrollView: {
        flex: 1,
    },
    userOrderItemContainer: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 15,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    userInfoSection: {
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    userNameText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    userRouteText: {
        fontSize: 16,
        color: '#555',
    },
    userOrdersSection: {
        // Styles for orders section
    },
    sectionHeaderText: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 10,
        marginBottom: 8,
    },
    pmOrdersHeaderText: {
        marginTop: 15,
    },
    orderItem: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    orderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    orderCheckbox: {
        marginRight: 10,
    },
    orderInfo: {
        flex: 1,
    },
    orderIdText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 3,
    },
    orderDateText: {
        fontSize: 14,
        color: '#777',
        marginBottom: 3,
    },
    orderAmountText: {
        fontSize: 14,
        color: '#777',
    },
    orderStatusContainer: {
        marginLeft: 10,
    },
    orderStatusLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    orderPendingText: {
        fontWeight: 'bold',
    },
    orderAcceptedText: {
        color: 'green',
        fontWeight: 'bold',
    },
    orderAlteredText: {
        color: 'blue',
        fontWeight: 'bold',
    },
    boldText: {
        fontWeight: 'bold',
    },
    noOrdersText: {
        fontSize: 14,
        color: '#777',
        fontStyle: 'italic',
        marginTop: 5,
        marginLeft: 10,
    },
    bulkActionsContainer: {
        flexDirection: 'row',
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 10,
    },
    selectAllContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
    },
    selectAllText: {
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 16,
    },
    bulkActionButton: {
        backgroundColor: '#FFBF00',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 8,
        marginLeft: 8,
    },
    bulkActionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#777',
        textAlign: 'center',
    },
});

export default OrderAcceptSA;