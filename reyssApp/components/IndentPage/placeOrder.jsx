import React, { useState, useEffect } from "react";
import { View, Alert, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import moment from "moment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Icon from "react-native-vector-icons/MaterialIcons";
import LoadingIndicator from "../general/Loader";
import OrderDetails from "./nestedPage/orderDetails";
import OrderProductsList from "./nestedPage/orderProductsList";
import BackButton from "../general/backButton";
import SubmitButton from "./nestedPage/submitButton";
import ErrorMessage from "../general/errorMessage";
import OrderModal from "../general/orderModal";
import SearchProductModal from "./nestedPage/searchProductModal";
import { ipAddress } from "../../urls";
import { checkTokenAndRedirect } from "../../services/auth";
import { jwtDecode } from "jwt-decode";



const PlaceOrderPage = ({ route }) => {
  const { order, selectedDate, shift } = route.params;
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [defaultOrder, setDefaultOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const navigation = useNavigation();
  const [editable, setEditable] = useState(false);
  const [updatedQuantities, setUpdatedQuantities] = useState({});

  const isPastDate = moment(selectedDate).isBefore(moment(), "day");
  const isCurrentDate = moment(selectedDate).isSame(moment(), "day");
  const hasExistingOrder = orderDetails !== null;

  // Check if ordering should be disabled
  const isOrderingDisabled = isPastDate || hasExistingOrder;

  useEffect(() => {
    const fetchDefaultOrder = async () => {
      console.log("🗄 Retrieving default order from AsyncStorage...");
  
      try {
        const storedOrder = await AsyncStorage.getItem("default");
  
        if (storedOrder) {
          const parsedOrder = JSON.parse(storedOrder);
          
          setDefaultOrder(parsedOrder);
        } else {
          console.log("⚠️ No default order found in AsyncStorage. Fetching from API...");
        }
  
        // Fetch latest order from API
        const storedToken = await AsyncStorage.getItem("userAuthToken");
        if (!storedToken) {
          console.log("❌ No token found.");
          return;
        }
  
        const decodedToken = jwtDecode(storedToken);
        const customerId = decodedToken.id;
  
       
  
        const response = await fetch(`http://localhost:8090/get-default-order/${customerId}`);
        const data = await response.json();
  
        console.log("✅ API Response:", data);
  
        if (data.status && data.default_orders.length > 0) {
          console.log("🔄 Transforming API response to match stored format...");
  
          const transformedOrder = {
            order: {
              customer_id: customerId,
              total_amount: data.default_orders[0].total_amount
            },
            products: data.default_orders.map(order => ({
              id: order.product_id,
              quantity: order.quantity,
              price: order.total_amount, // Assuming total amount is price * quantity
              name: order.product_name,
              category: "Unknown" // API does not provide category, setting default
            }))
          };
  
         
          await AsyncStorage.setItem("default", JSON.stringify(transformedOrder));
  
          setDefaultOrder(transformedOrder);
          setShowModal(!isOrderingDisabled);
        } else {
          console.log("⚠️ No default order found in API.");
        }
      } catch (error) {
        console.error("❌ Error fetching default order:", error);
      }
  
      setLoading(false);
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
        setError("Authorization token is missing");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `http://${ipAddress}:8090/order?orderId=${orderId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${userAuthToken}`,
            "Content-Type": "application/json",
          },
        }
      );

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
      // Get current modified order from AsyncStorage
      const storedOrder = await AsyncStorage.getItem("modifiedOrder");
      const currentProducts = storedOrder
        ? JSON.parse(storedOrder)
        : defaultOrder?.products || [];

      // Check if the product already exists
      const isDuplicate = currentProducts.some(
        (existingProduct) => existingProduct.product_id === product.id
      );

      if (isDuplicate) {
        Alert.alert("Item Exists", "Please increase the quantity.");
        return;
      }

      // Create new product object
      const newProduct = {
        category: product.category,
        name: product.name,
        price: product.discountPrice || product.price,
        product_id: product.id,
        quantity: 1,
      };

      // Add new product to current products
      const updatedProducts = [...currentProducts, newProduct];

      // Update state
      setDefaultOrder({ ...defaultOrder, products: updatedProducts });

      // Save to AsyncStorage
      await AsyncStorage.setItem(
        "modifiedOrder",
        JSON.stringify(updatedProducts)
      );

      // Close search modal
      setShowSearchModal(false);
    } catch (error) {
      console.error("Error adding product:", error);
      Alert.alert("Error", "Could not add product to the order");
    }
  };

  const handleQuantityChange = async (text, index) => {
    try {
      // Get current products from AsyncStorage
      const storedOrder = await AsyncStorage.getItem("modifiedOrder");
      const currentProducts = storedOrder
        ? JSON.parse(storedOrder)
        : defaultOrder?.products || [];

      // Create a new array of products
      const updatedProducts = [...currentProducts];
      const parsedQuantity = parseInt(text, 10);

      // Update quantity for the specific product
      updatedProducts[index] = {
        ...updatedProducts[index],
        quantity: isNaN(parsedQuantity) ? 0 : parsedQuantity,
      };

      // Update state with new products
      setDefaultOrder({ ...defaultOrder, products: updatedProducts });

      // Save to AsyncStorage - store just the products array
      await AsyncStorage.setItem(
        "modifiedOrder",
        JSON.stringify(updatedProducts)
      );
    } catch (error) {
      console.error("Error updating quantity:", error);
      Alert.alert("Error", "Could not update quantity");
    }
  };

  const handleSaveChanges = async () => {
    try {
      const updatedOrder = {
        ...defaultOrder,
        products: defaultOrder.products.map((product) => ({
          ...product,
          quantity: updatedQuantities[product.id] || product.quantity,
        })),
      };

      // Update state
      setDefaultOrder(updatedOrder);

      // Save to AsyncStorage
      await AsyncStorage.setItem("modifiedOrder", JSON.stringify(updatedOrder));

      // Exit edit mode
      setEditable(false);
    } catch (error) {
      console.error("Error saving changes:", error);
      Alert.alert("Error", "Could not save changes");
    }
  };

  const handleSelectOrder = () => {
    setEditable(false);
    setShowModal(false);
  };

  const handleEditOrder = () => {
    setEditable(true);
    setShowModal(false);
    const initialQuantities = defaultOrder?.products.reduce((acc, product) => {
      acc[product.id] = product.quantity;
      return acc;
    }, {});
    setUpdatedQuantities(initialQuantities);
  };

  const handleSubmit = async () => {
    try {
      const userAuthToken = await checkTokenAndRedirect(navigation);
      if (!userAuthToken) {
        Alert.alert("Error", "Authorization token is missing.");
        return;
      }
      const orderDate = new Date(selectedDate).toISOString();

      if (!defaultOrder.products || defaultOrder.products.length === 0) {
        Alert.alert("Error", "No products selected. Please add items to your order.");
        return;
      }

      const options = {
        method: "POST",
        url: `http://${ipAddress}:8090/place`,
        data: {
          products: defaultOrder.products,
          orderType: shift,
          orderDate,
        },
        headers: {
          Authorization: `Bearer ${userAuthToken}`,
          "Content-Type": "application/json",
        },
      };

      // Log request data before sending it
      console.log("Request Payload:", JSON.stringify(options, null, 2));

      const response = await axios(options);
      console.log("Response Data:", response.data);

      if (response.status === 200) {
        await AsyncStorage.removeItem("modifiedOrder");

        Alert.alert("Success", "Order has been submitted successfully.");
        navigation.navigate("IndentPage");
      } else {
        throw new Error("Unexpected response status.");
      }
    } catch (error) {
      console.error("Submit error:", error);
      if (error.response) {
        console.log("Response Error Data:", error.response.data);
        Alert.alert(
          "Error",
          error.response.data.message || "Server error occurred."
        );
      } else if (error.request) {
        console.log("Network error:", error.request);
        Alert.alert("Error", "Network error, please check your connection.");
      } else {
        console.error("Error:", error.message);
        Alert.alert("Error", error.message || "An error occurred.");
      }
    }
  };


  const handleSubmitEdit = async () => {
    try {
      const userAuthToken = await checkTokenAndRedirect(navigation);
      if (!userAuthToken) {
        Alert.alert("Error", "Authorization token is missing.");
        return;
      }

      const modified = await AsyncStorage.getItem("modifiedOrder");
      const data = JSON.parse(modified);

      // Transform the data
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
        // Clear the modified order after successful submission
        await AsyncStorage.removeItem("modifiedOrder");

        Alert.alert("Success", "Order has been submitted successfully.");
        navigation.navigate("IndentPage");
      } else {
        throw new Error("Unexpected response status.");
      }
    } catch (error) {
      console.error("Submit error:", error);
      if (error.response) {
        console.log(error.response.data.message);
        Alert.alert(
          "Failure",
          error.response.data.message || "Server error occurred."
        );
      } else if (error.request) {
        console.log("Network error:", error.request);
        Alert.alert("Error", "Network error, please check your connection.");
      } else {
        console.error("Error:", error.message);
        Alert.alert("Error", error.message || "An error occurred.");
      }
    }
  };

  const ConfirmModal = ({ isVisible, onConfirm, onCancel }) => {
    return (
      <Modal visible={isVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Do you want to place this order?</Text>
            <View style={styles.buttonContainer}>
              <Button title="Cancel" onPress={onCancel} color="red" />
              <Button title="Place Order" onPress={onConfirm} color="green" />
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
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <BackButton navigation={navigation} />
        {editable && !isOrderingDisabled && (
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setShowSearchModal(true)}
          >
            <Icon name="search" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Render order details */}
      {(hasExistingOrder || defaultOrder) && (
        <>
          <OrderDetails
            orderDetails={hasExistingOrder ? orderDetails : defaultOrder}
            selectedDate={selectedDate}
            shift={shift}
            isEditable={editable && !isOrderingDisabled}
          />
          <OrderProductsList
            products={
              hasExistingOrder ? orderDetails.products : defaultOrder.products
            }
            isEditable={editable && !isOrderingDisabled}
            onQuantityChange={handleQuantityChange}
          />

          {/* Only show ordering-related components if ordering is not disabled */}
          {!isOrderingDisabled && (
            <>
              {editable ? (
                <SubmitButton handleSubmit={handleSubmitEdit} />
              ) : (
                <>
                  <OrderModal
                    isVisible={showModal}
                    onClose={() => setShowModal(false)}
                    onSelect={handleSelectOrder}
                    onEdit={handleEditOrder}
                  />
                  <SubmitButton handleSubmit={handleSubmit} />
                </>
              )}

              <SearchProductModal
                isVisible={showSearchModal}
                onClose={() => setShowSearchModal(false)}
                onAddProduct={handleAddProduct}
              />
            </>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffcc00",
    paddingTop: 20,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  searchButton: {
    padding: 10,
  },

  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
  },
});

export default PlaceOrderPage;