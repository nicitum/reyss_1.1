import React, { useState, useEffect } from "react";
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
import OrderDetails from "./nestedPage/orderDetails";
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

    const isPastDate = moment(selectedDate).isBefore(moment(), "day");
    const isCurrentDate = moment(selectedDate).isSame(moment(), "day");
    const hasExistingOrder = orderDetails !== null;
    const isOrderingDisabled = false;


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
    }, [order, selectedDate, shift]); // **Added 'selectedDate' to dependency array**


    const fetchOrderDetails = async (orderId = null, date = null, shiftType = null) => {
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
                console.log("Selected Date Parameter:", selectedDate); // Log selectedDate
                console.log("Date Parameter:", date);         // Log date parameter (should be same as selectedDate)

                const formattedPreviousDate = moment(selectedDate).subtract(1, 'day').format("YYYY-DD-MM");
                console.log("Formatted Previous Date:", formattedPreviousDate); // Log formattedPreviousDate

                const apiUrl = `http://${ipAddress}:8090/order-by-date-shift?orderDate=${formattedPreviousDate}&orderType=${shiftType}&customerId=${customerId}`;
                console.log("API URL:", apiUrl); // Log the complete API URL

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
                        const productsResponse = await fetch(`http://${ipAddress}:8090/order-products?orderId=${orderData.id}`, {
                            method: "GET",
                            headers: {
                                Authorization: `Bearer ${userAuthToken}`,
                                "Content-Type": "application/json",
                            },
                        });

                        if (!productsResponse.ok) {
                            throw new Error(`Failed to fetch product details: ${productsResponse.statusText}`);
                        }
                        const productsData = await productsResponse.json();
                        console.log("Previous day order product details:", productsData);
                        fetchedOrderDetails = {
                            order: orderData,
                            products: productsData,
                        };
                    } catch (productFetchError) {
                        console.error("Error fetching product details:", productFetchError);
                        Toast.show({
                            type: 'error',
                            text1: 'Fetch Error',
                            text2: "Failed to fetch product details for previous order."
                        });
                        setError("Failed to fetch product details for previous order.");
                        setLoading(false);
                        return;
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
    };


    const showAlertAndGoBack = () => {
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
    };

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
                price: product.discountPrice || product.price,
                product_id: product.id,
                quantity: 1,
            };

            const updatedProducts = [...currentProducts, newProduct];
            setOrderDetails({ ...orderDetails, products: updatedProducts });
            setShowSearchModal(false);
            Toast.show({
                type: 'success',
                text1: 'Product Added',
                text2: `${product.name} has been added to the order.`
            });
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

    const confirmSubmitEdit = async () => {
        setConfirmModalVisible(false);

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
            }));
            const orderDate = new Date(selectedDate).toISOString();

            const options = {
                method: "POST",
                url: `http://${ipAddress}:8090/place`,
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

            const response = await axios(options);
            if (response.status === 200) {
                Toast.show({
                    type: 'success',
                    text1: 'Order Placed',
                    text2: "Order Placed successfully!"
                });
                //navigation.navigate("IndentPage");
                navigation.navigate("IndentPage", { orderPlacedSuccessfully: true }); // ADDED parameter
            } else {
                throw new Error("Unexpected response status.");
            }
        } catch (error) {
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
                        <OrderDetails
                            orderDetails={orderDetails}
                            selectedDate={selectedDate}
                            shift={shift}
                        />
                        <OrderProductsList
                            products={orderDetails.products}
                            onQuantityChange={handleQuantityChange}
                            setOrderDetails={setOrderDetails} // Pass setOrderDetails here
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
            <Toast config={toastConfig} />
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