import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { View, Text, TextInput, FlatList, Button, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { jwtDecode } from 'jwt-decode';
import Icon from 'react-native-vector-icons/FontAwesome';
import SearchProductModal from '../IndentPage/nestedPage/searchProductModal';
import { checkTokenAndRedirect } from "../../services/auth";
import moment from 'moment';



import { ipAddress } from '../../urls';

const UpdateOrdersU = () => {
    const navigation = useNavigation();
    const [orders, setOrders] = useState([]);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [customerDetails, setCustomerDetails] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isOrderUpdated, setIsOrderUpdated] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteLoadingIndex, setDeleteLoadingIndex] = useState(null);
    const [showSearchModal, setShowSearchModal] = useState(false); // State for modal visibility
    const [orderDeleteLoading, setOrderDeleteLoading] = useState(false);
    const [orderDeleteLoadingId, setOrderDeleteLoadingId] = useState(null);

    const [originalOrderAmounts, setOriginalOrderAmounts] = useState({}); // NEW state variable to store original total amounts


    useEffect(() => {
        fetchUsersOrders();
    }, []);

    const fetchUsersOrders = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const decodedToken = jwtDecode(token);
            const custId = decodedToken.id;

            const url = `http://${ipAddress}:8090/get-orders/${custId}`;
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            console.log("FETCH CUSTOMER ORDERS - Request URL:", url);
            console.log("FETCH CUSTOMER ORDERS - Request Headers:", headers);

            const ordersResponse = await fetch(url, { headers });

            console.log("FETCH CUSTOMER ORDERS - Response Status:", ordersResponse.status);
            console.log("FETCH CUSTOMER ORDERS - Response Status Text:", ordersResponse.statusText);

            if (!ordersResponse.ok) {
                const errorText = await ordersResponse.text();
                const message = `Failed to fetch customer orders. Status: ${ordersResponse.status}, Text: ${errorText}`;
                console.error("FETCH CUSTOMER ORDERS - Error Response Text:", errorText);
                throw new Error(message);
            }

            const ordersData = await ordersResponse.json();
            console.log("FETCH CUSTOMER ORDERS - Response Data:", ordersData);
            let fetchedOrders = ordersData.orders;

            const todayFormatted = moment().format("YYYY-MM-DD");
            console.log("DEBUG: Today's Formatted Date (YYYY-MM-DD):", todayFormatted);

            const todaysOrders = fetchedOrders.filter(order => {
                if (!order.placed_on) {
                    console.log("DEBUG: order.placed_on is missing for order ID:", order.id);
                    return false;
                }

                console.log("DEBUG: Raw order.placed_on value:", order.placed_on, typeof order.placed_on);

                const parsedEpochSeconds = parseInt(order.placed_on, 10);
                console.log("DEBUG: Parsed Epoch Timestamp (parseInt) - Seconds:", parsedEpochSeconds, typeof parsedEpochSeconds);

                const orderDateMoment = moment.unix(parsedEpochSeconds);
                console.log("DEBUG: Moment Object from Epoch (Seconds using .unix()):", orderDateMoment);
                console.log("DEBUG: Moment Object valueOf (Epoch in ms AFTER .unix()):", orderDateMoment.valueOf());

                const orderDateFormatted = orderDateMoment.format("YYYY-MM-DD");
                console.log("DEBUG: Formatted Order Date (YYYY-MM-DD):", orderDateFormatted);

                return orderDateFormatted === todayFormatted;
            });

            setOrders(todaysOrders);

            // NEW: Store original total amounts in state
            const amountsMap = {};
            todaysOrders.forEach(order => {
                amountsMap[order.id] = order.total_amount; // Assuming your API response has 'total_amount' in each order object
            });
            setOriginalOrderAmounts(amountsMap); // Store the map in state
            console.log("DEBUG: Original Order Amounts Map:", amountsMap);

        } catch (fetchOrdersError) {
            console.error("FETCH CUSTOMER ORDERS - Fetch Error:", fetchOrdersError);
            setError(fetchOrdersError.message || "Failed to fetch customer orders.");
            Toast.show({ type: 'error', text1: 'Fetch Error', text2: fetchOrdersError.message || "Failed to fetch customer orders." });
        } finally {
            setLoading(false);
        }
    };


    const fetchOrderProducts = async (orderIdToFetch) => {
        setLoading(true);
        setError(null);
        setIsOrderUpdated(false);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const url = `http://${ipAddress}:8090/order-products?orderId=${orderIdToFetch}`;
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            console.log("FETCH ORDER PRODUCTS - Request URL:", url);
            console.log("FETCH ORDER PRODUCTS - Request Headers:", headers);

            const productsResponse = await fetch(url, { headers });

            console.log("FETCH ORDER PRODUCTS - Response Status:", productsResponse.status);
            console.log("FETCH ORDER PRODUCTS - Response Status Text:", productsResponse.statusText);

            if (!productsResponse.ok) {
                const errorText = await productsResponse.text();
                const message = `Failed to fetch order products. Status: ${productsResponse.status}, Text: ${errorText}`;
                console.error("FETCH ORDER PRODUCTS - Error Response Text:", errorText);
                // **Modified Condition: Only throw error if NOT a 404 "No products found"**
                if (productsResponse.status !== 404) {
                    throw new Error(message);
                } else {
                    // **Handle 404 "No products found" gracefully:**
                    console.log("FETCH ORDER PRODUCTS - No products found for this order, initializing empty product list.");
                    setProducts([]); // Initialize products to empty array
                    setSelectedOrderId(orderIdToFetch);
                    return; // Exit function early, no need to process JSON
                }
            }

            const productsData = await productsResponse.json();
            console.log("FETCH ORDER PRODUCTS - Response Data:", productsData);
            setProducts(productsData);
            setSelectedOrderId(orderIdToFetch);

        } catch (error) {
            console.error("FETCH ORDER PRODUCTS - Fetch Error:", error);
            setError(error.message || "Failed to fetch order products.");
            Toast.show({ type: 'error', text1: 'Fetch Error', text2: error.message || "Failed to fetch order products." });
            setProducts([]);
            setSelectedOrderId(null);
        } finally {
            setLoading(false);
        }
    };

    const handleProductQuantityChange = (index, text) => {
        if (isOrderUpdated) return;
        const newProducts = [...products];
        newProducts[index].quantity = parseInt(text, 10) || 0;
        setProducts(newProducts);
    };

    const handleDeleteProductItem = async (indexToDelete) => {
        if (isOrderUpdated) return;
    
        const productToDelete = products[indexToDelete];
        if (!productToDelete || !productToDelete.order_id) {
            console.error("Order Product ID missing for deletion.");
            Toast.show({ type: 'error', text1: 'Deletion Error', text2: "Could not delete product item. Order Product ID missing." });
            return;
        }
    
        setDeleteLoading(true);
        setDeleteLoadingIndex(indexToDelete);
        setError(null);
    
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const orderProductIdToDelete = productToDelete.product_id;
            console.log(orderProductIdToDelete);
    
            // **--- START: Check Loading Slip Status - Using Local 'orders' State ---**
            const orderIdToCheck = productToDelete.order_id;
            const orderToCheck = orders.find(order => order.id === orderIdToCheck); // **Find order in 'orders' state**
    
            if (orderToCheck) {
                console.log("DEBUG - handleDeleteProductItem: Order from 'orders' state:", orderToCheck); // Debug log
                if (orderToCheck.loading_slip === 'Yes') {
                    Toast.show({
                        type: 'error',
                        text1: 'Deletion Prohibited',
                        text2: "Loading slip already generated for this order."
                    });
                    setDeleteLoading(false);
                    setDeleteLoadingIndex(null);
                    return; // **Early return if loading slip is 'yes'**
                }
            } else {
                console.warn("DEBUG - handleDeleteProductItem: Order not found in 'orders' state for ID:", orderIdToCheck);
                Toast.show({ type: 'warning', text1: 'Warning', text2: "Could not verify loading slip status. Proceeding with deletion." });
                // **Decide how to handle if order is not found in local state.**
                // **For now, proceeding with deletion, but you might want to handle this differently**
                // **e.g.,  show an error, or refetch orders.**
            }
            // **--- END: Check Loading Slip Status - Using Local 'orders' State ---**
    
    
            const url = `http://${ipAddress}:8090/delete_order_product/${orderProductIdToDelete}`;
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            };
            const deleteResponse = await fetch(url, {
                method: 'DELETE',
                headers: headers,
            });
    
            if (!deleteResponse.ok) {
                const errorText = await deleteResponse.text();
                const message = `Failed to delete order product. Status: ${deleteResponse.status}, Text: ${errorText}`;
                console.error("DELETE ORDER PRODUCT - Error Response Status:", deleteResponse.status, "Status Text:", deleteResponse.statusText);
                console.error("DELETE ORDER PRODUCT - Full Error Response:", errorText);
                throw new Error(message);
            }
    
            const deleteData = await deleteResponse.json();
            console.log("DELETE ORDER PRODUCT - Response Data:", deleteData);
    
            // Check if this was the last product
            if (products.length === 1) {
                // Call handleDeleteOrder to cancel the entire order
                await handleDeleteOrder(selectedOrderId);
            } else {
                // Only the product item was deleted, update product list
                const updatedProducts = products.filter((_, index) => index !== indexToDelete);
                setProducts(updatedProducts);
                Toast.show({
                    type: 'success',
                    text1: 'Product Item Deleted',
                    text2: deleteData.message || "Product item deleted successfully from order."
                });
            }
            setIsOrderUpdated(false);
    
        } catch (deleteError) {
            console.error("DELETE ORDER PRODUCT - Error:", deleteError);
            setError(deleteError.message || "Failed to delete order product.");
            Toast.show({ type: 'error', text1: 'Deletion Error', text2: deleteError.message || "Failed to delete product item." });
        } finally {
            setDeleteLoading(false);
            setDeleteLoadingIndex(null);
        }
    };



    const checkCreditLimit = async () => {
        try {
            const userAuthToken = await checkTokenAndRedirect(navigation);
            if (!userAuthToken) {
                Toast.show({
                    type: 'error',
                    text1: 'Authentication Error',
                    text2: "Authorization token missing."
                });
                return null; // Indicate error
            }
            const decodedToken = jwtDecode(userAuthToken);
            const customerId = decodedToken.id;

            const creditLimitResponse = await fetch(`http://${ipAddress}:8090/credit-limit?customerId=${customerId}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${userAuthToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (creditLimitResponse.ok) {
                const creditData = await creditLimitResponse.json();
                return parseFloat(creditData.creditLimit); // Parse to float for comparison
            } else if (creditLimitResponse.status === 404) {
                console.log("Credit limit not found for customer, proceeding without limit check.");
                return Infinity; // Treat as no credit limit or very high limit, allow order (adjust logic if needed)
            } else {
                console.error("Error fetching credit limit:", creditLimitResponse.status, creditLimitResponse.statusText);
                Toast.show({
                    type: 'error',
                    text1: 'Credit Limit Error',
                    text2: "Failed to fetch credit limit."
                });
                return null; // Indicate error
            }

        } catch (error) {
            console.error("Error checking credit limit:", error);
            Toast.show({
                type: 'error',
                text1: 'Credit Limit Error',
                text2: "Error checking credit limit."
            });
            return null; // Indicate error
        }
    };


    const handleUpdateOrder = async () => {
        if (!selectedOrderId) {
            Alert.alert("Error", "Please select an order to update.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            if (!token) {
                Toast.show({
                    type: 'error',
                    text1: 'Authentication Error',
                    text2: "Auth token missing."
                });
                setLoading(false);
                return;
            }
    
            // **--- START: Check Loading Slip Status - Using Local 'orders' State ---**
            const orderIdToCheck = selectedOrderId;
            const orderToCheck = orders.find(order => order.id === orderIdToCheck); // **Find order in 'orders' state**
    
            if (orderToCheck) {
                console.log("DEBUG - handleUpdateOrder: Order from 'orders' state:", orderToCheck); // Debug log
                if (orderToCheck.loading_slip === 'Yes') {
                    Toast.show({
                        type: 'error',
                        text1: 'Order Update Prohibited',
                        text2: "Loading slip already generated for this order."
                    });
                    setLoading(false); // Stop loading indicator
                    return; // **Early return if loading slip is 'Yes'**
                }
            } else {
                console.warn("DEBUG - handleUpdateOrder: Order not found in 'orders' state for ID:", orderIdToCheck);
                Toast.show({ type: 'warning', text1: 'Warning', text2: "Could not verify loading slip status. Proceeding with update." });
                // **Again, decide if proceeding with update is the right behavior.**
            }
            // **--- END: Check Loading Slip Status - Using Local 'orders' State ---**
    
    
            // Calculate new total amount
            let calculatedTotalAmount = 0;
            const productsToUpdate = products.map(product => ({
                order_id: selectedOrderId,
                product_id: product.product_id,
                name: product.name,
                category: product.category,
                price: product.price,
                quantity: product.quantity,
            }));
    
            productsToUpdate.forEach(product => {
                calculatedTotalAmount += product.quantity * product.price;
            });
    
            // Get original order amount from state
            const originalOrderAmount = originalOrderAmounts[selectedOrderId];
            console.log("DEBUG: Original Order Amount (from state):", originalOrderAmount);
    
            // Calculate the *difference* in order amount
            const orderAmountDifference = calculatedTotalAmount - originalOrderAmount;
            console.log("DEBUG: Order Amount Difference:", orderAmountDifference);
    
            // Check credit limit BEFORE update (using the *new* calculated amount)
            const creditLimit = await checkCreditLimit();
            console.log("DEBUG: Credit Limit (before update):", creditLimit);
    
            if (creditLimit === null) {
                throw new Error("Unable to verify credit limit");
            }
    
            if (calculatedTotalAmount > creditLimit) {
                Toast.show({
                    type: 'error',
                    text1: 'Credit Limit Exceeded',
                    text2: `Order amount (₹${calculatedTotalAmount}) exceeds your credit limit (₹${creditLimit})`
                });
                setLoading(false);
                return;
            }
    
    
            const url = `http://${ipAddress}:8090/order_update`;
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            };
            const requestBody = {
                orderId: selectedOrderId,
                products: productsToUpdate,
                totalAmount: calculatedTotalAmount,
                total_amount: calculatedTotalAmount
            };
    
            console.log("UPDATE ORDER - Request URL:", url);
            console.log("UPDATE ORDER - Request Headers:", headers);
            console.log("UPDATE ORDER - Request Body:", JSON.stringify(requestBody, null, 2));
    
            const updateResponse = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });
    
            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                setLoading(false);
                throw new Error(`Failed to update order. Status: ${updateResponse.status}, Text: ${errorText}`);
            }
    
            const updateData = await updateResponse.json();
    
            // ====================== Credit Deduct/Increase Logic for Order Update - CORRECTED and CONDITIONAL for USER APP ==========================
            if (updateResponse.status === 200) {
                const customerIdForCreditUpdate = jwtDecode(token).id; // Get customerId for credit APIs
    
                if (orderAmountDifference > 0) {
                    // Order amount increased, deduct credit
                    const deductCreditOptions = {
                        method: 'POST',
                        url: `http://${ipAddress}:8090/credit-limit/deduct`,
                        data: {
                            customerId: customerIdForCreditUpdate,
                            amountChange: orderAmountDifference, // Deduct the INCREASE in amount
                        },
                        headers: { 'Content-Type': 'application/json' },
                    };
    
                    try {
                        const deductCreditResponse = await axios(deductCreditOptions);
                        if (deductCreditResponse.status !== 200) {
                            console.error("Error deducting credit limit on order update (User App):", deductCreditResponse.status, deductCreditResponse.statusText, deductCreditResponse.data);
                            Toast.show({ type: 'error', text1: 'Credit Update Error', text2: "Error deducting credit. Please contact support." });
                        } else {
                            console.log("Credit limit DEDUCTED successfully on order update (User App):", deductCreditResponse.data);
                        }
                    } catch (deductCreditError) {
                        console.error("Error calling /credit-limit/deduct API (on order update - User App):", deductCreditError);
                        Toast.show({ type: 'error', text1: 'Credit Update Error', text2: "Error updating credit. Please contact support." });
                    }
    
    
                } else if (orderAmountDifference < 0) {
                    // Order amount decreased, increase credit (refund)
                    const increaseCreditOptions = {
                        method: 'POST',
                        url: `http://${ipAddress}:8090/increase-credit-limit`,
                        data: {
                            customerId: customerIdForCreditUpdate,
                            amountToIncrease: Math.abs(orderAmountDifference), // Increase by the ABSOLUTE value of decrease
                        },
                        headers: { 'Content-Type': 'application/json' },
                    };
    
                    try {
                        const increaseCreditResponse = await axios(increaseCreditOptions);
                        if (increaseCreditResponse.status !== 200) {
                            console.error("Error increasing credit limit on order update (User App):", increaseCreditResponse.status, increaseCreditResponse.statusText, increaseCreditResponse.data);
                            Toast.show({ type: 'error', text1: 'Credit Update Error', text2: "Error refunding credit. Please contact support." });
                        } else {
                            console.log("Credit limit INCREASED successfully on order update (User App):", increaseCreditResponse.data);
                        }
                    } catch (increaseCreditError) {
                        console.error("Error calling /increase-credit-limit API (on order update - User App):", increaseCreditError);
                        Toast.show({ type: 'error', text1: 'Credit Update Error', text2: "Error updating credit. Please contact support." });
                    }
                } else {
                    console.log("Order amount unchanged, no credit limit adjustment needed. (User App)");
                }
    
                // --- Amount Due Update Logic with Logs - INTEGRATED HERE for USER APP ---
                const updateAmountDueOptions = {
                    method: 'POST',
                    url: `http://${ipAddress}:8090/credit-limit/update-amount-due-on-order`,
                    data: {
                        customerId: customerIdForCreditUpdate,
                        totalOrderAmount: calculatedTotalAmount,
                        originalOrderAmount: originalOrderAmount, // Pass original amount for backend calculation
                    },
                    headers: { 'Content-Type': 'application/json' },
                };
    
                console.log("DEBUG - handleUpdateOrder (User App): Amount Due API - Request URL:", updateAmountDueOptions.url);
                console.log("DEBUG - handleUpdateOrder (User App): Amount Due API - Request Headers:", updateAmountDueOptions.headers);
                console.log("DEBUG - handleUpdateOrder (User App): Amount Due API - Request Body:", JSON.stringify(updateAmountDueOptions.data, null, 2));
                console.log("DEBUG - handleUpdateOrder (User App): Amount Due API - calculatedTotalAmount BEFORE API call:", calculatedTotalAmount);
    
    
                try {
                    const updateAmountDueResponse = await axios(updateAmountDueOptions);
                    console.log("DEBUG - handleUpdateOrder (User App): Amount Due API - Response Status:", updateAmountDueResponse.status);
                    console.log("DEBUG - handleUpdateOrder (User App): Amount Due API - Response Data:", JSON.stringify(updateAmountDueResponse.data, null, 2));
    
                    if (updateAmountDueResponse.status !== 200) {
                        console.error("Amount Due Update Failed with status (User App):", updateAmountDueResponse.status, updateAmountDueResponse.statusText, updateAmountDueResponse.data);
                        Toast.show({ type: "error", text1: "Credit Update Error", text2: "Error updating amount due." });
                    } else {
                        console.log("Amount Due updated successfully! (User App)");
                    }
                } catch (error) {
                    console.error("Error calling /credit-limit/update-amount-due-on-order API (User App):", error);
                    Toast.show({ type: "error", text1: "Credit Update Error", text2: "Error updating amount due." });
                }
    
    
                Toast.show({
                    type: 'success',
                    text1: 'Order Updated & Credit Updated',
                    text2: "Order and credit limit adjusted successfully!"
                });
    
            } else { // if (updateResponse.status !== 200)
                Toast.show({
                    type: 'error',
                    text1: 'Order Update Failed',
                    text2: updateData.message || "Failed to update order."
                });
                setError(updateData.message || "Failed to update order.");
            }
            // ====================== END: Credit Deduct/Increase Logic for Order Update - CORRECTED and CONDITIONAL for USER APP ==========================
    
    
            await fetchUsersOrders();
            setSelectedOrderId(null);
            setProducts([]);
            setIsOrderUpdated(false);
        } catch (error) {
            console.error("UPDATE ORDER - Error:", error);
            setError(error.message || "Failed to update order.");
            Toast.show({ type: 'error', text1: 'Update Error', text2: error.message || "Failed to update order." });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOrder = async (orderIdToDelete) => {
        console.log("handleDeleteOrder CALLED - Order ID:", orderIdToDelete);
    
        setOrderDeleteLoading(true);
        setOrderDeleteLoadingId(orderIdToDelete);
        setError(null);
    
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
            const headers = {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            };

            // **--- START: Check Loading Slip Status - Using Local 'orders' State ---**
            const orderToCheck = orders.find(order => order.id === orderIdToDelete); // **Find order in 'orders' state**

            if (orderToCheck) {
                console.log("DEBUG - handleDeleteOrder: Order from 'orders' state:", orderToCheck); // Debug log
                if (orderToCheck.loading_slip === 'Yes') {
                    Toast.show({
                        type: 'error',
                        text1: 'Cancellation Prohibited',
                        text2: "Loading slip already generated for this order."
                    });
                    setOrderDeleteLoading(false); // Stop loading indicator
                    setOrderDeleteLoadingId(null);
                    return; // **Early return if loading slip is 'Yes'**
                }
            } else {
                console.warn("DEBUG - handleDeleteOrder: Order not found in 'orders' state for ID:", orderIdToDelete);
                Toast.show({ type: 'warning', text1: 'Warning', text2: "Could not verify loading slip status. Proceeding with cancellation." });
                // **Again, decide if proceeding with cancellation is the right behavior.**
            }
    
            const deleteOrderResponse = await fetch(
                `http://${ipAddress}:8090/cancel_order/${orderIdToDelete}`,
                { method: 'POST', headers }
            );
    
            if (!deleteOrderResponse.ok) {
                const errorText = await deleteOrderResponse.text();
                const message = `Failed to delete order. Status: ${deleteOrderResponse.status}, Text: ${errorText}`;
                throw new Error(message);
            }
    
            const deleteOrderData = await deleteOrderResponse.json();
    
            if (deleteOrderData.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Order Cancelled',
                    text2: deleteOrderData.message || `Order ID ${orderIdToDelete} cancelled successfully.`
                });
    
                // **--- START: Credit Limit Increase Logic ---**
                // **Find the cancelled order in the `orders` state array**
                const cancelledOrder = orders.find(order => order.id === orderIdToDelete);
    
                if (cancelledOrder) {
                    const cancelledOrderAmount = cancelledOrder.total_amount;
                    const customerId = cancelledOrder.customer_id;
    
                    console.log("DEBUG - handleDeleteOrder: cancelledOrder:", cancelledOrder);
                    console.log("DEBUG - handleDeleteOrder: cancelledOrderAmount:", cancelledOrderAmount);
                    console.log("DEBUG - handleDeleteOrder: customerId:", customerId);
    
    
                    if (customerId && cancelledOrderAmount !== undefined && cancelledOrderAmount !== null) {
                        const requestBodyIncreaseCL = {
                            customerId: customerId,
                            amountToIncrease: cancelledOrderAmount,
                        };
                        console.log("DEBUG - handleDeleteOrder: increaseCreditLimit Request Body:", JSON.stringify(requestBodyIncreaseCL));
    
                        const creditLimitIncreaseResponse = await fetch(
                            `http://${ipAddress}:8090/increase-credit-limit`,
                            {
                                method: "POST",
                                headers,
                                body: JSON.stringify(requestBodyIncreaseCL),
                            }
                        );
    
                        console.log("DEBUG - handleDeleteOrder: increaseCreditLimit Response Status:", creditLimitIncreaseResponse.status);
                        console.log("DEBUG - handleDeleteOrder: increaseCreditLimit Response Status Text:", creditLimitIncreaseResponse.statusText);
    
    
                        if (!creditLimitIncreaseResponse.ok) {
                            console.error("Failed to increase credit limit after order cancellation.");
                        } else {
                            const creditLimitIncreaseData = await creditLimitIncreaseResponse.json();
                            console.log("Credit limit increased successfully:", creditLimitIncreaseData);
                        }
                    } else {
                        console.warn("DEBUG - handleDeleteOrder: customerId or cancelledOrderAmount missing or invalid, cannot increase credit limit.");
                    }
                } else {
                    console.warn("DEBUG - handleDeleteOrder: Cancelled order not found in orders array, cannot get details for credit limit increase.");
                }
                // **--- END: Credit Limit Increase Logic ---**
    
    
                // ====================== Amount Due Update Logic for Order Cancellation - INTEGRATED HERE ==========================
                if (cancelledOrder) { // **Re-check if cancelledOrder exists, just to be safe**
                    const originalTotalAmount = cancelledOrder.total_amount; // Get original order amount
                    const customerIdForAmountDueUpdate = cancelledOrder.customer_id; // Get customerId
    
                    const updateAmountDueOptions = {
                        method: 'POST',
                        url: `http://${ipAddress}:8090/credit-limit/update-amount-due-on-order`,
                        data: {
                            customerId: customerIdForAmountDueUpdate,
                            totalOrderAmount: 0, // **Set totalOrderAmount to 0 on cancellation**
                            originalOrderAmount: originalTotalAmount, // Pass original amount for backend calculation (if needed)
                        },
                        headers: { 'Content-Type': 'application/json' },
                    };
    
                    console.log("DEBUG - handleDeleteOrder: Amount Due API - Request URL:", updateAmountDueOptions.url);
                    console.log("DEBUG - handleDeleteOrder: Amount Due API - Request Headers:", updateAmountDueOptions.headers);
                    console.log("DEBUG - handleDeleteOrder: Amount Due API - Request Body:", JSON.stringify(updateAmountDueOptions.data, null, 2));
                    console.log("DEBUG - handleDeleteOrder: Amount Due API - totalOrderAmount BEFORE API call: 0"); // Total amount is now 0
    
                    try {
                        const updateAmountDueResponse = await axios(updateAmountDueOptions);
                        console.log("DEBUG - handleDeleteOrder: Amount Due API - Response Status:", updateAmountDueResponse.status);
                        console.log("DEBUG - handleDeleteOrder: Amount Due API - Response Data:", JSON.stringify(updateAmountDueResponse.data, null, 2));
    
                        if (updateAmountDueResponse.status !== 200) {
                            console.error("Amount Due Update Failed on order cancellation:", updateAmountDueResponse.status, updateAmountDueResponse.statusText, updateAmountDueResponse.data);
                            Toast.show({ type: "error", text1: "Credit Update Error", text2: "Error updating amount due on cancellation." });
                        } else {
                            console.log("Amount Due updated successfully on order cancellation!");
                        }
                    } catch (updateAmountDueError) {
                        console.error("Error calling /credit-limit/update-amount-due-on-order API (on order cancellation):", updateAmountDueError);
                        Toast.show({ type: "error", text1: "Credit Update Error", text2: "Error updating amount due on cancellation." });
                    }
                } else {
                    console.warn("DEBUG - handleDeleteOrder: Cancelled order details not found again before Amount Due API call. This should not happen.");
                    Toast.show({ type: 'warning', text1: 'Order Cancelled', text2: "Order cancelled, but amount due update might be incomplete. Please contact support." });
                }
                // ====================== END: Amount Due Update Logic for Order Cancellation ==========================
    
    
                // Fetch updated orders list immediately after successful cancellation
                await fetchUsersOrders();
                setSelectedOrderId(null);
                setProducts([]);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Failed to Cancel Order',
                    text2: deleteOrderData.message || "Failed to cancel the order."
                });
                setError(deleteOrderData.message || "Failed to cancel the order.");
            }
    
        } catch (deleteOrderError) {
            console.error("DELETE ORDER - Error:", deleteOrderError);
            setError(deleteOrderError.message || "Failed to cancel order.");
            Toast.show({ type: 'error', text1: 'Cancellation Error', text2: deleteOrderError.message || "Failed to cancel the order." });
        } finally {
            setOrderDeleteLoading(false);
            setOrderDeleteLoadingId(null);
        }
    };

    const renderOrderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.orderItemTouchable}
            onPress={() => {
                if (selectedOrderId === item.id) {
                    setSelectedOrderId(null);
                    setProducts([]);
                } else {
                    setSelectedOrderId(item.id);
                    fetchOrderProducts(item.id);
                }
            }}
        >
            <View style={styles.orderItemContainer}>
                <Text style={styles.orderIdText}>Order ID: {item.id}</Text>
              
                <Text style={styles.orderAmountText}>Total Amount: {item.total_amount ? parseFloat(item.total_amount).toFixed(2) : 0.0}</Text>
                <Text style={styles.customerNameText}>Cancelled ?: {item.cancelled}</Text>
                <TouchableOpacity
                    style={styles.deleteOrderButton}
                    onPress={() => handleDeleteOrder(item.id)}
                    disabled={orderDeleteLoading}
                >
                    {orderDeleteLoading && orderDeleteLoadingId === item.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Icon name="time" size={20} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );


    const handleAddProductToOrder = async (productToAdd) => {
        if (!selectedOrderId) {
            Alert.alert("Error", "Please select an order before adding products.");
            return;
        }
    
        const isProductAlreadyAdded = products.some(p => p.product_id === productToAdd.id);
        if (isProductAlreadyAdded) {
            Toast.show({
                type: 'info',
                text1: 'Product Already Added',
                text2: 'This product is already in the order. Please update quantity instead.'
            });
            setShowSearchModal(false);
            return;
        }
    
        setLoading(true);
        setError(null);
    
        try {
            const token = await AsyncStorage.getItem("userAuthToken");
    
            // **--- START: Check Loading Slip Status - Using Local 'orders' State ---**
            const orderIdToCheck = selectedOrderId;
            const orderToCheck = orders.find(order => order.id === orderIdToCheck); // **Find order in 'orders' state**
    
            if (orderToCheck) {
                console.log("DEBUG - handleAddProductToOrder: Order from 'orders' state:", orderToCheck); // Debug log
                if (orderToCheck.loading_slip === 'Yes') { // **Corrected comparison: 'Yes' with uppercase 'Y'**
                    Toast.show({
                        type: 'error',
                        text1: 'Adding Product Prohibited',
                        text2: "Loading slip already generated for this order."
                    });
                    setLoading(false); // Ensure loading indicator is stopped
                    return; // **Early return if loading slip is 'Yes'**
                }
            } else {
                console.warn("DEBUG - handleAddProductToOrder: Order not found in 'orders' state for ID:", orderIdToCheck);
                Toast.show({ type: 'warning', text1: 'Warning', text2: "Could not verify loading slip status. Proceeding with adding product." });
                // **Again, decide if proceeding is the right behavior if order is not in state.**
            }
            // **--- END: Check Loading Slip Status - Using Local 'orders' State ---**
    
    
            const url = `http://${ipAddress}:8090/add-product-to-order`;
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            };
            const requestBody = {
                orderId: selectedOrderId,
                productId: productToAdd.id,
                quantity: 1,
                price: productToAdd.price,
                name: productToAdd.name,
                category: productToAdd.category, // Include product category
            };
    
            console.log("ADD PRODUCT TO ORDER - Request URL:", url);
            console.log("ADD PRODUCT TO ORDER - Request Headers:", headers);
            console.log("ADD PRODUCT TO ORDER - Request Body:", JSON.stringify(requestBody, null, 2));
    
            const addProductResponse = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });
    
            console.log("ADD PRODUCT TO ORDER - Response Status:", addProductResponse.status);
            console.log("ADD PRODUCT TO ORDER - Response Status Text:", addProductResponse.statusText);
    
            if (!addProductResponse.ok) {
                const errorText = await addProductResponse.text();
                const message = `Failed to add product to order. Status: ${addProductResponse.status}, Text: ${errorText}`;
                console.error("ADD PRODUCT TO ORDER - Error Response Text:", errorText);
                throw new Error(message);
            }
    
            const addProductData = await addProductResponse.json();
            console.log("ADD PRODUCT TO ORDER - Response Data:", addProductData);
    
            if (addProductData.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Product Added to Order',
                    text2: addProductData.message || `${productToAdd.name} has been added to the order.`
                });
                setShowSearchModal(false);
                fetchOrderProducts(selectedOrderId);
                setIsOrderUpdated(false);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Failed to Add Product',
                    text2: addProductData.message || "Failed to add product to order."
                });
                setError(addProductData.message || "Failed to add product to order.");
            }
    
        } catch (error) {
            console.error("ADD PRODUCT TO ORDER - Error:", error);
            setError(error.message || "Failed to add product to order.");
            Toast.show({ type: 'error', text1: 'Add Product Error', text2: error.message || "Failed to add product to order." });
        } finally {
            setLoading(false);
        }
    };


    const renderProductItem = ({ item, index }) => {
        const totalAmount = item.quantity * item.price;
        return (
            <View style={styles.productItemContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={styles.productNameText}>{item.name} </Text>
                        <Text style={styles.productCategoryText}>({item.category})</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteProductItem(index)}
                        disabled={deleteLoading}
                    >
                        {deleteLoading && deleteLoadingIndex === index ? (
                            <ActivityIndicator size="small" color="#d9534f" />
                        ) : (
                            <Icon name="trash" size={20} color="#d9534f" />
                        )}
                    </TouchableOpacity>
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.quantityLabel}>Quantity:</Text>
                    {isOrderUpdated ? (
                        <Text style={styles.viewModeQuantity}>{item.quantity}</Text>
                    ) : (
                        <TextInput
                            style={styles.quantityInput}
                            placeholder="Quantity"
                            keyboardType="number-pad"
                            value={String(item.quantity)}
                            onChangeText={(text) => handleProductQuantityChange(index, text)}
                        />
                    )}
                </View>
                <Text style={styles.amountText}>Amount: ₹{totalAmount.toFixed(2)}</Text>
                {index === products.length - 1 && (
                    <View style={styles.totalSumContainer}>
                        <Text style={styles.totalSumText}>
                            Total Order Amount: ₹
                            {products.reduce((sum, product) => sum + (product.quantity * product.price), 0).toFixed(2)}
                        </Text>
                    </View>
                )}
            </View>
        );
    };


    return (
        <View style={styles.container}>
            <Text style={styles.headerText}>Order Update/Edit Page</Text>
            {loading && <Text style={styles.loadingText}>Loading Orders...</Text>}
            {error && <Text style={styles.errorText}>Error: {error}</Text>}

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>Select Order to Update</Text>
            </View>

            <FlatList
                data={orders}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderOrderItem}
                ListEmptyComponent={() => <Text style={{ textAlign: 'center', marginTop: 10 }}>No orders found.</Text>}
            />

            {selectedOrderId && !isOrderUpdated && (
                <View style={styles.orderDetailsSection}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <Text style={styles.sectionHeaderText}>Order ID: {selectedOrderId} - Product Details</Text>
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={() => setShowSearchModal(true)}
                        >
                            <Icon name="search" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1 }}>
                        <FlatList
                            data={products}
                            keyExtractor={(_item, index) => index.toString()}
                            renderItem={renderProductItem}
                            contentContainerStyle={{ paddingBottom: 100 }}
                        />
                    </View>
    
                    <View style={styles.bottomContainer}>
                        <View style={styles.totalSumContainer}>
                            <Text style={styles.totalSumText}>
                                Total Order Amount: ₹
                                {products.reduce((sum, product) => sum + (product.quantity * product.price), 0).toFixed(2)}
                            </Text>
                        </View>
                        <View style={styles.actionButtonsContainer}>
                            <Button
                                title="Update Order"
                                onPress={handleUpdateOrder}
                                disabled={loading}
                            />
                        </View>
                    </View>
                </View>
            )}

            <Toast ref={(ref) => Toast.setRef(ref)} />
            <SearchProductModal
                isVisible={showSearchModal}
                onClose={() => setShowSearchModal(false)}
                onAddProduct={handleAddProductToOrder}
            />
        </View>
    )};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f4f4f8',
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        padding: 10,
        backgroundColor: '#fff',
        textAlign: 'center',
        color: '#333',
    },
    loadingText: {
        textAlign: 'center',
        padding: 5,
        color: '#555',
    },
    errorText: {
        color: 'red',
        padding: 5,
        textAlign: 'center',
    },
    sectionHeader: {
        padding: 8,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    sectionHeaderText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    orderItemTouchable: {
        backgroundColor: '#fff',
        padding: 8,
        marginHorizontal: 8,
        marginVertical: 4,
        borderRadius: 4,
        elevation: 1,
    },
    orderItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    orderIdText: {
        fontSize: 14,
        fontWeight: 'bold',
        flex: 1,
    },
    orderAmountText: {
        fontSize: 14,
        flex: 1,
    },
    customerNameText: {
        fontSize: 14,
        flex: 1,
    },
    orderDetailsSection: {
        flex: 1,
        marginTop: 5,
        backgroundColor: '#fff',
    },
    productItemContainer: {
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    productNameText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    productCategoryText: {
        fontSize: 12,
        color: '#666',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    quantityLabel: {
        fontSize: 14,
        width: 70,
    },
    quantityInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        padding: 4,
        width: 60,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        elevation: 3,
    },
    actionButtonsContainer: {
        padding: 10,
    },
    actionButtonsContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        padding: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        elevation: 3,
    },
    searchButton: {
        padding: 8,
        backgroundColor: '#FFD700',
        borderRadius: 4,
    },
    deleteOrderButton: {
        backgroundColor: '#FFD700',
        padding: 8,
        borderRadius: 4,
    },
    totalSumContainer: {
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    totalSumText: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'right',
    },
    // New button styles
    button: {
        backgroundColor: '#FFD700',
        padding: 10,
        borderRadius: 4,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    }
});

export default UpdateOrdersU;