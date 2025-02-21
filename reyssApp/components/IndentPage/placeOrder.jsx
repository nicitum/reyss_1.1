import React, { useState, useEffect } from "react";
import { View, Alert, StyleSheet, TouchableOpacity, TextInput, Text, ScrollView, Button, Modal, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import moment from "moment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Icon from "react-native-vector-icons/MaterialIcons";
import LoadingIndicator from "../general/Loader";
import ErrorMessage from "../general/errorMessage";
import BackButton from "../general/backButton";
import SubmitButton from "./nestedPage/submitButton";
import SearchProductModal from "./nestedPage/searchProductModal";
import OrderDetails from "./nestedPage/orderDetails"; // Ensure correct path if you moved it
import OrderProductsList from "./nestedPage/orderProductsList"; // Ensure correct path if you moved it
import { ipAddress } from "../../urls";
import { checkTokenAndRedirect } from "../../services/auth";
import { jwtDecode } from "jwt-decode";

const PlaceOrderPage = ({ route }) => {
    const { order, selectedDate, shift } = route.params;
    const [orderDetails, setOrderDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [defaultOrder, setDefaultOrder] = useState([]);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const navigation = useNavigation();
    const [editable, setEditable] = useState(true);
    const [updatedQuantities, setUpdatedQuantities] = useState({});
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);

    const isPastDate = moment(selectedDate).isBefore(moment(), "day");
    const isCurrentDate = moment(selectedDate).isSame(moment(), "day");
    const hasExistingOrder = orderDetails !== null;
    const isOrderingDisabled = false;

    useEffect(() => {
        const fetchDefaultOrder = async () => {
            console.log("🗄 Retrieving default order from AsyncStorage...");
            try {
                const storedOrder = await AsyncStorage.getItem("default");
                if (storedOrder) {
                    const parsedOrder = JSON.parse(storedOrder);
                    setDefaultOrder(parsedOrder);
                } else {
                    console.log("⚠️ No default order in AsyncStorage. Fetching from API...");
                }

                const storedToken = await AsyncStorage.getItem("userAuthToken");
                if (!storedToken) {
                    console.log("❌ No token found.");
                    return;
                }
                const decodedToken = jwtDecode(storedToken);
                const customerId = decodedToken.id;

                const response = await fetch(`http://${ipAddress}:8090/get-default-order/${customerId}`);
                const data = await response.json();

                console.log("✅ API Response:", data);

                if (data.status && data.default_orders.length > 0) {
                    console.log("🔄 Transforming API response...");
                    const transformedOrder = {
                        order: {
                            customer_id: customerId,
                            total_amount: data.default_orders[0].total_amount
                        },
                        products: data.default_orders.map(order => ({
                            id: order.product_id,
                            quantity: order.quantity,
                            price: order.total_amount,
                            name: order.product_name,
                            category: "Unknown"
                        }))
                    };
                    await AsyncStorage.setItem("default", JSON.stringify(transformedOrder));
                    setDefaultOrder(transformedOrder);
                } else {
                    console.log("⚠️ No default order from API.");
                }
            } catch (error) {
                console.error("❌ Error fetching default order:", error);
                setError("Failed to load default order.");
            } finally {
                setLoading(false);
            }
        };

        fetchDefaultOrder();
    }, [isOrderingDisabled]);

    useEffect(() => {
        const initializeOrder = async () => {
            if (order) {
                await fetchOrderDetails(order.orderId);
            } else {
                if (isPastDate) {
                    showAlertAndGoBack();
                }
            }
        };
        initializeOrder();
    }, [order]);

    const fetchOrderDetails = async (orderId) => {
        try {
            const userAuthToken = await checkTokenAndRedirect(navigation);
            if (!userAuthToken) {
                setError("Authorization token missing.");
                setLoading(false);
                return;
            }

            const response = await fetch(`http://${ipAddress}:8090/order?orderId=${orderId}`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${userAuthToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch order details");
            }

            const data = await response.json();
            setOrderDetails(data);
        } catch (err) {
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
            const storedOrder = await AsyncStorage.getItem("modifiedOrder");
            const currentProducts = storedOrder ? JSON.parse(storedOrder) : defaultOrder?.products || [];
            const isDuplicate = currentProducts.some((existingProduct) => existingProduct.product_id === product.id);

            if (isDuplicate) {
                Alert.alert("Item Exists", "Please increase the quantity.");
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
            setDefaultOrder({ ...defaultOrder, products: updatedProducts });
            await AsyncStorage.setItem("modifiedOrder", JSON.stringify(updatedProducts));
            setShowSearchModal(false);
        } catch (error) {
            console.error("Error adding product:", error);
            Alert.alert("Error", "Could not add product.");
        }
    };

    const handleQuantityChange = async (text, index) => {
        try {
            const storedOrder = await AsyncStorage.getItem("modifiedOrder");
            const currentProducts = storedOrder ? JSON.parse(storedOrder) : defaultOrder?.products || [];
            const updatedProducts = [...currentProducts];
            const parsedQuantity = parseInt(text, 10);

            updatedProducts[index] = {
                ...updatedProducts[index],
                quantity: isNaN(parsedQuantity) ? 0 : parsedQuantity,
            };

            setDefaultOrder({ ...defaultOrder, products: updatedProducts });
            await AsyncStorage.setItem("modifiedOrder", JSON.stringify(updatedProducts));
        } catch (error) {
            console.error("Error updating quantity:", error);
            Alert.alert("Error", "Could not update quantity.");
        }
    };

    const handleSubmitEdit = async () => {
        setConfirmModalVisible(true);
    };

    const confirmSubmitEdit = async () => {
        setConfirmModalVisible(false);

        try {
            const userAuthToken = await checkTokenAndRedirect(navigation);
            if (!userAuthToken) {
                Alert.alert("Error", "Auth token missing.");
                return;
            }

            const modified = await AsyncStorage.getItem("modifiedOrder");
            const data = JSON.parse(modified);
            const transformedData = data.map((item) => ({
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
                await AsyncStorage.removeItem("modifiedOrder");
                Alert.alert("Success", "Order submitted.");
                navigation.navigate("IndentPage");
            } else {
                throw new Error("Unexpected response status.");
            }
        } catch (error) {
            console.error("Submit error:", error);
            if (error.response) {
                console.log(error.response.data.message);
                Alert.alert("Failure", error.response.data.message || "Server error.");
            } else if (error.request) {
                console.log("Network error:", error.request);
                Alert.alert("Error", "Network error, check connection.");
            } else {
                console.error("Error:", error.message);
                Alert.alert("Error", error.message || "An error occurred.");
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
                    {editable && (
                        <TouchableOpacity
                            style={styles.searchButton}
                            onPress={() => setShowSearchModal(true)}
                        >
                            <Icon name="search" size={28} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>

                {(hasExistingOrder || defaultOrder) && (
                    <ScrollView contentContainerStyle={styles.contentContainer}>
                        <OrderDetails
                            orderDetails={hasExistingOrder ? orderDetails : defaultOrder}
                            selectedDate={selectedDate}
                            shift={shift}
                            isEditable={editable}
                        />
                        <OrderProductsList
                            products={hasExistingOrder ? orderDetails.products : defaultOrder.products}
                            isEditable={editable}
                            onQuantityChange={handleQuantityChange}
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5', // Light grey background for SafeAreaView
    },
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5', // Light grey background for container
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#3498db', // Blue header background
        paddingVertical: 15,
        paddingHorizontal: 20,
        elevation: 5, // Shadow for header
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff', // White header title color
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
        backgroundColor: '#27ae60', // Green submit button
        paddingVertical: 15,
        borderRadius: 10,
        elevation: 3, // Subtle shadow for button
        marginTop: 20, // Spacing above submit button
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
        backgroundColor: "rgba(0,0,0,0.6)", // Slightly darker modal backdrop
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 30, // Increased padding in modal
        borderRadius: 15, // More rounded modal corners
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 7, // More pronounced shadow for modal
    },
    modalText: {
        fontSize: 20, // Larger modal text
        fontWeight: 'bold',
        marginBottom: 25, // More margin below modal text
        color: '#333',
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around', // Space buttons more evenly
        width: '100%', // Buttons take full width of modal content
    },
});

export default PlaceOrderPage;