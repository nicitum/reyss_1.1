import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import axios from "axios";
import moment from "moment";
import { ipAddress } from "../../urls";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialIcons"; // Import MaterialIcons
import LoadingIndicator from "../general/Loader";
import RefreshButton from "../general/RefreshButton";
import { checkTokenAndRedirect } from "../../services/auth";
import { useNavigation } from "@react-navigation/native";

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(moment().format("MM"));
  const [currentYear, setCurrentYear] = useState(moment().format("YYYY"));
  const [viewedMonth, setViewedMonth] = useState(currentMonth);
  const [viewedYear, setViewedYear] = useState(currentYear);
  const [totalOrderAmount, setTotalOrderAmount] = useState(0);
  const [totalAmountPaid, setTotalAmountPaid] = useState(0);

  const navigation = useNavigation();

  const fetchTransactions = async (month, year) => {
    setLoading(true);
    try {
      const userAuthToken = await checkTokenAndRedirect(navigation);
      if (!userAuthToken) {
        Alert.alert("Error", "Authorization token is missing.");
        return;
      }

      const options = {
        method: "GET",
        url: `http://${ipAddress}:8090/trans`,
        params: { month, year },
        headers: {
          Authorization: `Bearer ${userAuthToken}`,
          "Content-Type": "application/json",
        },
      };

      const response = await axios(options);

      const { orders, total_order_amount, total_amount_paid } =
        response.data.data;
      setTransactions(orders);
      setTotalOrderAmount(total_order_amount);
      setTotalAmountPaid(total_amount_paid);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      Alert.alert("Error", "Failed to fetch transactions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(viewedMonth, viewedYear);
  }, [viewedMonth, viewedYear]);

  const goToPreviousMonth = () => {
    const previousMonth = moment(
      `${viewedYear}-${viewedMonth}`,
      "YYYY-MM"
    ).subtract(1, "month");
    setViewedMonth(previousMonth.format("MM"));
    setViewedYear(previousMonth.format("YYYY"));
  };

  const goToNextMonth = () => {
    const nextMonth = moment(`${viewedYear}-${viewedMonth}`, "YYYY-MM").add(
      1,
      "month"
    );
    if (nextMonth.isAfter(moment())) return; // Prevent future navigation
    setViewedMonth(nextMonth.format("MM"));
    setViewedYear(nextMonth.format("YYYY"));
  };
  const handleRefresh = async () => {
    fetchTransactions(viewedMonth, viewedYear);
  };

  return (
    <View style={styles.container}>
      {/* Page Header with Refresh Button */}
      <View style={styles.pageHeader}>
        <Text style={styles.headerText}>Transactions</Text>
        <RefreshButton onRefresh={handleRefresh} />
      </View>

      {/* Month Navigation */}
      <View style={styles.navigation}>
        <Icon
          name="navigate-before"
          size={30}
          color={
            viewedMonth === "01" && viewedYear === currentYear
              ? "#d3d3d3"
              : "#ffcc00"
          } // Disable for the first month of the current year
          onPress={goToPreviousMonth}
          disabled={viewedMonth === "01" && viewedYear === currentYear}
        />
        <Text style={styles.monthText}>
          {moment(`${viewedYear}-${viewedMonth}`).format("MMMM YYYY")}
        </Text>
        <Icon
          name="navigate-next"
          size={30}
          color={
            moment(`${viewedYear}-${viewedMonth}`, "YYYY-MM").isSame(
              moment(),
              "month"
            )
              ? "#d3d3d3"
              : "#ffcc00"
          } // Disable next button for current month
          onPress={goToNextMonth}
          disabled={moment(`${viewedYear}-${viewedMonth}`, "YYYY-MM").isSame(
            moment(),
            "month"
          )}
        />
      </View>

      {/* Totals for the month */}
      <View style={styles.totalContainer}>
        <Text style={styles.totalText}>
          Total Invoice: ₹{totalOrderAmount || 0}
        </Text>
        <Text style={styles.totalText}>
          Total Paid: ₹{totalAmountPaid || 0}
        </Text>
      </View>

      {/* Transactions Header */}
      <View style={styles.transactionsHeader}>
        <Text style={styles.TheaderText}>Date</Text>
        <Text style={styles.TheaderText}>Invoice</Text>
        <Text style={styles.TheaderText}>Paid</Text>
      </View>

      {/* Transactions */}
      {loading ? (
        <LoadingIndicator />
      ) : transactions.length > 0 ? (
        <FlatList
          data={transactions}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.transactionItem}>
              <Text>{moment(item.order_date).format("MMM DD")}</Text>
              <Text style={styles.amountText}>₹{item.order_amount}</Text>
              <Text style={styles.amountText}>₹{item.amount_paid}</Text>
            </View>
          )}
        />
      ) : (
        <View>
          <Text style={styles.messageText}>
            No indents placed for this month.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  pageHeader: {
    backgroundColor: "#ffcc00",
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  TheaderText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  navigation: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 10,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  totalText: {
    fontSize: 16,
    fontWeight: "600",
  },
  transactionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#ffcc00",
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginVertical: 2,
    borderRadius: 5,
    boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.12)",
  },
  amountText: {
    textAlign: "center",
  },
  messageText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 24,
    marginTop: 50,
  },
});

export default TransactionsPage;
