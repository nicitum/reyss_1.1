import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { ipAddress } from "../../urls";
import LoadingIndicator from "../general/Loader";
import { checkTokenAndRedirect } from "../../services/auth";
import { useNavigation } from "@react-navigation/native";

const ProfileContent = () => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [defaultOrder, setDefaultOrder] = useState(null);
  const [error, setError] = useState(null);

  const navigation = useNavigation();

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const token = await checkTokenAndRedirect(navigation);
        if (!token) throw new Error("No authorization token found.");

        const response = await axios.get(
          `http://${ipAddress}:8090/userDetails`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const { user, defaultOrder } = response.data;
        setUserData(user);
        setDefaultOrder(defaultOrder);
      } catch (err) {
        setError(err.message || "Failed to fetch data.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, []);

  if (loading) {
    <LoadingIndicator />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.header}>User Details</Text>
        <View style={styles.userInfo}>
          <Text style={styles.title}>Name: {userData?.name}</Text>
          <Text style={styles.detailText}>Phone: {userData?.phone}</Text>
          <Text style={styles.detailText}>Username: {userData?.username}</Text>
          <Text style={styles.detailText}>
            Delivery Address: {userData?.delivery_address}
          </Text>
          <Text style={styles.detailText}>Route: {userData?.route}</Text>
        </View>
      </View>

      {defaultOrder ? (
        <View style={styles.section}>
          <Text style={styles.header}>Default Order Products</Text>
          <View style={styles.orderInfo}>
            <Text style={styles.detailText}>
              Total Amount: ₹{defaultOrder.order.total_amount}
            </Text>
            {defaultOrder.products.map((product, index) => (
              <View key={index} style={styles.productItem}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productDetail}>
                  Quantity: {product.quantity} | Price: ₹{product.price}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.header}>No Default Order Available</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "red",
    fontSize: 16,
  },
  section: {
    marginBottom: 10,
    paddingVertical: 20,
    backgroundColor: "#fff",
    boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.12)",
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  userInfo: {
    marginBottom: 10,
  },
  orderInfo: {
    marginTop: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  detailText: {
    fontSize: 16,
    marginBottom: 8,
    color: "#666",
  },
  subHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  productItem: {
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
    marginVertical: 5,
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  productDetail: {
    fontSize: 14,
    color: "#777",
  },
});

export default ProfileContent;
