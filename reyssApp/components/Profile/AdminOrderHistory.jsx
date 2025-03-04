import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    ToastAndroid,
} from "react-native";
import axios from "axios";
import { ipAddress } from "../../urls";
import { checkTokenAndRedirect } from "../../services/auth";
import { useNavigation } from "@react-navigation/native";
import { jwtDecode } from "jwt-decode";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import moment from 'moment';
import DateTimePickerModal from 'react-native-modal-datetime-picker'; // Import DateTimePickerModal
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const AdminOrderHistory = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigation = useNavigation();
    const [expandedOrderDetailsId, setExpandedOrderDetailsId] = useState(null);
    const [orderDetails, setOrderDetails] = useState({});

    // Date Picker State
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date()); // Initialize with today's date

    const showDatePicker = () => {
        setDatePickerVisibility(true);
    };

    const hideDatePicker = () => {
        setDatePickerVisibility(false);
    };

    const handleConfirm = (date) => {
        hideDatePicker();
        setSelectedDate(date); // Update selectedDate state
        // Fetch orders for the selected date immediately
        fetchOrders(date);
    };


    // Use useCallback to memoize fetchOrders function
    const fetchOrders = useCallback(async (dateFilter) => { // Accept dateFilter as argument
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
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

            let filteredOrders = fetchedOrders; // Default to all orders

            if (dateFilter) { // Apply date filter only if dateFilter is provided
                const filterDateFormatted = moment(dateFilter).format("YYYY-MM-DD");
                console.log("DEBUG: Filter Date (YYYY-MM-DD):", filterDateFormatted);

                filteredOrders = fetchedOrders.filter(order => {
                    if (!order.placed_on) {
                        console.log("DEBUG: order.placed_on is missing for order ID:", order.id);
                        return false;
                    }

                    const parsedEpochSeconds = parseInt(order.placed_on, 10);
                    const orderDateMoment = moment.unix(parsedEpochSeconds);
                    const orderDateFormatted = orderDateMoment.format("YYYY-MM-DD");

                    return orderDateFormatted === filterDateFormatted;
                });
            } else {
                // Initially load today's orders if no date is selected yet on focus effect
                const todayFormatted = moment().format("YYYY-MM-DD");
                filteredOrders = fetchedOrders.filter(order => {
                    if (!order.placed_on) {
                        console.log("DEBUG: order.placed_on is missing for order ID:", order.id);
                        return false;
                    }
                    const parsedEpochSeconds = parseInt(order.placed_on, 10);
                    const orderDateMoment = moment.unix(parsedEpochSeconds);
                    const orderDateFormatted = orderDateMoment.format("YYYY-MM-DD");
                    return orderDateFormatted === todayFormatted;
                });
            }


            setOrders(filteredOrders); // Set filtered orders
            console.log('Filtered orders:', filteredOrders);

        } catch (fetchOrdersError) {
            console.error("FETCH ADMIN ORDERS - Fetch Error:", fetchOrdersError);
            Alert.alert("Error", fetchOrdersError.message || "Failed to fetch admin orders.");
        } finally {
            setLoading(false);
        }
    }, []); // Removed navigation from dependency array if not needed

    useFocusEffect(
        useCallback(() => {
            fetchOrders(); // Fetch today's orders on focus, no date filter initially
            return () => {
                // Cleanup if needed
            };
        }, [fetchOrders])
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

    const save = async (uri, filename, mimetype, reportType) => {
        if (Platform.OS === "android") {
            try {
                let directoryUriToUse = await AsyncStorage.getItem('orderReportDirectoryUri');

                if (!directoryUriToUse) {
                    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                    if (permissions.granted) {
                        directoryUriToUse = permissions.directoryUri;
                        await AsyncStorage.setItem('orderReportDirectoryUri', directoryUriToUse);
                    } else {
                        shareAsync(uri, reportType);
                        return;
                    }
                }

                const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                const newUri = await FileSystem.StorageAccessFramework.createFileAsync(
                    directoryUriToUse,
                    filename,
                    mimetype
                );
                await FileSystem.writeAsStringAsync(newUri, base64, { encoding: FileSystem.EncodingType.Base64 });

                if (Platform.OS === 'android') {
                    ToastAndroid.show(`${reportType} Saved Successfully!`, ToastAndroid.SHORT);
                } else {
                    Alert.alert('Success', `${reportType} Saved Successfully!`);
                }
            } catch (error) {
                console.error("Error saving file:", error);
                if (error.message.includes('permission')) {
                    await AsyncStorage.removeItem('orderReportDirectoryUri');
                }
                if (Platform.OS === 'android') {
                    ToastAndroid.show(`Failed to save ${reportType}. Please try again.`, ToastAndroid.SHORT);
                } else {
                    Alert.alert('Error', `Failed to save ${reportType}. Please try again.`);
                }
            }
        } else {
            shareAsync(uri, reportType);
        }
    };

    const generateOrderExcelReport = async () => {
        const reportType = 'Order Report';
        setLoading(true);
        try {
            if (!orders || orders.length === 0) {
                Alert.alert("No Orders", "No orders to include in the report for the selected date.");
                return;
            }

            const wb = XLSX.utils.book_new();
            const wsData = [
                [`${reportType} - Date: ${moment(selectedDate).format('YYYY-MM-DD')}`],
                [], // space line
                ["Customer ID", "Total Amount", "Order Type", "Placed On", "Cancelled","Approve Status", "Delivery Status"], // Headers
                ...orders.map(order => [
                    order.customer_id,
                    order.amount,
                    order.order_type,
                    moment.unix(parseInt(order.placed_on, 10)).format('YYYY-MM-DD HH:mm:ss'),
                    order.cancelled,
                    order.approve_status,
                    order.delivery_status,
                   
                ])
            ];

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, `${reportType} Data`);

            const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
            const base64Workbook = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
            const filename = `${reportType.replace(/\s/g, '')}-${moment(selectedDate).format('YYYY-MM-DD')}.xlsx`;
            const mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

            if (Platform.OS === 'web') {
                const blob = new Blob([wbout], { type: mimetype });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                if (Platform.OS === 'web') {
                    Alert.alert('Success', `${reportType} Generated Successfully! File downloaded in your browser.`);
                }
            } else {
                const fileDir = FileSystem.documentDirectory;
                const fileUri = fileDir + filename;

                await FileSystem.writeAsStringAsync(fileUri, base64Workbook, {
                    encoding: FileSystem.EncodingType.Base64
                });
                if (Platform.OS === 'android') {
                    save(fileUri, filename, mimetype, reportType);
                } else {
                    try {
                        await Sharing.shareAsync(fileUri, {
                            mimeType: mimetype,
                            dialogTitle: `${reportType} Report`,
                            UTI: 'com.microsoft.excel.xlsx'
                        });
                        if (Platform.OS !== 'android') {
                            Alert.alert('Success', `${reportType} Generated and Shared Successfully!`);
                        }
                    } catch (shareError) {
                        console.error("Sharing Error:", shareError);
                        if (Platform.OS === 'android') {
                            ToastAndroid.show(`Sharing ${reportType} Failed.`, ToastAndroid.SHORT);
                        } else {
                            Alert.alert("Sharing Failed", `Error occurred while trying to share the ${reportType.toLowerCase()}.`);
                        }
                        setError("Error sharing file.");
                    }
                }
            }

        } catch (e) {
            console.error("Excel Generation Error:", e);
            if (Platform.OS === 'android') {
                ToastAndroid.show(`Failed to generate ${reportType}.`, ToastAndroid.SHORT);
            } else {
                Alert.alert("Generation Failed", `Error generating Excel ${reportType.toLowerCase()}.`);
            }
            setError("Error generating Excel file.");
        } finally {
            setLoading(false);
        }
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
            <View style={styles.filterRow}>
                <View style={styles.dateFilterContainer}>
                    <TouchableOpacity style={styles.dateButton} onPress={showDatePicker}>
                        <Text style={styles.dateButtonText}>
                            {moment(selectedDate).format('YYYY-MM-DD')} {/* Display selected date */}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.reportButtonContainer}>
                    <TouchableOpacity style={styles.reportButton} onPress={generateOrderExcelReport}>
                        <Text style={styles.reportButtonText}>Generate Report</Text>
                    </TouchableOpacity>
                </View>
            </View>


            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={handleConfirm}
                onCancel={hideDatePicker}
                date={selectedDate} // Current date being displayed in picker
            />

            <ScrollView style={styles.scrollView}>
                {orders.length === 0 ? (
                    <Text style={styles.noOrdersText}>No orders found for selected date.</Text>
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
                                        <Text style={styles.cellText}>₹{order.amount}</Text>
                                    </View>
                                    <View style={[styles.cell, styles.actionCell, { flex: 0.8 }]}>
                                        <TouchableOpacity onPress={() => handleOrderDetailsPress(order.id)}>
                                            <Text style={styles.detailsButtonText}>{expandedOrderDetailsId === order.id ? "Hide" : "View"}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={[styles.cell, styles.statusCell, { flex: 1 }]}>
                                        <Text style={styles.deliveryStatusText}>
                                            {(order.approve_status || 'pending').toUpperCase()}
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
    filterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between', // space between date filter and report button
        alignItems: 'center', // vertically align items in the row
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
    },
    dateFilterContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start', // Align to left
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
    reportButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end', // Align to right
    },
    reportButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#4CAF50', // Green color for report button
        borderRadius: 5,
    },
    reportButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
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
    disabledButtonText: {
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