import React, { useState, useEffect, useCallback } from "react";
import { View, Alert, StyleSheet, TouchableOpacity, TextInput, Text, ScrollView, Button, Modal, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import moment from "moment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Icon from 'react-native-vector-icons/MaterialIcons';
import LoadingIndicator from "../general/Loader";
import ErrorMessage from "../general/errorMessage";
import BackButton from "../general/backButton";
import SubmitButton from "./nestedPage/submitButton";
import SearchProductModal from "./nestedPage/searchProductModal";
// import OrderDetails from "./nestedPage/orderDetails"; // Assuming OrderDetails is not a separate component now, will integrate directly
import OrderProductsList from "./nestedPage/orderProductsList";
import { ipAddress } from "../../urls";
import { checkTokenAndRedirect } from "../../services/auth";
import { jwtDecode } from 'jwt-decode';
import Toast from 'react-native-toast-message'; // Import Toast

const PlaceOrderPage = ({ route }) => {
    const { order, selectedDate, shift } = route.params;
    const [orderDetails, setOrderDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const navigation = useNavigation();
    const [updatedQuantities, setUpdatedQuantities] = useState({});
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [totalOrderAmount, setTotalOrderAmount] = useState(0); // State for total amount

    const isPastDate = moment(selectedDate).isBefore(moment(), "day");
    const isCurrentDate = moment(selectedDate).isSame(moment(), "day");
    const hasExistingOrder = orderDetails !== null;
    const isOrderingDisabled = false;


    // Function to calculate total amount (define it FIRST)
    const calculateTotalAmount = useCallback((products) => {
        if (!products || products.length === 0) {
            return 0;
        }
        return products.reduce((sum, product) => {
            return sum + (product.price * product.quantity);
        }, 0);
    }, []);

    // Define showAlertAndGoBack BEFORE useEffect (Correct function order)
    const showAlertAndGoBack = useCallback(() => {
        let message = "There are no orders for this date.";
        if (hasExistingOrder) {
            message = "An order already exists for this date.";
        } else if (isPastDate) {
            message = "Cannot place orders for past dates.";
        }

        Alert.alert("Order Not Allowed", message, [{ text: "OK" }], {
            cancelable: false,
        });

        setTimeout(() => {
            navigation.goBack();
        }, 3000);
    }, [navigation, hasExistingOrder, isPastDate]);


    // Define fetchOrderDetails BEFORE useEffect (Correct function order)
    const fetchOrderDetails = useCallback(async (orderId = null, date = null, shiftType = null) => {
        setLoading(true);
        setError(null);

        try {
            const userAuthToken = await checkTokenAndRedirect(navigation);
            if (!userAuthToken) {
                Toast.show({
                    type: 'error',
                    text1: 'Authentication Error',
                    text2: "Authorization token missing."
                });
                setError("Authorization token missing.");
                setLoading(false);
                return;
            }

            const decodedToken = jwtDecode(userAuthToken);
            const customerId = decodedToken.id;

            let fetchedOrderDetails = null;

            if (orderId) {
                // ... (orderId fetching - no changes here - this is for viewing existing orders by ID) ...
            } else if (date && shiftType) {
                console.log("Selected Date Parameter:", selectedDate);
                console.log("Date Parameter:", date);

                const apiUrl = `http://${ipAddress}:8090/most-recent-order?customerId=${customerId}&orderType=${shiftType}`;

                console.log("API URL:", apiUrl);

                const orderResponse = await fetch(apiUrl, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${userAuthToken}`,
                        "Content-Type": "application/json",
                    },
                });

                if (!orderResponse.ok) {
                    console.log("No order found for previous day, initializing with empty order");
                    fetchedOrderDetails = { order: {}, products: [] };
                } else {
                    const orderData = await orderResponse.json();
                    console.log("Previous day order details:", orderData);

                    try {
                        const productsResponse = await fetch(`http://${ipAddress}:8090/order-products?orderId=${orderData.order.id}`, {
                            method: "GET",
                            headers: {
                                Authorization: `Bearer ${userAuthToken}`,
                                "Content-Type": "application/json",
                            },
                        });

                        if (!productsResponse.ok) {
                            console.log("Failed to fetch product details for previous order, initializing with empty product list.");
                            fetchedOrderDetails = { order: orderData, products: [] };
                        }
                        const productsData = await productsResponse.json();
                        console.log("Previous day order product details:", productsData);

                        const filteredProducts = productsData.filter(product => {
                            if (!product.name) {
                                console.warn("Missing product name:", product);
                                return false;
                            }

                            const productCategoryLower = product.category.trim().toLowerCase();

                            if (productCategoryLower.includes("others")) {
                                return false;
                            }

                            return true;
                        });

                        console.log('Filtered products:', filteredProducts);

                        fetchedOrderDetails = {
                            order: orderData,
                            products: filteredProducts,
                        };


                    } catch (productFetchError) {
                        console.error("Error fetching product details:", productFetchError);
                        Toast.show({
                            type: 'error',
                            text1: 'Fetch Error',
                            text2: "Failed to fetch product details for previous order."
                        });
                        fetchedOrderDetails = { order: orderData, products: [] };
                    }
                }
            }

            setOrderDetails(fetchedOrderDetails);

        } catch (err) {
            console.error("Error fetching order details:", err.message);
            Toast.show({
                type: 'error',
                text1: 'Fetch Error',
                text2: err.message || "Error fetching order details"
            });
            setError(err.message || "Error fetching order details");
        } finally {
            setLoading(false);
        }
    }, [navigation, selectedDate]); // Added selectedDate to useCallback dependencies. You might need to add other external dependencies if any.


    useEffect(() => {
        const initializeOrder = async () => {
            if (order && order.orderId) {
                await fetchOrderDetails(order.orderId);
            } else if (selectedDate && shift) {
                await fetchOrderDetails(null, selectedDate, shift);
            } else {
                if (isPastDate) {
                    showAlertAndGoBack();
                }
            }
        };
        initializeOrder();
    }, [order, selectedDate, shift, fetchOrderDetails, isPastDate, showAlertAndGoBack]);


    const handleAddProduct = async (product) => {
        try {
            const currentProducts = orderDetails?.products || [];
            const isDuplicate = currentProducts.some((existingProduct) => existingProduct.product_id === product.id);

            if (isDuplicate) {
                Toast.show({
                    type: 'info',
                    text1: 'Item Exists',
                    text2: "Please increase the quantity in the list."
                });
                return;
            }

            const newProduct = {
                category: product.category,
                name: product.name,
                price: product.effectivePrice,
                product_id: product.id,
                quantity: 1,
            };

            const updatedProducts = [...currentProducts, newProduct];
            setOrderDetails({ ...orderDetails, products: updatedProducts });
            console.log("orderDetails after handleAddProduct:", orderDetails); // <==== ADD THIS LINE
            setShowSearchModal(false);
            setTotalOrderAmount(calculateTotalAmount(updatedProducts)); // Calculate and set total amount

        } catch (error) {
            console.error("Error adding product:", error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: "Could not add product."
            });
            Alert.alert("Error", "Could not add product."); // Fallback if toast fails
        }
    };

    const handleQuantityChange = async (text, index) => {
        try {
            const currentProducts = orderDetails?.products || [];
            const updatedProducts = [...currentProducts];
            const parsedQuantity = parseInt(text, 10);

            if (parsedQuantity < 0) {
                Toast.show({
                    type: 'error',
                    text1: 'Invalid Quantity',
                    text2: "Quantity cannot be negative."
                });
                return;
            }

            updatedProducts[index] = {
                ...updatedProducts[index],
                quantity: isNaN(parsedQuantity) ? 0 : parsedQuantity,
            };

            setOrderDetails({ ...orderDetails, products: updatedProducts });
            setTotalOrderAmount(calculateTotalAmount(updatedProducts)); // Recalculate total amount after quantity change
        } catch (error) {
            console.error("Error updating quantity:", error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: "Could not update quantity."
            });
            Alert.alert("Error", "Could not update quantity."); // Fallback
        }
    };

    const handleSubmitEdit = async () => {
        let hasInvalidQuantity = false;
        for (const product of orderDetails.products) {
            if (product.quantity <= 0) {
                Toast.show({
                    type: 'error',
                    text1: 'Invalid Quantity',
                    text2: "Quantity must be greater than zero for all products to place order."
                });
                hasInvalidQuantity = true;
                break;
            }
        }

        if (hasInvalidQuantity) {
            return; // Prevent submission if invalid quantity
        }
        setConfirmModalVisible(true);
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


    const ConfirmModal = ({ isVisible, onConfirm, onCancel }) => {
       

        return (
            <Modal visible={isVisible} transparent animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalText}>Do you want to place this order?</Text>
                        <View style={styles.buttonContainer}>
                            <Button title="Cancel" onPress={onCancel} color="#777" />
                            <Button title="Place Order" onPress={onConfirm} color="#27ae60" />
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    const confirmSubmitEdit = async () => {
        setConfirmModalVisible(false);
    
        const creditLimit = await checkCreditLimit();
        if (creditLimit === null) {
            return; // Do not proceed if credit limit check failed
        }
    
        if (creditLimit !== Infinity && totalOrderAmount > creditLimit) {
            const exceededAmount = (totalOrderAmount - creditLimit).toFixed(2);
            Toast.show({
                type: 'error',
                text1: 'Credit Limit Reached',
                text2: `Credit limit reached by ₹${exceededAmount}. Please adjust your cart.`
            });
            return; // Prevent order submission due to credit limit
        }
    
        // If credit limit is OK, proceed with order placement and then credit deduction
        try {
            const userAuthToken = await checkTokenAndRedirect(navigation);
            if (!userAuthToken) {
                Toast.show({
                    type: 'error',
                    text1: 'Authentication Error',
                    text2: "Auth token missing."
                });
                return;
            }
        
            const transformedData = orderDetails.products.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price,
            }));
            const orderDate = new Date(selectedDate).toISOString();
    
            const placeOrderOptions = {
                method: "POST",
                url: `http://${ipAddress}:8090/place`, // Your existing /place API
                data: {
                    products: transformedData,
                    orderType: shift,
                    orderDate,
                },
                headers: {
                    Authorization: `Bearer ${userAuthToken}`,
                    "Content-Type": "application/json",
                },
            };
    

            const placeOrderResponse = await axios(placeOrderOptions);
            if (placeOrderResponse.status === 200) {
                // Order placed successfully! Now deduct from credit limit
                const orderResponseData = placeOrderResponse.data;
                const placedOrderId = orderResponseData.orderId;
                console.log('hello',totalOrderAmount)

                const decodedToken = jwtDecode(userAuthToken);
                const customerId = decodedToken.id;


                const updateAmountDueOptions = {
                    method: 'POST',
                    url: `http://${ipAddress}:8090/credit-limit/update-amount-due-on-order`,
                    data: {
                        customerId: customerId,
                        totalOrderAmount: totalOrderAmount,
                    },
                    headers: {
                        'Content-Type': 'application/json',
                    },
                };

                try {
                    const updateAmountDueResponse = await axios(updateAmountDueOptions);
                    if (updateAmountDueResponse.status == 200) {
                        console.error("Success ful pdate", updateAmountDueResponse.status, updateAmountDueResponse.statusText, JSON.stringify(updateAmountDueResponse.data));
                    }
                } catch (updateAmountDueError) {
                    console.error("Error calling /credit-limit/update-amount-due-on-order API:", updateAmountDueError);
                }



    
                // ====================== Credit Deduct Logic - CORRECTED for Place Order ==========================
                const deductCreditOptions = {
                    method: 'POST',
                    url: `http://${ipAddress}:8090/credit-limit/deduct`,
                    data: {
                        customerId: jwtDecode(userAuthToken).id,
                        amountChange: totalOrderAmount, // **Corrected: Use 'amountChange' and send totalOrderAmount for new orders**
                    },
                    headers: {
                        'Content-Type': 'application/json',
                        // Authorization: `Bearer ${userAuthToken}`,  // **Authorization header for /credit-limit/deduct - UNCOMMENT if your API requires it**
                    },
                };
    
                console.log("Deduct Credit API Request URL (Place Order):", deductCreditOptions.url);
                console.log("Deduct Credit API Request Headers (Place Order):", deductCreditOptions.headers); // Debug Log for Headers
                console.log("Deduct Credit API Request Body (Place Order):", JSON.stringify(deductCreditOptions.data, null, 2));
    
                try {
                    const deductCreditResponse = await axios(deductCreditOptions);
                    console.log("Deduct Credit API Response Status (Place Order):", deductCreditResponse.status);
                    console.log("Deduct Credit API Response Data (Place Order):", JSON.stringify(deductCreditResponse.data, null, 2));
    
                    if (deductCreditResponse.status === 200) {
                        // Credit limit deducted successfully after order placement
                        Toast.show({
                            type: 'success',
                            text1: 'Order Placed & Credit Updated',
                            text2: "Order Placed and credit limit updated successfully!"
                        });
                        navigation.navigate("IndentPage", { orderPlacedSuccessfully: true });
    
                    } else {
                        // Handle credit deduction failure
                        console.error("Error deducting credit limit after order:", deductCreditResponse.status, deductCreditResponse.statusText);
                        Toast.show({
                            type: 'error',
                            text1: 'Order Placed, but Credit Update Failed',
                            text2: "Order placed, but there was an error updating your credit limit. Please contact support."
                        });
                        navigation.navigate("IndentPage", { orderPlacedSuccessfully: true }); // For now, still navigate to success
                    }
    
                } catch (deductCreditError) {
                    // Handle error during credit deduction API call
                    console.error("Error calling credit-limit/deduct API:", deductCreditError);
                    Toast.show({
                        type: 'error',
                        text1: 'Order Placed, but Credit Update Error',
                        text2: "Order placed, but there was an error updating your credit limit. Please contact support."
                    });
                     navigation.navigate("IndentPage", { orderPlacedSuccessfully: true }); // For now, still navigate to success
                }
                // ====================== END: Credit Deduct Logic - CORRECTED for Place Order ==========================
    
            } else {
                throw new Error("Unexpected response status from /place API.");
            }
        } catch (error) {
            // ... (rest of your error handling for order placement remains the same) ...
            console.error("Submit error:", error);
            if (error.response) {
                console.log(error.response.data.message);
                Toast.show({
                    type: 'error',
                    text1: 'Order Submission Failed',
                    text2: error.response.data.message || "Server error."
                });
                Alert.alert("Failure", error.response.data.message || "Server error."); // Fallback
            } else if (error.request) {
                console.log("Network error:", error.request);
                Toast.show({
                    type: 'error',
                    text1: 'Network Error',
                    text2: "Network error, check connection."
                });
                Alert.alert("Error", "Network error, check connection."); // Fallback
            } else {
                console.error("Error:", error.message);
                Toast.show({
                    type: 'error',
                    text1: 'Unexpected Error',
                    text2: error.message || "An error occurred."
                });
                Alert.alert("Error", error.message || "An error occurred."); // Fallback
            }
        }
    };

    const cancelSubmitEdit = () => {
        setConfirmModalVisible(false);
    };



    useEffect(() => {
        if (orderDetails && orderDetails.products) {
            setTotalOrderAmount(calculateTotalAmount(orderDetails.products));
        } else {
            setTotalOrderAmount(0); // Reset total amount if orderDetails or products are not available
        }
    }, [orderDetails, calculateTotalAmount]);


    if (loading) {
        return <LoadingIndicator />;
    }

    if (error) {
        return (
            <View style={styles.container}>
                <ErrorMessage message={error} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <BackButton navigation={navigation} />
                    <Text style={styles.headerTitle}>Place Order</Text>
                    <TouchableOpacity
                        style={styles.searchButton}
                        onPress={() => setShowSearchModal(true)}
                    >
                        <Icon name="search" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>

                {orderDetails && (
                    <ScrollView contentContainerStyle={styles.contentContainer}>
                        {/* Integrated OrderDetails display here */}
                        <View style={styles.orderDetailsContainer}>
                            <Text style={styles.orderDetailsText}>Date: {moment(selectedDate).format("YYYY-MM-DD")}</Text>
                            <Text style={styles.orderDetailsText}>Shift: {shift}</Text>
                            <Text style={styles.orderDetailsText}>Total Amount: ₹{totalOrderAmount.toFixed(2)}</Text> {/* Display total amount */}
                        </View>

                        <OrderProductsList
                            products={orderDetails.products}
                            onQuantityChange={handleQuantityChange}
                            setOrderDetails={setOrderDetails}
                        />

                        <SubmitButton handleSubmit={handleSubmitEdit} buttonStyle={styles.submitButtonStyle} textStyle={styles.submitButtonTextStyle} />

                        <SearchProductModal
                            isVisible={showSearchModal}
                            onClose={() => setShowSearchModal(false)}
                            onAddProduct={handleAddProduct}
                        />
                        <ConfirmModal
                            isVisible={confirmModalVisible}
                            onConfirm={confirmSubmitEdit}
                            onCancel={cancelSubmitEdit}
                        />
                    </ScrollView>
                )}
            </View>


            <Toast config={toastConfig} ref={(ref) => Toast.setRef(ref)} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#3498db',
        paddingVertical: 15,
        paddingHorizontal: 20,
        elevation: 5,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    searchButton: {
        padding: 10,
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 10,
    },
    submitButtonStyle: {
        backgroundColor: '#27ae60',
        paddingVertical: 15,
        borderRadius: 10,
        elevation: 3,
        marginTop: 20,
    },
    submitButtonTextStyle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.6)",
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 7,
    },
    modalText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 25,
        color: '#333',
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    orderDetailsContainer: { // Style for order details section
        paddingVertical: 10,
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    orderDetailsText: { // Style for text within order details
        fontSize: 16,
        marginBottom: 5,
    },
});

const toastConfig = {
    success: ({ text1, text2 }) => (
        <View style={{ height: 60, width: '90%', backgroundColor: '#27ae60', padding: 15, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>{text1}</Text>
            <Text style={{ color: 'white' }}>{text2}</Text>
        </View>
    ),
    error: ({ text1, text2 }) => (
        <View style={{ height: 60, width: '90%', backgroundColor: '#e74c3c', padding: 15, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>{text1}</Text>
            <Text style={{ color: 'white' }}>{text2}</Text>
        </View>
    ),
    info: ({ text1, text2 }) => (
        <View style={{ height: 60, width: '90%', backgroundColor: '#3498db', padding: 15, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>{text1}</Text>
            <Text style={{ color: 'white' }}>{text2}</Text>
        </View>
    ),
};

export default PlaceOrderPage;