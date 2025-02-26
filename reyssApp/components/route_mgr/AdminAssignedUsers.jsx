import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    
} from "react-native";

import { Checkbox } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from 'jwt-decode';
import { ipAddress } from "../../urls";

import { useNavigation } from "@react-navigation/native";
import moment from 'moment';
import Toast from "react-native-toast-message";
import { useFocusEffect } from '@react-navigation/native'; 

const AdminAssignedUsersPage = () => {
    const [assignedUsers, setAssignedUsers] = useState([]);
    const [amAdminOrders, setAmAdminOrders] = useState([]);
    const [pmAdminOrders, setPmAdminOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [adminId, setAdminId] = useState(null);
    const navigation = useNavigation();
    const [selectedOrderIds, setSelectedOrderIds] = useState({});
    const [selectAllOrders, setSelectAllOrders] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            const fetchInitialData = async () => {
                setLoading(true);
                setError(null);
                try {
                    const userAuthToken = await AsyncStorage.getItem("userAuthToken");
                    if (!userAuthToken) {
                        setError("User authentication token not found.");
                        return;
                    }
        
                    const decodedToken = jwtDecode(userAuthToken);
                    const currentAdminId = decodedToken.id1;
                    setAdminId(currentAdminId);
        
                    // Fetch all data in parallel
                    await Promise.all([
                        fetchAssignedUsers(currentAdminId, userAuthToken),
                        fetchAMAdminOrders(currentAdminId, userAuthToken),
                        fetchPMAdminOrders(currentAdminId, userAuthToken)
                    ]);

                    // Clear selected orders when refreshing
                    setSelectedOrderIds({});
                    setSelectAllOrders(false);
        
                } catch (err) {
                    console.error("Error initializing data:", err);
                    setError("Error loading data. Please try again.");
                } finally {
                    setLoading(false);
                }
            };
        
            fetchInitialData();

            // Optional: Return a cleanup function
            return () => {
                // Clean up any subscriptions or pending requests here
                setAmAdminOrders([]);
                setPmAdminOrders([]);
                setAssignedUsers([]);
            };
        }, []) // Empty dependency array since we want to run this every time the screen focuses
    );

    useEffect(() => {
        if (selectAllOrders) {
            let allOrderIds = {};
            // Include all AM orders regardless of status
            amAdminOrders.forEach(order => allOrderIds[order.id] = true);
            // Include all PM orders regardless of status
            pmAdminOrders.forEach(order => allOrderIds[order.id] = true);
            setSelectedOrderIds(allOrderIds);
        } else {
            setSelectedOrderIds({});
        }
    }, [selectAllOrders, amAdminOrders, pmAdminOrders]);


    const fetchAssignedUsers = async (currentAdminId, userAuthToken) => {
        try {
            const response = await fetch(`http://${ipAddress}:8090/assigned-users/${currentAdminId}`, {
                headers: {
                    "Authorization": `Bearer ${userAuthToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const message = `Failed to fetch assigned users. Status: ${response.status}`;
                throw new Error(message);
            }

            const responseData = await response.json();
            console.log(responseData)
            if (responseData.success) {
                setAssignedUsers(responseData.assignedUsers);
            } else {
                setError(responseData.message || "Failed to fetch assigned users.");
            }
        } catch (err) {
            console.error("Error fetching assigned users:", err);
            setError("Error fetching assigned users. Please try again.");
        }
    };

    const fetchAMAdminOrders = async (currentAdminId, userAuthToken) => {
        let apiUrl = `http://${ipAddress}:8090/get-admin-orders/${currentAdminId}`;

        try {
            const response = await fetch(apiUrl, {
                headers: {
                    "Authorization": `Bearer ${userAuthToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const message = `Failed to fetch admin orders. Status: ${response.status}`;
                throw new Error(message);
            }

            const responseData = await response.json();
            console.log('orders',responseData)
            if (responseData.success) {
                filterAMOrdersByDate(responseData.orders);
            } else {
                setError(responseData.message || "Failed to fetch admin orders.");
            }
        } catch (err) {
            console.error("Error fetching AM admin orders:", err);
            setError("Error fetching AM admin orders. Please try again.");
        }
    };

    const fetchPMAdminOrders = async (currentAdminId, userAuthToken) => {
        let apiUrl = `http://${ipAddress}:8090/get-admin-orders/${currentAdminId}`;

        try {
            const response = await fetch(apiUrl, {
                headers: {
                    "Authorization": `Bearer ${userAuthToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const message = `Failed to fetch admin orders. Status: ${response.status}`;
                throw new Error(message);
            }

            const responseData = await response.json();
            if (responseData.success) {
                filterPMOrdersByDate(responseData.orders);
            } else {
                setError(responseData.message || "Failed to fetch PM admin orders.");
            }
        } catch (err) {
            console.error("Error fetching PM admin orders:", err);
            setError("Error fetching PM admin orders. Please try again.");
        }
    };


    const filterAMOrdersByDate = (orders) => {
        const today = new Date();

        const startOfToday = new Date(today);
        startOfToday.setHours(0, 0, 0, 0);
        const startOfTodayTimestamp = Math.floor(startOfToday.getTime() / 1000);

        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        const endOfTodayTimestamp = Math.floor(endOfToday.getTime() / 1000);

        let filteredOrders = orders.filter(order => {
            const orderTimestamp = order.placed_on;
            return order.order_type === 'AM' && orderTimestamp >= startOfTodayTimestamp && orderTimestamp <= endOfTodayTimestamp; // **TODAY ONLY FILTER**
        });
        setAmAdminOrders(filteredOrders);
    };

    const filterPMOrdersByDate = (orders) => {
        const today = new Date();

        const startOfToday = new Date(today);
        startOfToday.setHours(0, 0, 0, 0);
        const startOfTodayTimestamp = Math.floor(startOfToday.getTime() / 1000);

        const endOfToday = new Date(today);
        endOfToday.setHours(23, 59, 59, 999);
        const endOfTodayTimestamp = Math.floor(endOfToday.getTime() / 1000);


        let filteredOrders = orders.filter(order => {
            const orderTimestamp = order.placed_on;
            return order.order_type === 'PM' && orderTimestamp >= startOfTodayTimestamp && orderTimestamp <= endOfTodayTimestamp; // **TODAY ONLY FILTER**
        });
        setPmAdminOrders(filteredOrders);
    };




    const updateOrderStatusInState = (orderId, status) => {
        console.log(`Updating order status in state for order ID: ${orderId} to status: ${status}`);

        const updatedAMOrders = amAdminOrders.map(order => {
            if (order.id === orderId) {
                console.log(`  AM Order ID ${orderId} status updated to: ${status}`);
                return { ...order, approve_status: status };
            }
            return order;
        });
        setAmAdminOrders(updatedAMOrders);

        const updatedPMOrders = pmAdminOrders.map(order => {
            if (order.id === orderId) {
                console.log(`  PM Order ID ${orderId} status updated to: ${status}`);
                return { ...order, approve_status: status };
            }
            return order;
        });
        setPmAdminOrders(updatedPMOrders);
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
            // **Corrected Bulk Approval Logic:** Iterate over all selectedOrderIds
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
                    console.error(message); // Log HTTP error
                    continue;
                }
                const responseData = await response.json();
                if (responseData.success) {
                    updateOrderStatusInState(parseInt(orderId), 'Accepted'); // Update UI for each approved order
                    console.log(`Bulk Approval: Order ID ${orderId} approval processed successfully.`); // ADDED LOGGING FOR BULK ACTIONS
                } else {
                    console.error(`Bulk Approval API Error for order ID ${orderId}: ${responseData.message}`);
                }
            }

            Alert.alert("Success", "Selected orders approved successfully");

            setSelectedOrderIds({});
            setSelectAllOrders(false);

            // **RE-FETCH ORDERS AFTER BULK APPROVAL**
            await Promise.all([  // Fetch both AM and PM orders in parallel
                fetchAMAdminOrders(adminId, userAuthToken),
                fetchPMAdminOrders(adminId, userAuthToken)
            ]);
            console.log("Re-fetched orders after bulk approval to update UI."); // Confirmation log
        } catch (err) {
            console.error("Error bulk approving orders:", err);
            Alert.alert("Error", "Failed to approve selected orders. Please try again.");
            setError("Failed to approve selected orders. Please try again.");
        } finally {
            setLoading(false);
        }
    };

   

    const renderUserOrderItem = ({ item }) => {
        const today = moment();

        const hasAMOrderToday = amAdminOrders.some(order => order.customer_id === item.cust_id && moment.unix(order.placed_on).isSame(today, 'day'));
        const hasPMOrderToday = pmAdminOrders.some(order => order.customer_id === item.cust_id && moment.unix(order.placed_on).isSame(today, 'day'));

        const userAMOrdersToday = amAdminOrders.filter(order => order.customer_id === item.cust_id && moment.unix(order.placed_on).isSame(today, 'day'));
        const userPMOrdersToday = pmAdminOrders.filter(order => order.customer_id === item.cust_id && moment.unix(order.placed_on).isSame(today, 'day'));

        return (
            <View style={styles.userOrderItemContainer}>
            <View style={styles.userInfoSection}>
            <Text style={styles.itemText}><Text style={styles.boldText}>Name:</Text> {item.name}</Text>
            <Text style={styles.itemText}><Text style={styles.boldText}>Phone:</Text> {item.phone}</Text>
            <Text style={styles.itemText}><Text style={styles.boldText}>Route:</Text> {item.route}</Text>
            <Text style={styles.itemText}><Text style={styles.boldText}>Status:</Text> {item.status}</Text>
            </View>
            
            <View style={styles.userOrdersSection}>
            <Text style={styles.sectionHeaderText}>AM Orders:</Text>
            {userAMOrdersToday.length > 0 ? (
            userAMOrdersToday.map(order => (
            <View key={order.id} style={styles.orderItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Checkbox
            status={!!selectedOrderIds[order.id] ? 'checked' : 'unchecked'}
            onPress={() => handleCheckboxChange(order.id, !selectedOrderIds[order.id])}
            style={styles.orderCheckbox}
            />
            <View style={{ flex: 1 }}>
            <Text style={styles.itemText}><Text style={styles.boldText}>Order ID:</Text> {order.id}</Text>
            <Text style={styles.itemText}><Text style={styles.boldText}>Order Type:</Text> {order.order_type}</Text>
            <Text style={styles.itemText}><Text style={styles.boldText}>Placed On:</Text> {new Date(order.placed_on * 1000).toLocaleDateString()}</Text>
            <Text style={styles.itemText}><Text style={styles.boldText}>Total Amount:</Text> ₹{order.amount || 'N/A'}</Text>
            </View>
            </View>

            <Text style={styles.itemText}>
            <Text style={styles.boldText}>Status: </Text>
            {order.altered === 'Yes' ? (
                <Text style={styles.orderAlteredText}>Altered</Text>
            ) : (
                <Text style={order.approve_status === 'Accepted' ? styles.orderAcceptedText : { fontWeight: 'bold' }}>
                {order.approve_status === 'Accepted' ? 'Accepted' : 'PENDING'}
                </Text>
            )}
            </Text>
            </View>
            ))
            ) : (
            <Text style={styles.noOrdersText}>No AM orders for today.</Text>
            )}
            
            <Text style={[styles.sectionHeaderText, { marginTop: 10 }]}>PM Orders:</Text>
            {userPMOrdersToday.length > 0 ? (
            userPMOrdersToday.map(order => (
            <View key={order.id} style={styles.orderItem}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Checkbox
            status={!!selectedOrderIds[order.id] ? 'checked' : 'unchecked'}
            onPress={() => handleCheckboxChange(order.id, !selectedOrderIds[order.id])}
            style={styles.orderCheckbox}
            />
            <View style={{ flex: 1 }}>
            <Text style={styles.itemText}><Text style={styles.boldText}>Order ID:</Text> {order.id}</Text>
            <Text style={styles.itemText}><Text style={styles.boldText}>Order Type:</Text> {order.order_type}</Text>
            <Text style={styles.itemText}><Text style={styles.boldText}>Placed On:</Text> {new Date(order.placed_on * 1000).toLocaleDateString()}</Text>
            <Text style={styles.itemText}><Text style={styles.boldText}>Total Amount:</Text> ₹{order.amount || 'N/A'}</Text>
            </View>
            </View>

            <Text style={styles.itemText}>
            <Text style={styles.boldText}>Status: </Text>
            {order.altered === 'Yes' ? (
                <Text style={styles.orderAlteredText}>Altered</Text>
            ) : (
                <Text style={order.approve_status === 'Accepted' ? styles.orderAcceptedText : { fontWeight: 'bold' }}>
                {order.approve_status === 'Accepted' ? 'Accepted' : 'PENDING'}
                </Text>
            )}
            </Text>
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
        const filteredUsers = assignedUsers;

        return (
            <View style={styles.tabContentContainer}>
                 <View style={[styles.bulkActionsContainer, {justifyContent: 'flex-start'}]}>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginRight: 20}}>
                    <Checkbox
                        status={selectAllOrders ? 'checked' : 'unchecked'} // Use 'status' prop to reflect selectAllOrders state
                        onPress={() => setSelectAllOrders(!selectAllOrders)} // Use 'onPress' to toggle selectAllOrders state
                        style={styles.selectAllCheckbox}
                    />
                        <Text style={{fontWeight: 'bold', marginLeft: 8}}>Select All Orders</Text>
                    </View>

                    <TouchableOpacity style={styles.bulkActionButton} onPress={handleBulkApprove}>
                        <Text style={styles.bulkActionButtonText}>Accept Selected</Text>
                    </TouchableOpacity>
                </View>
                {filteredUsers.length > 0 ? (
                    <FlatList
                        data={filteredUsers}
                        renderItem={renderUserOrderItem}
                        keyExtractor={item => String(item.id)}
                        style={styles.list}
                        contentContainerStyle={styles.listContentContainer}
                    />
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>
                            No users assigned to this admin yet.
                        </Text>
                    </View>
                )}
            </View>
        );
    };


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Assigned Users & Orders</Text>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ffcc00" />
                </View>
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : (
                <View style={{flex: 1}}>
                    {renderContent()}
                </View>
            )}

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    orderAlteredText: { // UPDATED STYLE FOR ALTERED TEXT - BLUE COLOR
        color: 'blue', // Changed color to blue as requested
        fontWeight: 'bold',
        marginTop: 5,
    },
    orderAcceptedText: { // UPDATED STYLE FOR ALTERED TEXT - BLUE COLOR
        color: 'green', // Changed color to blue as requested
        fontWeight: 'bold',
        marginTop: 5,
    },
    header: {
        backgroundColor: '#ffcc00',
        padding: 20,
        alignItems: 'center',
    },
    headerText: {
        fontSize: 22,
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
    list: {
        flex: 1,
    },
    listContentContainer: {
        paddingVertical: 15,
        paddingHorizontal: 10,
    },
    userOrderItemContainer: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    userInfoSection: {
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    userOrdersSection: {
        // Styles for the section listing user's orders
    },
    userItem: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    orderItem: {
        backgroundColor: '#f9f9f9',
        padding: 10,
        borderRadius: 5,
        marginBottom: 8,
        marginLeft: 10,
        flexDirection: 'column',
        alignItems: 'stretch',
    },
    notOrderItem: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    itemText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 5,
    },
    boldText: {
        fontWeight: 'bold',
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
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 8,
        marginHorizontal: 10,
        marginTop: 15,
        marginBottom: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        justifyContent: 'space-around',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 2,
    },
    activeTabButton: {
        backgroundColor: '#ffcc00',
    },
    tabText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
        textAlign: 'center',
    },
    activeTabText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    detailButton: {
        backgroundColor: '#007bff',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 5,
    },
    detailButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    tabContentContainer: {
        flex: 1,
        paddingHorizontal: 10,
    },
    underConstructionText: {
        fontSize: 18,
        color: '#555',
        textAlign: 'center',
    },
    placeOrderButton: {
        backgroundColor: '#4CAF50',
        marginLeft: 10,
    },
    noOrdersText: {
        fontSize: 14,
        color: '#555',
        fontStyle: 'italic',
        marginTop: 5,
        marginLeft: 10,
    },
    tabHeaderText: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'left',
        marginTop: 10,
        marginLeft: 10,
    },
    sectionHeaderText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 5,
        color: '#555',
    },
    orderButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    orderButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 5,
        marginLeft: 5,
    },
    approveButton: {
        backgroundColor: '#4CAF50',
    },
    rejectButton: {
        backgroundColor: '#f44336',
    },
    orderButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    approvedState: {
        backgroundColor: 'grey',
    },
    rejectedState: {
        backgroundColor: 'grey',
    },
    orderStatusText: {
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'right',
        marginTop: 5,
    },
    orderStatusApproved: {
        color: '#4CAF50',
    },
    orderStatusRejected: {
        color: '#f44336',
    },
    bulkActionsContainer: {
        flexDirection: 'row',
        paddingVertical: 10,
        alignItems: 'center',
    },
    bulkActionButton: {
        backgroundColor: '#FFBF00',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 5,
        marginLeft: 8,
    },
    bulkActionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center'
    },
    orderCheckbox: {
        marginRight: 8,
        alignSelf: 'center',
    },
    selectAllCheckbox: {
        marginRight: 5,
    },

});

export default AdminAssignedUsersPage;