import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Button, Alert, Platform, ToastAndroid, ScrollView, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { ipAddress } from "../../urls";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Checkbox } from "react-native-paper";
import moment from "moment";

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
        fetchOrders(date);
        hideDatePicker();
    };

    // Fetch Orders
    const fetchOrders = useCallback(async (dateFilter) => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const decodedToken = jwtDecode(token);
            const adminId = decodedToken.id1;
            setAdminId(adminId);

            const url = `http://${ipAddress}:8090/get-admin-orders/${adminId}`;
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            const ordersResponse = await fetch(url, { headers });

            if (!ordersResponse.ok) {
                const errorText = await ordersResponse.text();
                throw new Error(`Failed to fetch admin orders. Status: ${ordersResponse.status}, Text: ${errorText}`);
            }

            const ordersData = await ordersResponse.json();
            let fetchedOrders = ordersData.orders;

            let filteredOrders = fetchedOrders;
            if (dateFilter) {
                const filterDateFormatted = moment(dateFilter).format("YYYY-MM-DD");
                filteredOrders = fetchedOrders.filter(order => {
                    if (!order.placed_on) return false;
                    const parsedEpochSeconds = parseInt(order.placed_on, 10);
                    const orderDateMoment = moment.unix(parsedEpochSeconds);
                    return orderDateMoment.format("YYYY-MM-DD") === filterDateFormatted;
                });
            } else {
                const todayFormatted = moment().format("YYYY-MM-DD");
               归filteredOrders = fetchedOrders.filter(order => {
                    if (!order.placed_on) return false;
                    const parsedEpochSeconds = parseInt(order.placed_on, 10);
                    const orderDateMoment = moment.unix(parsedEpochSeconds);
                    return orderDateMoment.format("YYYY-MM-DD") === todayFormatted;
                });
            }

            setOrders(filteredOrders);
            setSelectAllChecked(false);
            setSelectedOrderIds([]);
            await fetchAssignedUsers(adminId, token);
        } catch (fetchOrdersError) {
            console.error("FETCH ADMIN ORDERS - Fetch Error:", fetchOrdersError);
            Alert.alert("Error", fetchOrdersError.message || "Failed to fetch admin orders.");
        } finally {
            setLoading(false);
        }
    }, [fetchAssignedUsers]);

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

    // Fetch Products with Customer-Specific Pricing
    const fetchProducts = useCallback(async (customerId) => {
        try {
            setLoading(true);
            const userAuthToken = await AsyncStorage.getItem("userAuthToken");

            // Fetch all products
            const response = await axios.get(`http://${ipAddress}:8090/products`, {
                headers: {
                    Authorization: `Bearer ${userAuthToken}`,
                    "Content-Type": "application/json",
                },
            });
            const products = response.data;

            if (!customerId) {
                console.warn("No customer ID provided; using default product prices.");
                return products.map(product => ({
                    ...product,
                    price: parseFloat(product.price || 0),
                    gstRate: parseFloat(product.gst_rate || 0),
                }));
            }

            // Fetch customer-specific prices for each product
            const productsWithPricesPromises = products.map(async (product) => {
                try {
                    const priceResponse = await axios.get(`http://${ipAddress}:8090/customer-product-price`, {
                        params: {
                            product_id: product.id,
                            customer_id: customerId,
                        },
                        headers: {
                            Authorization: `Bearer ${userAuthToken}`,
                        },
                    });
                    const basePrice = parseFloat(priceResponse.data.effectivePrice || product.price || 0);
                    const gstRate = parseFloat(product.gst_rate || 0);
                    const gstAmount = (basePrice * gstRate) / 100;
                    const finalPrice = basePrice + gstAmount;

                    return {
                        ...product,
                        price: basePrice, // Base price (customer-specific or default)
                        gstRate: gstRate,
                        gstAmount: gstAmount,
                        finalPrice: finalPrice,
                    };
                } catch (priceError) {
                    console.error(`Error fetching price for product ${product.id}:`, priceError);
                    const basePrice = parseFloat(product.price || 0);
                    const gstRate = parseFloat(product.gst_rate || 0);
                    const gstAmount = (basePrice * gstRate) / 100;
                    const finalPrice = basePrice + gstAmount;
                    return {
                        ...product,
                        price: basePrice,
                        gstRate: gstRate,
                        gstAmount: gstAmount,
                        finalPrice: finalPrice,
                    };
                }
            });

            const productsWithPrices = await Promise.all(productsWithPricesPromises);
            return productsWithPrices;
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
                        ToastAndroid.show(`${reportType} shared instead (permission denied).`, ToastAndroid.SHORT);
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
                    ToastAndroid.show("Permission issue detected. Cleared directory URI. Please try again.", ToastAndroid.SHORT);
                } else {
                    ToastAndroid.show(`Failed to save ${reportType}. Sharing instead.`, ToastAndroid.SHORT);
                    await Sharing.shareAsync(uri);
                }
            }
        } else {
            await Sharing.shareAsync(uri);
            Alert.alert("Success", `${reportType} shared successfully!`);
        }
    };

    // Number to Words Function
    const numberToWords = (num) => {
        const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
        const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
        const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
        const thousands = ["", "Thousand", "Million", "Billion"];

        if (num === 0) return "Zero Rupees Only";

        const rupees = Math.floor(num);
        const paise = Math.round((num - rupees) * 100);

        const rupeesToWords = (num) => {
            if (num === 0) return "";
            let numStr = num.toString();
            let words = [];
            let chunkCount = 0;

            while (numStr.length > 0) {
                let chunk = parseInt(numStr.slice(-3)) || 0;
                numStr = numStr.slice(0, -3);

                if (chunk > 0) {
                    let chunkWords = [];
                    let hundreds = Math.floor(chunk / 100);
                    let remainder = chunk % 100;

                    if (hundreds > 0) {
                        chunkWords.push(`${units[hundreds]} Hundred`);
                    }

                    if (remainder > 0) {
                        if (remainder < 10) {
                            chunkWords.push(units[remainder]);
                        } else if (remainder < 20) {
                            chunkWords.push(teens[remainder - 10]);
                        } else {
                            let ten = Math.floor(remainder / 10);
                            let unit = remainder % 10;
                            chunkWords.push(tens[ten] + (unit > 0 ? ` ${units[unit]}` : ""));
                        }
                    }

                    if (chunkCount > 0) {
                        chunkWords.push(thousands[chunkCount]);
                    }
                    words.unshift(chunkWords.join(" "));
                }
                chunkCount++;
            }
            return words.join(" ");
        };

        const paiseToWords = (num) => {
            if (num === 0) return "";
            if (num < 10) return units[num];
            if (num < 20) return teens[num - 10];
            let ten = Math.floor(num / 10);
            let unit = num % 10;
            return tens[ten] + (unit > 0 ? ` ${units[unit]}` : "");
        };

        const rupeesPart = rupeesToWords(rupees);
        const paisePart = paiseToWords(paise);

        let result = "";
        if (rupeesPart) {
            result += `${rupeesPart} Rupees`;
        }
        if (paisePart) {
            result += `${rupeesPart ? " and " : ""}${paisePart} Paise`;
        }
        result += " Only";

        return result.trim() || "Zero Rupees Only";
    };

    // Generate Invoice and Save as PDF
    const generateInvoice = useCallback(
        async (order) => {
            const orderId = order.id;
            const customerId = order.customer_id; // Assuming customer_id is available in order object
            const orderProducts = await fetchOrderProducts(orderId);
            const allProducts = await fetchProducts(customerId); // Pass customerId to fetch customer-specific prices

            const invoiceProducts = orderProducts
                .map((op, index) => {
                    const product = allProducts.find((p) => p.id === op.product_id);
                    if (!product) {
                        console.error(`Product not found for productId: ${op.product_id}`);
                        return null;
                    }

                    const basePrice = parseFloat(product.price); // Customer-specific or default price
                    const gstRate = parseFloat(product.gstRate || 0);
                    const value = (op.quantity * basePrice).toFixed(2);
                    const gstAmount = (parseFloat(value) * (gstRate / 100)).toFixed(2);

                    const uomMatch = product.name.match(/\d+\s*(kg|g|liters|Ltr|ml|unit)/i);
                    let uom = "N/A";
                    if (uomMatch) {
                        const matchedUom = uomMatch[1].toLowerCase();
                        uom = matchedUom === "ml" || matchedUom === "liters" || matchedUom === "ltr" ? "Ltr" :
                              matchedUom === "kg" || matchedUom === "g" ? "Kg" : matchedUom.toUpperCase();
                    }

                    return {
                        serialNumber: index + 1,
                        name: product.name,
                        hsn_code: product.hsn_code,
                        quantity: op.quantity,
                        uom: uom,
                        rate: basePrice.toFixed(2),
                        value: value,
                        gstRate: gstRate.toFixed(2),
                        gstAmount: gstAmount,
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
                route: "N/A",
            };

            const subTotal = invoiceProducts.reduce((acc, item) => acc + parseFloat(item.value), 0).toFixed(2);
            const totalGstAmount = invoiceProducts.reduce((acc, item) => acc + parseFloat(item.gstAmount), 0).toFixed(2);
            const cgstAmount = (parseFloat(totalGstAmount) / 2).toFixed(2);
            const sgstAmount = (parseFloat(totalGstAmount) / 2).toFixed(2);
            const grandTotal = (parseFloat(subTotal) + parseFloat(totalGstAmount)).toFixed(2);

            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const invoiceNumber = `INV-${dateStr}-${randomNum}`;
            const totalInWords = numberToWords(parseFloat(grandTotal));

            const htmlContent = `
                <div style="font-family: Helvetica, Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
                    <h1 style="text-align: center; font-size: 24px; margin-bottom: 10px;">SL Enterprises</h1>
                    <div style="text-align: center; font-size: 14px; margin-bottom: 20px;">
                        <p>Invoice No: ${invoiceNumber}</p>
                        <p>Order ID: ${orderId} | Date: ${new Date().toLocaleDateString()}</p>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="margin-bottom: 5px; font-size: 16px;">Customer Information</h3>
                        <p style="margin: 2px 0;">Name: ${customer.name}</p>
                        <p style="margin: 2px 0;">Phone: ${customer.phone}</p>
                        <p style="margin: 2px 0;">Route: ${customer.route}</p>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <thead>
                            <tr style="border-bottom: 2px solid #000; background-color: #f5f5f5;">
                                <th style="padding: 10px; text-align: left; font-size: 12px;">S.No</th>
                                <th style="padding: 10px; text-align: left; font-size: 12px;">Item Name</th>
                                <th style="padding: 10px; text-align: left; font-size: 12px;">HSN</th>
                                <th style="padding: 10px; text-align: right; font-size: 12px;">Qty</th>
                                <th style="padding: 10px; text-align: left; font-size: 12px;">UOM</th>
                                <th style="padding: 10px; text-align: right; font-size: 12px;">Rate</th>
                                <th style="padding: 10px; text-align: right; font-size: 12px;">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${invoiceProducts
                                .map(
                                    (item) => `
                                        <tr style="border-bottom: 1px solid #ddd;">
                                            <td style="padding: 10px; font-size: 12px;">${item.serialNumber}</td>
                                            <td style="padding: 10px; font-size: 12px;">${item.name}</td>
                                            <td style="padding: 10px; font-size: 12px;">${item.hsn_code}</td>
                                            <td style="padding: 10px; text-align: right; font-size: 12px;">${item.quantity}</td>
                                            <td style="padding: 10px; font-size: 12px;">${item.uom}</td>
                                            <td style="padding: 10px; text-align: right; font-size: 12px;">${item.rate}</td>
                                            <td style="padding: 10px; text-align: right; font-size: 12px;">${item.value}</td>
                                        </tr>
                                    `
                                )
                                .join("")}
                        </tbody>
                    </table>

                    <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
                        <div style="width: 50%;">
                            <p style="text-align: right; margin: 5px 0; font-size: 14px;">Subtotal: ₹${subTotal}</p>
                            <p style="text-align: right; margin: 5px 0; font-size: 14px;">CGST: ₹${cgstAmount}</p>
                            <p style="text-align: right; margin: 5px 0; font-size: 14px;">SGST: ₹${sgstAmount}</p>
                            <p style="text-align: right; font-weight: bold; margin: 5px 0; font-size: 16px;">Total: ₹${grandTotal}</p>
                            <p style="text-align: right; font-style: italic; margin: 5px 0; font-size: 12px;">(${totalInWords})</p>
                        </div>
                    </div>

                    <div style="position: absolute; bottom: 20px; left: 20px; font-size: 12px; color: #555;">
                        <p style="margin: 2px 0;"><strong>SL Enterprises</strong></p>
                        <p style="margin: 2px 0;">No. 05, 1st Main, 3rd Cross,</p>
                        <p style="margin: 2px 0;">Ramakrishna Reddy Layout,</p>
                        <p style="margin: 2px 0;">Behind HP Software,</p>
                        <p style="margin: 2px 0;">Mahadevapura Post,</p>
                        <p style="margin: 2px 0;">Bangalore - 560048</p>
                    </div>

                    <p style="text-align: center; font-size: 12px; color: #555; position: absolute; bottom: 20px; width: 100%;">Authorized Signatory</p>
                </div>
            `;

            try {
                const { uri } = await Print.printToFileAsync({
                    html: htmlContent,
                    base64: false,
                });

                const filename = `Invoice_${invoiceNumber}.pdf`;
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
                await generateInvoice(order);
            }
            if (Platform.OS === "android") {
                ToastAndroid.show("Invoices generated and saved successfully!", ToastAndroid.SHORT);
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
        setSelectedOrderIds(prevSelected =>
            prevSelected.includes(orderId)
                ? prevSelected.filter(id => id !== orderId)
                : [...prevSelected, orderId]
        );
    }, []);

    // Handle Select All Checkbox Change
    const handleSelectAllCheckboxChange = useCallback(() => {
        setSelectAllChecked(prev => !prev);
        setSelectedOrderIds([]);
    }, []);

    // Initial Fetch on Component Mount
    useEffect(() => {
        fetchOrders(selectedDate);
    }, [fetchOrders, selectedDate]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Button title={`Date: ${selectedDate.toISOString().split("T")[0]}`} onPress={showDatePicker} />
                    <DateTimePickerModal
                        isVisible={isDatePickerVisible}
                        mode="date"
                        onConfirm={handleConfirmDate}
                        onCancel={hideDatePicker}
                        date={selectedDate}
                    />
                </View>
                <View style={styles.selectAllContainer}>
                    <Text>Select All</Text>
                    <Checkbox
                        status={selectAllChecked ? "checked" : "unchecked"}
                        onPress={handleSelectAllCheckboxChange}
                    />
                </View>
            </View>

            <ScrollView style={styles.ordersContainer}>
                {loading && <Text>Loading Orders...</Text>}
                {error && <Text>Error: ${error}</Text>}
                {!loading && !error && orders.length > 0 ? (
                    orders.map((order) => (
                        <View key={order.id} style={styles.orderItem}>
                            {!selectAllChecked && (
                                <Checkbox
                                    status={selectedOrderIds.includes(order.id) ? "checked" : "unchecked"}
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    selectAllContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    ordersContainer: {
        marginBottom: 20,
    },
    orderItem: {
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
        paddingBottom: 5,
    },
    orderTextContainer: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
});

export default InvoicePage;