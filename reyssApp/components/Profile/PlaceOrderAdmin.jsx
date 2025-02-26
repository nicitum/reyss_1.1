import React, { useState, useEffect } from "react"
import { View, ScrollView, Text, StyleSheet, SafeAreaView } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { jwtDecode } from "jwt-decode"
import { Checkbox, Button, Snackbar } from "react-native-paper" // Import Snackbar

import { ipAddress } from "../../urls"

const PlaceOrderAdmin = () => {
  // Keep all original state and functions exactly as they were
  const [assignedUsers, setAssignedUsers] = useState([])
  const [error, setError] = useState(null)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userAuthToken, setUserAuthToken] = useState(null)
  const [currentAdminId, setCurrentAdminId] = useState(null)
  const [loadingToken, setLoadingToken] = useState(true)
  const [orderStatuses, setOrderStatuses] = useState({})
  const [placingOrder, setPlacingOrder] = useState({})
  const [placementError, setPlacementError] = useState({})
  const [recentOrderIds, setRecentOrderIds] = useState({})
  const [selectAll, setSelectAll] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState([])
  const [successMessage, setSuccessMessage] = useState(null) // Add success message state
  const [snackbarVisible, setSnackbarVisible] = useState(false) // Add snackbar visibility state

  // Keep all original functions exactly as they were
  const fetchAssignedUsers = async () => {
    setLoadingUsers(true)
    setError(null)
    try {
      const response = await fetch(`http://${ipAddress}:8090/assigned-users/${currentAdminId}`, {
        headers: {
          Authorization: `Bearer ${userAuthToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const message = `Failed to fetch assigned users. Status: ${response.status}`
        throw new Error(message)
      }

      const responseData = await response.json()
      console.log("Assigned Users Response:", responseData)

      if (responseData.success) {
        setAssignedUsers(responseData.assignedUsers)
        responseData.assignedUsers.forEach((user) => {
          fetchOrderStatuses(user.cust_id)
        })
      } else {
        setError(responseData.message || "Failed to fetch assigned users.")
      }
    } catch (err) {
      console.error("Error fetching assigned users:", err)
      setError("Error fetching assigned users. Please try again.")
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchMostRecentOrder = async (customerId, orderType) => {
    try {
      let apiUrl = `http://${ipAddress}:8090/most-recent-order?customerId=${customerId}`
      if (orderType && (orderType === "AM" || orderType === "PM")) {
        apiUrl += `&orderType=${orderType}`
      }

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${userAuthToken}`,
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        if (response.status === 400 && response.url.includes("/most-recent-order")) {
          console.warn(`No recent ${orderType || "any"} order found for customer ${customerId}. Status: ${response.status}`)
          return null
        }
        const message = `Failed to fetch recent ${orderType || "any"} order for customer ${customerId}. Status: ${response.status}`
        throw new Error(message)
      }
      const responseData = await response.json()
      return responseData.order
    } catch (error) {
      console.error(`Error fetching most recent ${orderType || "any"} order for customer ${customerId}:`, error)
      return null
    }
  }

  const fetchOrderStatuses = async (customerId) => {
    try {
      const amOrder = await fetchMostRecentOrder(customerId, "AM")
      const pmOrder = await fetchMostRecentOrder(customerId, "PM")

      setOrderStatuses((prevStatuses) => ({
        ...prevStatuses,
        [customerId]: {
          am: amOrder || null,
          pm: pmOrder || null,
        },
      }))
    } catch (err) {
      console.error("Error fetching order statuses:", err)
    }
  }

  const handleSelectAllCheckbox = () => {
    setSelectAll(!selectAll)
    if (!selectAll) {
      const allUserIds = assignedUsers.map((user) => user.cust_id)
      setSelectedUsers(allUserIds)
    } else {
      setSelectedUsers([])
    }
  }

  const handleCheckboxChange = (customerId) => {
    setSelectedUsers((prevSelected) => {
      if (prevSelected.includes(customerId)) {
        return prevSelected.filter((id) => id !== customerId)
      } else {
        return [...prevSelected, customerId]
      }
    })
  }

  const handleBulkPlaceOrder = async (orderType) => {
    setPlacingOrder((prevPlacing) => ({ ...prevPlacing, [orderType]: true }))
    setPlacementError((prevErrors) => ({ ...prevErrors, [orderType]: null }))

    try {
      const orderPromises = selectedUsers.map((customerId) => placeAdminOrder(customerId, orderType))

      await Promise.all(orderPromises)

      // After placing orders, refresh the order statuses
      selectedUsers.forEach((customerId) => fetchOrderStatuses(customerId))

      // Clear selected users and update UI
      setSelectedUsers([])
      setSelectAll(false)

      setSuccessMessage(`Successfully placed ${orderType} orders for selected users.`) // Set success message
      setSnackbarVisible(true) // Show snackbar
    } catch (err) {
      console.error(`Error placing ${orderType} orders:`, err)
      setPlacementError((prevErrors) => ({
        ...prevErrors,
        [orderType]: "Failed to place orders. Please try again.",
      }))
      setError(`Failed to place ${orderType} orders. Please check console for details.`) // Set general error
    } finally {
      setPlacingOrder((prevPlacing) => ({ ...prevPlacing, [orderType]: false }))
    }
  }

  const placeAdminOrder = async (customerId, orderType) => {
    setPlacingOrder((prevState) => ({ ...prevState, [customerId]: true }))
    setPlacementError((prevState) => ({ ...prevState, [customerId]: null }))

    try {
      const recentTypeOrder = await fetchMostRecentOrder(customerId, orderType)
      let referenceOrderId = recentTypeOrder ? recentTypeOrder.id : recentOrderIds[customerId]

      if (!referenceOrderId) {
        const errorMsg = `Could not find a recent order to reference for customer ${customerId} to place ${orderType} order.`
        setPlacementError((prevState) => ({ ...prevState, [customerId]: errorMsg }))
        throw new Error(errorMsg)
      }

      const response = await fetch(`http://${ipAddress}:8090/on-behalf`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${userAuthToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: customerId,
          order_type: orderType,
          reference_order_id: referenceOrderId,
        }),
      })

      if (!response.ok) {
        const message = `Failed to place ${orderType} order for customer ${customerId}. Status: ${response.status}`
        throw new Error(message)
      }

      const responseData = await response.json()
      console.log(`Place ${orderType} Order Response:`, responseData)
      fetchOrderStatuses(customerId)
      setSuccessMessage(`${orderType} Order placed successfully for Customer ID: ${customerId}`) // Set success message
      setSnackbarVisible(true) // Show snackbar
    } catch (err) {
      console.error(`Error placing ${orderType} order for customer ${customerId}:`, err)
      setPlacementError((prevState) => ({
        ...prevState,
        [customerId]: `Error placing ${orderType} order: ${err.message}. Please try again.`,
      }))
      setError(`Failed to place ${orderType} order. Please see customer specific errors.`) // Set general error
    } finally {
      setPlacingOrder((prevState) => ({ ...prevState, [customerId]: false }))
    }
  }

  useEffect(() => {
    const loadAdminData = async () => {
      setLoadingToken(true)
      setError(null)

      try {
        const storedToken = await AsyncStorage.getItem("userAuthToken")
        if (!storedToken) {
          setError("User authentication token not found.")
          setLoadingToken(false)
          return
        }

        const decodedToken = jwtDecode(storedToken)
        const adminId = decodedToken.id1

        setUserAuthToken(storedToken)
        setCurrentAdminId(adminId)
      } catch (tokenError) {
        console.error("Error fetching or decoding token:", tokenError)
        setError("Failed to authenticate admin. Please try again.")
      } finally {
        setLoadingToken(false)
      }
    }

    loadAdminData()
  }, [])

  useEffect(() => {
    if (currentAdminId && userAuthToken) {
      fetchAssignedUsers()
    }
  }, [currentAdminId, userAuthToken])

  // Keep all original helper functions
  const getOrderStatusDisplay = (order) => {
    if (order) {
      const placedDate = new Date(order.placed_on * 1000).toLocaleDateString()
      return `Placed on: ${placedDate}`
    } else {
      return "No Order Placed"
    }
  }

  const getHasOrderTodayDisplay = (order, orderType) => {
    const today = new Date()
    const isSameDay = (date1, date2) => {
      return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
      )
    }

    if (order && orderType === "AM" && isSameDay(new Date(order.placed_on * 1000), today)) {
      return "Yes"
    }
    if (order && orderType === "PM" && isSameDay(new Date(order.placed_on * 1000), today)) {
      return "Yes"
    }
    return "No"
  }

  const onDismissSnackbar = () => setSnackbarVisible(false) // Snackbar dismiss function

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Management Dashboard</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {successMessage && (
          <Snackbar
            visible={snackbarVisible}
            onDismiss={onDismissSnackbar}
            duration={3000}
            style={{ marginBottom: 20 }}
          >
            {successMessage}
          </Snackbar>
        )}

        <View style={styles.actionsContainer}>
          <View style={styles.selectAllContainer}>
            <Checkbox status={selectAll ? "checked" : "unchecked"} onPress={handleSelectAllCheckbox} />
            <Text style={styles.selectAllText}>Select All</Text>
          </View>
          <View style={styles.bulkActionsContainer}>
            <Button
              mode="contained"
              onPress={() => handleBulkPlaceOrder("AM")} // Connect bulk AM order function
              style={styles.bulkActionButton}
              disabled={selectedUsers.length === 0}
            >
              Place AM Orders
            </Button>
            <Button
              mode="contained"
              onPress={() => handleBulkPlaceOrder("PM")} // Connect bulk PM order function
              style={styles.bulkActionButton}
              disabled={selectedUsers.length === 0}
            >
              Place PM Orders
            </Button>
          </View>
        </View>
      </View>

      {loadingToken || loadingUsers ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {assignedUsers.map((user) => {
            const statuses = orderStatuses[user.cust_id] || {}
            const amOrderStatus = statuses.am
            const pmOrderStatus = statuses.pm
            const isUserSelected = selectedUsers.includes(user.cust_id)

            return (
              <View key={user.cust_id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Checkbox
                    status={isUserSelected ? "checked" : "unchecked"}
                    onPress={() => handleCheckboxChange(user.cust_id)} // Connect user checkbox function
                  />
                  <Text style={styles.customerId}>Customer ID: {user.cust_id}</Text>
                </View>

                <View style={styles.orderInfo}>
                  <View style={styles.orderSection}>
                    <Text style={styles.orderType}>AM Order</Text>
                    <Text style={styles.orderStatus}>{placementError[user.cust_id] || getOrderStatusDisplay(amOrderStatus)}</Text>
                    <View
                      style={[
                        styles.todayStatus,
                        getHasOrderTodayDisplay(amOrderStatus, "AM") === "Yes"
                          ? styles.statusSuccess
                          : styles.statusError,
                      ]}
                    >
                      <Text>Today: {getHasOrderTodayDisplay(amOrderStatus, "AM")}</Text>
                    </View>
                    {/* REMOVED INDIVIDUAL PLACE AM ORDER BUTTON */}
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.orderSection}>
                    <Text style={styles.orderType}>PM Order</Text>
                    <Text style={styles.orderStatus}>{placementError[user.cust_id] || getOrderStatusDisplay(pmOrderStatus)}</Text>
                    <View
                      style={[
                        styles.todayStatus,
                        getHasOrderTodayDisplay(pmOrderStatus, "PM") === "Yes"
                          ? styles.statusSuccess
                          : styles.statusError,
                      ]}
                    >
                      <Text>Today: {getHasOrderTodayDisplay(pmOrderStatus, "PM")}</Text>
                    </View>
                    {/* REMOVED INDIVIDUAL PLACE PM ORDER BUTTON */}
                  </View>
                </View>
              </View>
            )
          })}

          {assignedUsers.length === 0 && !error && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No users assigned to you.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  actionsContainer: {
    marginBottom: 16,
  },
  selectAllContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  selectAllText: {
    marginLeft: 8,
  },
  bulkActionsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  bulkActionButton: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  customerId: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  orderInfo: {
    gap: 16,
  },
  orderSection: {
    gap: 8,
  },
  orderType: {
    fontSize: 15,
    fontWeight: "500",
  },
  orderStatus: {
    fontSize: 14,
    color: "#666",
  },
  todayStatus: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  statusSuccess: {
    backgroundColor: "#dcfce7",
  },
  statusError: {
    backgroundColor: "#fee2e2",
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 8,
  },
  errorContainer: {
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  errorText: {
    color: "#dc2626",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#666",
  },
  emptyContainer: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyText: {
    color: "#666",
  },
})

export default PlaceOrderAdmin