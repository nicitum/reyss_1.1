import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Button, Alert, Platform, ToastAndroid, ScrollView, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { ipAddress } from "../../urls";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Checkbox } from 'react-native-paper';
import moment from 'moment';

const InvoicePage = ({ navigation }) => {
    const [adminId, setAdminId] = useState(null);
    const [orders, setOrders] = useState([]);
    const [assignedUsers, setAssignedUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectAllChecked, setSelectAllChecked] = useState(false);
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);

    const showDatePicker = () => setDatePickerVisibility(true);
    const hideDatePicker = () => setDatePickerVisibility(false);
    const handleConfirmDate = (date) => {
        setSelectedDate(date);
        fetchOrders(date); // Fetch orders for the selected date
        hideDatePicker();
    };

    // Fetch Orders (Now with Date Filtering)
    const fetchOrders = useCallback(async (dateFilter) => { // Accept dateFilter as argument
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const decodedToken = jwtDecode(token);
            const adminId = decodedToken.id1;

            const url = `http://${ipAddress}:8090/get-admin-orders/${adminId}`; // No date parameter in URL
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
            setSelectAllChecked(false); // Reset selectAll on new date/order fetch
            setSelectedOrderIds([]);      // Clear selected orders on new date/order fetch
            await fetchAssignedUsers(adminId, token); // Keep fetching assigned users after orders
        } catch (fetchOrdersError) {
            console.error("FETCH ADMIN ORDERS - Fetch Error:", fetchOrdersError);
            Alert.alert("Error", fetchOrdersError.message || "Failed to fetch admin orders.");
        } finally {
            setLoading(false);
        }
    }, [fetchAssignedUsers, ipAddress]);

    // Fetch Assigned Users
    const fetchAssignedUsers = useCallback(async (currentAdminId, userAuthToken) => {
        try {
            const response = await fetch(`http://${ipAddress}:8090/assigned-users/${currentAdminId}`, {
                headers: {
                    Authorization: `Bearer ${userAuthToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch assigned users. Status: ${response.status}`);
            }

            const responseData = await response.json();
            if (responseData.success) {
                setAssignedUsers(responseData.assignedUsers);
            } else {
                setError(responseData.message || "Failed to fetch assigned users.");
            }
        } catch (err) {
            console.error("Error fetching assigned users:", err);
            setError("Error fetching assigned users. Please try again.");
        }
    }, []);

    // Fetch Order Products
    const fetchOrderProducts = useCallback(async (orderId) => {
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
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
    }, []);

    // Fetch Product Details
    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const userAuthToken = await AsyncStorage.getItem("userAuthToken");

            const response = await axios.get(`http://${ipAddress}:8090/products`, {
                headers: {
                    Authorization: `Bearer ${userAuthToken}`,
                    "Content-Type": "application/json",
                },
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching products:", error);
            Alert.alert("Error", "Failed to fetch products.");
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // Save Function
    const save = async (uri, filename, mimetype, reportType) => {
        if (Platform.OS === "android") {
            try {
                let directoryUriToUse = await AsyncStorage.getItem("orderReportDirectoryUri");

                if (!directoryUriToUse) {
                    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
                    if (permissions.granted) {
                        directoryUriToUse = permissions.directoryUri;
                        await AsyncStorage.setItem("orderReportDirectoryUri", directoryUriToUse);
                    } else {
                        await Sharing.shareAsync(uri);
                        return;
                    }
                }

                const base64 = await FileSystem.readAsStringAsync(uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                const newUri = await FileSystem.StorageAccessFramework.createFileAsync(
                    directoryUriToUse,
                    filename,
                    mimetype
                );
                await FileSystem.writeAsStringAsync(newUri, base64, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                ToastAndroid.show(`${reportType} Saved Successfully!`, ToastAndroid.SHORT);
            } catch (error) {
                console.error("Error saving file:", error);
                if (error.message.includes("permission")) {
                    await AsyncStorage.removeItem("orderReportDirectoryUri");
                }
                ToastAndroid.show(`Failed to save ${reportType}. Please try again.`, ToastAndroid.SHORT);
            }
        } else {
            await Sharing.shareAsync(uri);
        }
    };

    // Generate Invoice and Save as PDF
    const generateInvoice = useCallback(
        async (order) => {
            const orderId = order.id;
            const orderProducts = await fetchOrderProducts(orderId);
            const allProducts = await fetchProducts();

            const invoiceProducts = orderProducts
                .map((op, index) => {
                    const product = allProducts.find((p) => p.id === op.product_id);
                    if (!product) {
                        console.error(`Product not found for productId: ${op.product_id}`);
                        return null;
                    }

                    const gstRate = product.gst_rate || 0;
                    const gstRatePercentage = parseFloat(gstRate);
                    const basePrice = parseFloat(product.price);
                    //const gstInclusivePrice = parseFloat(op.price); // We still need gstInclusivePrice for price display, but not for GST calc
                    // const calculatedGstAmount = gstInclusivePrice - basePrice; // No longer needed - incorrect

                    const uomMatch = product.name.match(/\d+\s*(kg|g|liters|Ltr|ml|unit)/i);
                    let uom = "N/A";
                    if (uomMatch) {
                        const matchedUom = uomMatch[1].toLowerCase();
                        if (matchedUom === 'ml' || matchedUom === 'liters' || matchedUom === 'ltr') {
                            uom = 'Ltr';
                        } else if (matchedUom === 'kg' || matchedUom === 'g') {
                            uom = 'Kg';
                        } else {
                            uom = matchedUom.toUpperCase();
                        }
                    }

                    const value = (op.quantity * basePrice).toFixed(2); // Correct value calculation (Quantity * Rate)
                    // Correct GST Calculation: GST on Value
                    const gstAmount = (parseFloat(value) * (gstRatePercentage / 100)).toFixed(2);


                    return {
                        serialNumber: index + 1,
                        name: product.name,
                        hsn_code: product.hsn_code,
                        quantity: op.quantity,
                        uom: uom,
                        rate: basePrice.toFixed(2),
                        value: value,
                        gstRate: gstRatePercentage.toFixed(2),
                        gstAmount: gstAmount, // Correctly calculated GST Amount for this line item
                    };
                })
                .filter(Boolean);

            if (invoiceProducts.length === 0) {
                Alert.alert("Error", "Could not generate invoice due to missing product information.");
                return;
            }

            const customer = assignedUsers.find((user) => user.cust_id === order.customer_id) || {
                name: "Unknown",
                phone: "N/A",
                cust_id: "N/A",
            };

            const subTotal = invoiceProducts.reduce((acc, item) => acc + parseFloat(item.value), 0).toFixed(2);
            const totalGstAmount = invoiceProducts.reduce((acc, item) => acc + parseFloat(item.gstAmount), 0).toFixed(2); // Summing up correct gstAmount
            const cgstAmount = (parseFloat(totalGstAmount) / 2).toFixed(2);
            const sgstAmount = (parseFloat(totalGstAmount) / 2).toFixed(2);
            const grandTotal = (parseFloat(subTotal) + parseFloat(totalGstAmount)).toFixed(2);


            const htmlContent = `
                <div style="font-family: Helvetica, Arial, sans-serif; padding: 20px;">
                    <h1 style="text-align: left; margin-bottom: 10px;">INVOICE</h1>
                    <p style="margin-bottom: 5px;">Order ID: ${orderId}</p>
                    <p style="margin-bottom: 15px;">Date: ${new Date().toLocaleDateString()}</p>

                    <div style="margin-bottom: 15px;">
                        <h3 style="margin-bottom: 5px;">Customer Information</h3>
                        <p style="margin: 2px 0;">Name: ${customer.name}</p>
                        <p style="margin: 2px 0;">Phone: ${customer.phone}</p>
                        <p style="margin: 2px 0;">Route: ${customer.route}</p>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <thead>
                            <tr style="border-bottom: 1px solid black;">
                                <th style="padding: 8px; text-align: left;">S.No</th>
                                <th style="padding: 8px; text-align: left;">Item Name</th>
                                <th style="padding: 8px; text-align: left;">HSN</th>
                                <th style="padding: 8px; text-align: right;">Qty</th>
                                <th style="padding: 8px; text-align: left;">UOM</th>
                                <th style="padding: 8px; text-align: right;">Rate</th>
                                <th style="padding: 8px; text-align: right;">Value</th>
                                
                            </tr>
                        </thead>
                        <tbody>
                            ${invoiceProducts
                                .map(
                                    (item) => `
                                        <tr style="border-bottom: 1px solid #ddd;">
                                            <td style="padding: 8px;">${item.serialNumber}</td>
                                            <td style="padding: 8px;">${item.name}</td>
                                            <td style="padding: 8px;">${item.hsn_code}</td>
                                            <td style="padding: 8px; text-align: right;">${item.quantity}</td>
                                            <td style="padding: 8px;">${item.uom}</td>
                                            <td style="padding: 8px; text-align: right;">${item.rate}</td>
                                            <td style="padding: 8px; text-align: right;">${item.value}</td>
                                            
                                        </tr>
                                    `
                                )
                                .join("")}
                        </tbody>
                    </table>

                    <div style="width:100%; display: flex; flex-direction: column; align-items: flex-end;">
                        <div style="width: 50%;">
                            <p style="text-align: right; margin: 2px 0;">Subtotal: ₹${subTotal}</p>
                            <p style="text-align: right; margin: 2px 0;">CGST: ₹${cgstAmount}</p>
                            <p style="text-align: right; margin: 2px 0;">SGST: ₹${sgstAmount}</p>
                            <p style="text-align: right; font-weight: bold; margin: 2px 0;">Total: ₹${grandTotal}</p>
                        </div>
                    </div>

                    <p style="margin-top: 20px; font-size: 0.9em; color: #555; text-align: center;">Authorized Signatory.</p>
                </div>
            `;

            try {
                const { uri } = await Print.printToFileAsync({
                    html: htmlContent,
                    base64: false,
                });

                const filename = `Invoice_${orderId}_${new Date().toISOString().split("T")[0]}.pdf`;
                await save(uri, filename, "application/pdf", "Invoice");

                console.log("PDF saved at:", uri);
            } catch (error) {
                console.error("Error generating or saving PDF:", error);
                Alert.alert("Error", "Failed to generate or save the invoice.");
            }
        },
        [adminId, fetchOrderProducts, fetchProducts, assignedUsers]
    );

    // Generate Bulk Invoices
    const generateBulkInvoices = useCallback(async () => {
        let ordersToProcess = [];
        if (selectAllChecked) {
            ordersToProcess = orders;
        } else {
            ordersToProcess = orders.filter(order => selectedOrderIds.includes(order.id));
        }

        if (ordersToProcess.length === 0) {
            Alert.alert("Alert", "No orders selected to generate invoices.");
            return;
        }

        setLoading(true);
        try {
            for (const order of ordersToProcess) {
                await generateInvoice(order); // Call generateInvoice for each order
            }
            if (Platform.OS === 'android') {
                ToastAndroid.show(`Invoices generated and saved successfully!`, ToastAndroid.SHORT);
            } else {
                Alert.alert("Success", "Invoices generated and shared!");
            }
        } catch (error) {
            console.error("Error generating bulk invoices:", error);
            Alert.alert("Error", "Failed to generate all invoices.");
        } finally {
            setLoading(false);
        }
    }, [orders, selectedOrderIds, selectAllChecked, generateInvoice]);


    // Handle Order Checkbox Change
    const handleOrderCheckboxChange = useCallback((orderId) => {
        setSelectedOrderIds(prevSelected => {
            if (prevSelected.includes(orderId)) {
                return prevSelected.filter(id => id !== orderId); // Unselect
            } else {
                return [...prevSelected, orderId]; // Select
            }
        });
    }, []);

    // Handle Select All Checkbox Change
    const handleSelectAllCheckboxChange = useCallback(() => {
        setSelectAllChecked(prev => !prev);
        setSelectedOrderIds([]); // Clear individual selections when "Select All" is toggled
    }, []);


    // Initial Fetch on Component Mount
    useEffect(() => {
        fetchOrders(selectedDate); // Fetch orders for today's date initially
    }, [fetchOrders, selectedDate]);


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Button title={`Date: ${selectedDate.toISOString().split('T')[0]}`} onPress={showDatePicker} />
                    <DateTimePickerModal
                        isVisible={isDatePickerVisible}
                        mode="date"
                        onConfirm={handleConfirmDate}
                        onCancel={hideDatePicker}
                        value={selectedDate}
                    />
                </View>
                <View style={styles.selectAllContainer}>
                    <Text>Select All</Text>
                    <Checkbox
                        status={selectAllChecked ? 'checked' : 'unchecked'}
                        onPress={handleSelectAllCheckboxChange}
                    />
                </View>
            </View>


            <ScrollView style={styles.ordersContainer}>
                {loading && <Text>Loading Orders...</Text>}
                {error && <Text>Error: {error}</Text>}
                {!loading && !error && orders.length > 0 ? (
                    orders.map((order) => (
                        <View key={order.id} style={styles.orderItem}>
                            {!selectAllChecked && ( // Conditionally render checkbox
                                <Checkbox
                                    status={selectedOrderIds.includes(order.id) ? 'checked' : 'unchecked'}
                                    onPress={() => handleOrderCheckboxChange(order.id)}
                                />
                            )}
                            <View style={styles.orderTextContainer}>
                                <Text>Order ID: {order.id}</Text>
                                <Button title="Generate Invoice" onPress={() => generateInvoice(order)} />
                            </View>
                        </View>
                    ))
                ) : !loading && !error ? (
                    <Text>No orders found for selected date.</Text>
                ) : null}
            </ScrollView>

            {!loading && orders.length > 0 && (
                <Button
                    title="Generate Selected Invoices"
                    onPress={generateBulkInvoices}
                    disabled={selectAllChecked ? false : selectedOrderIds.length === 0}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    selectAllContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ordersContainer: {
        marginBottom: 20,
    },
    orderItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingBottom: 5,
    },
    orderTextContainer: {
        flex: 1, // Take up remaining space
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    }

});

export default InvoicePage;