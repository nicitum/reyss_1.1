import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import axios from "axios";
import { ipAddress } from "../../urls";
import { checkTokenAndRedirect } from "../../services/auth";
import { useNavigation } from "@react-navigation/native";
import Pagination from "../general/Pagination";

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [orderProducts, setOrderProducts] = useState([]);
  const navigation = useNavigation();
  const [expandedOrders, setExpandedOrders] = useState({});

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const fetchOrders = async (page) => {
    try {
      setLoading(true);
      const token = await checkTokenAndRedirect(navigation);
      if (!token) throw new Error("No authorization token found.");

      const response = await axios.get(
        `http://${ipAddress}:8090/orderHistory`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            page: page,
            limit: ITEMS_PER_PAGE,
            orderBy: "DESC",
          },
        }
      );

      // Map orders with all their defect information
      const ordersWithDefects = response.data.orders.map((order) => {
        // Get all defects for this order
        const orderDefects = response.data.defectOrders.filter(
          (defect) => defect.order_id === order.order_id
        );

        if (orderDefects.length > 0) {
          // Map each defect with its product details
          const defectsWithProducts = orderDefects.map((defect) => {
            const productDetails = order.products.find(
              (product) => product.product_id === defect.product_id
            );

            return {
              ...defect,
              productDetails,
            };
          });

          return {
            ...order,
            defectInfo: defectsWithProducts,
          };
        }

        return {
          ...order,
          defectInfo: null,
        };
      });

      setOrders(ordersWithDefects);
      setTotalOrders(response.data.count);
      setTotalPages(Math.ceil(response.data.count / ITEMS_PER_PAGE));
    } catch (error) {
      console.error("Error fetching order history:", error);
      Alert.alert("Error", "Failed to fetch orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(currentPage);
  }, [currentPage]); // Refetch when page changes

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleReportPress = (orderId, products) => {
    setSelectedOrderId(orderId);
    setOrderProducts(products);
    setModalVisible(true);
    setSelectedProducts({});
  };

  const handleProductSelection = (productId) => {
    setSelectedProducts((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        selected: !(prev[productId]?.selected || false),
        quantity: prev[productId]?.quantity || "",
      },
    }));
  };

  const handleQuantityChange = (productId, quantity) => {
    // Allow empty string when user is typing
    if (quantity === "") {
      setSelectedProducts((prev) => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          quantity: "", // Allow empty temporarily while typing
        },
      }));
      return;
    }

    // Convert to number and validate
    const numQuantity = parseInt(quantity) || 0;
    const maxQuantity =
      orderProducts.find((p) => p.product_id === productId)?.quantity || 1;

    // Only update if it's a valid number
    if (numQuantity >= 0 && numQuantity <= maxQuantity) {
      setSelectedProducts((prev) => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          quantity: numQuantity,
        },
      }));
    }
  };

  const handleSubmitReport = async () => {
    try {
      const token = await checkTokenAndRedirect(navigation);
      if (!token) throw new Error("No authorization token found.");

      // Validate quantities before submission
      const invalidProducts = Object.entries(selectedProducts)
        .filter(([_, data]) => data.selected)
        .find(([_, data]) => !data.quantity || data.quantity <= 0);

      if (invalidProducts) {
        alert("Please enter valid quantities for all selected products");
        return;
      }

      const defectiveProducts = Object.entries(selectedProducts)
        .filter(([_, data]) => data.selected)
        .map(([productId, data]) => ({
          productId: parseInt(productId),
          quantity: data.quantity,
          reportDescription: "The product is damaged.",
        }));

      if (defectiveProducts.length === 0) {
        Alert.alert("Please select at least one product to report");
        return;
      }

      const response = await axios.post(
        `http://${ipAddress}:8090/report`,
        {
          orderId: selectedOrderId,
          defectiveProducts,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.message) {
        alert(response.data.message);
        setModalVisible(false);
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      alert(error.response?.data?.message || "Error submitting report");
    }
  };

  const toggleOrderExpansion = (orderId) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const renderDefectStatus = (defectInfo, orderId) => {
    if (!defectInfo) return null;

    const statusColors = {
      pending: "#fff3cd",
      approved: "#d4edda",
      rejected: "#f8d7da",
    };

    const isExpanded = expandedOrders[orderId];

    return (
      <View>
        <TouchableOpacity
          onPress={() => toggleOrderExpansion(orderId)}
          style={styles.expandButton}
        >
          <Text style={styles.expandButtonText}>
            {isExpanded ? "⬇️" : "⬆️"} Report Status ({defectInfo.length} items)
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View>
            {defectInfo.map((defect, index) => (
              <View
                key={`${defect.order_id}-${defect.product_id}-${index}`}
                style={[
                  styles.defectStatusContainer,
                  { backgroundColor: statusColors[defect.status] },
                  index > 0 && styles.defectDivider,
                ]}
              >
                <Text style={styles.defectStatusText}>
                  {defect.status.toUpperCase()}
                </Text>
                <Text style={styles.defectProductText}>
                  {defect.productDetails.name} ({defect.quantity} pkts) |{" "}
                  {defect.report_description}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
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
      <ScrollView>
        {orders.length === 0 ? (
          <Text style={styles.noOrdersText}>No orders found.</Text>
        ) : (
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>Date</Text>
              </View>
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>ID</Text>
              </View>
              <View style={styles.headerCell}>
                <Text style={styles.headerText}>Amount</Text>
              </View>
              <View style={[styles.headerCell, styles.actionCell]}>
                <Text style={styles.headerText}>Action</Text>
              </View>
              <View style={[styles.headerCell, styles.actionCell]}>
                <Text style={styles.headerText}>Status</Text>
              </View>
            </View>

            {orders.map((order) => (
              <View key={order.order_id}>
                <View style={styles.tableRow}>
                  <View style={styles.cell}>
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
                  <View style={styles.cell}>
                    <Text style={styles.cellText}>{order.order_id}</Text>
                  </View>
                  <View style={styles.cell}>
                    <Text style={styles.cellText}>₹{order.total_amount}</Text>
                  </View>
                  <View style={[styles.cell, styles.actionCell]}>
                    {!order.defectInfo && (
                      <TouchableOpacity
                        style={styles.reportButton}
                        onPress={() =>
                          handleReportPress(order.order_id, order.products)
                        }
                      >
                        <Text style={styles.reportButtonText}>⚠️ Report</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.cell}>
                    {order.delivery_status === "pending" ? (
                      <TouchableOpacity style={styles.updateButton}>
                        <Text style={styles.updateButtonText}>Update</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.deliveryStatusText}>
                        {order.delivery_status.toUpperCase()}
                      </Text>
                    )}
                  </View>
                </View>
                {order.defectInfo &&
                  renderDefectStatus(order.defectInfo, order.order_id)}
              </View>
            ))}
          </View>
        )}

        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Report Damaged Products</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.productList}>
                {orderProducts.map((product) => (
                  <View key={product.product_id} style={styles.productItem}>
                    <TouchableOpacity
                      style={styles.productHeader}
                      onPress={() => handleProductSelection(product.product_id)}
                    >
                      <View style={styles.checkbox}>
                        {selectedProducts[product.product_id]?.selected && (
                          <View style={styles.checked} />
                        )}
                      </View>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productPrice}>₹{product.price}</Text>
                    </TouchableOpacity>

                    {selectedProducts[product.product_id]?.selected && (
                      <View style={styles.productDetails}>
                        <View style={styles.quantityContainer}>
                          <Text style={styles.label}>Damaged Quantity:</Text>
                          <TextInput
                            style={styles.quantityInput}
                            keyboardType="numeric"
                            value={String(
                              selectedProducts[product.product_id]?.quantity ||
                                ""
                            )}
                            onChangeText={(text) =>
                              handleQuantityChange(product.product_id, text)
                            }
                            maxLength={2}
                          />
                          <Text style={styles.maxQuantity}>
                            Max: {product.quantity}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitReport}
              >
                <Text style={styles.submitButtonText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
      {orders.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalOrders}
          onPageChange={handlePageChange}
          itemsLabel="Orders"
          primaryColor="#ffcc00"
          style={styles.paginationStyle}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  noOrdersText: {
    textAlign: "center",
    fontSize: 18,
    color: "#999",
    marginTop: 40,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#ffcc00",
    paddingVertical: 15,
  },
  headerCell: {
    flex: 1,
    paddingHorizontal: 8,
  },
  headerText: {
    fontSize: 14,
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
    paddingVertical: 12,
    justifyContent: "center",
  },
  actionCell: {
    alignItems: "center",
  },
  cellText: {
    fontSize: 13,
    color: "#333",
    textAlign: "center",
  },
  reportButton: {
    backgroundColor: "#FF9800",
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderRadius: 6,
  },
  reportButtonText: {
    fontSize: 12,
    // fontWeight: "bold",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 10,
    width: "90%",
    maxHeight: "80%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: "#666",
  },
  productList: {
    maxHeight: "80%",
  },
  productItem: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8f8f8",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#ffcc00",
    borderRadius: 4,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checked: {
    width: 12,
    height: 12,
    backgroundColor: "#ffcc00",
    borderRadius: 2,
  },
  productName: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  productPrice: {
    fontSize: 16,
    color: "#666",
    marginLeft: 10,
  },
  productDetails: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginRight: 10,
  },
  quantityInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 4,
    padding: 8,
    width: 50,
    textAlign: "center",
  },
  maxQuantity: {
    fontSize: 12,
    color: "#999",
    marginLeft: 10,
  },
  submitButton: {
    backgroundColor: "#ffcc00",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  defectStatusContainer: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  defectStatusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#666",
  },
  defectProductsList: {
    marginTop: 4,
  },
  defectProductText: {
    fontSize: 9,
    color: "#666",
    marginLeft: 10,
  },
  defectDescriptionText: {
    fontSize: 9,
    color: "#666",
    marginLeft: 10,
    marginTop: 2,
    fontStyle: "italic",
  },
  expandButton: {
    padding: 8,
    backgroundColor: "#f8f8f8",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  expandButtonText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  updateButton: {
    backgroundColor: "#03A9F4",
    borderRadius: 5,
    alignItems: "center",
    marginRight: 5,
    paddingVertical: 3,
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 12,
  },
  deliveryStatusText: {
    fontSize: 10,
    color: "#333",
    textAlign: "center",
  },
  paginationStyle: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
});

export default OrdersPage;
