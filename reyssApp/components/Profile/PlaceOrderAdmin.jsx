import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

import { ipAddress } from '../../urls';

const PlaceOrderAdmin = () => {
    const [assignedUsers, setAssignedUsers] = useState([]);
    const [error, setError] = useState(null);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userAuthToken, setUserAuthToken] = useState(null);
    const [currentAdminId, setCurrentAdminId] = useState(null);
    const [loadingToken, setLoadingToken] = useState(true);
    const [orderStatuses, setOrderStatuses] = useState({});
    const [placingOrder, setPlacingOrder] = useState({});
    const [placementError, setPlacementError] = useState({});
    const [recentOrderIds, setRecentOrderIds] = useState({}); // State to store recent order IDs

    const fetchAssignedUsers = async () => {
        setLoadingUsers(true);
        setError(null);
        try {
            const response = await fetch(`http://${ipAddress}:8090/assigned-users/${currentAdminId}`, {
                headers: {
                    "Authorization": `Bearer ${userAuthToken}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const message = `Failed to fetch assigned users. Status: ${response.status}`;
                throw new Error(message);
            }

            const responseData = await response.json();
            console.log("Assigned Users Response:", responseData);

            if (responseData.success) {
                setAssignedUsers(responseData.assignedUsers);
                responseData.assignedUsers.forEach(user => {
                    fetchOrderStatuses(user.cust_id);
                });
            } else {
                setError(responseData.message || "Failed to fetch assigned users.");
            }
        } catch (err) {
            console.error("Error fetching assigned users:", err);
            setError("Error fetching assigned users. Please try again.");
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchMostRecentOrder = async (customerId, orderType) => {
        try {
            let apiUrl = `http://${ipAddress}:8090/most-recent-order?customerId=${customerId}`;
            if (orderType && (orderType === 'AM' || orderType === 'PM')) {
                apiUrl += `&orderType=${orderType}`;
            }

            const response = await fetch(apiUrl, {
                headers: {
                    "Authorization": `Bearer ${userAuthToken}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                // Do not throw error if no order is found, just return null
                if (response.status === 400 && response.url.includes('/most-recent-order')) {
                    console.warn(`No recent ${orderType || 'any'} order found for customer ${customerId}. Status: ${response.status}`);
                    return null; // Return null, not throw error
                }
                const message = `Failed to fetch recent ${orderType || 'any'} order for customer ${customerId}. Status: ${response.status}`;
                throw new Error(message);
            }
            const responseData = await response.json();
            return responseData.order;
        } catch (error) {
            console.error(`Error fetching most recent ${orderType || 'any'} order for customer ${customerId}:`, error);
            return null; // Return null in case of error as well, to prevent further issues
        }
    };

    const fetchOrderStatuses = async (customerId) => {
        try {
            const amOrder = await fetchMostRecentOrder(customerId, 'AM');
            const pmOrder = await fetchMostRecentOrder(customerId, 'PM');
            // Fetch most recent order for reference ID, now without any orderType to get 'any' recent order
            const recentAnyOrder = await fetchMostRecentOrder(customerId);

            setOrderStatuses(prevStatuses => ({
                ...prevStatuses,
                [customerId]: { am: amOrder, pm: pmOrder },
            }));
            setRecentOrderIds(prevOrderIds => ({ // Store recent order ID
                ...prevOrderIds,
                [customerId]: recentAnyOrder ? recentAnyOrder.id : null,
            }));


        } catch (err) {
            console.error(`Error fetching order status for customer ${customerId}:`, err);
        }
    };

    const placeAdminOrder = async (customerId, orderType) => {
        setPlacingOrder(prevState => ({ ...prevState, [customerId]: true }));
        setPlacementError(prevState => ({ ...prevState, [customerId]: null }));
    
        try {
            // First fetch the most recent order of the specific type (AM or PM)
            const recentTypeOrder = await fetchMostRecentOrder(customerId, orderType);
            const referenceOrderId = recentTypeOrder ? recentTypeOrder.id : recentOrderIds[customerId];
    
            if (!referenceOrderId) {
                setPlacementError(prevState => ({ 
                    ...prevState, 
                    [customerId]: `Could not find a recent order to reference for customer ${customerId}.` 
                }));
                setPlacingOrder(prevState => ({ ...prevState, [customerId]: false }));
                return;
            }
    
            const response = await fetch(`http://${ipAddress}:8090/on-behalf`, 
                {
                    method: 'POST',
                    headers: {
                        "Authorization": `Bearer ${userAuthToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        customer_id: customerId,
                        order_type: orderType,
                        reference_order_id: referenceOrderId,
                    }),
                });
    
            if (!response.ok) {
                throw new Error(`Failed to place ${orderType} order. Status: ${response.status}`);
            }
    
            const responseData = await response.json();
            console.log(`Place ${orderType} Order Response:`, responseData);
            fetchOrderStatuses(customerId);
    
        } catch (err) {
            console.error(`Error placing ${orderType} order:`, err);
            setPlacementError(prevState => ({ 
                ...prevState, 
                [customerId]: `Error placing ${orderType} order. Please try again.` 
            }));
        } finally {
            setPlacingOrder(prevState => ({ ...prevState, [customerId]: false }));
        }
    };
    


    useEffect(() => {
        const loadAdminData = async () => {
            setLoadingToken(true);
            setError(null);

            try {
                const storedToken = await AsyncStorage.getItem("userAuthToken");
                if (!storedToken) {
                    setError("User authentication token not found.");
                    setLoadingToken(false);
                    return;
                }

                const decodedToken = jwtDecode(storedToken);
                const adminId = decodedToken.id1;

                setUserAuthToken(storedToken);
                setCurrentAdminId(adminId);

            } catch (tokenError) {
                console.error("Error fetching or decoding token:", tokenError);
                setError("Failed to authenticate admin. Please try again.");
            } finally {
                setLoadingToken(false);
            }
        };

        loadAdminData();
    }, []);

    useEffect(() => {
        if (currentAdminId && userAuthToken) {
            fetchAssignedUsers();
        }
    }, [currentAdminId, userAuthToken]);

    const getOrderStatusDisplay = (order) => {
        if (order) {
            const placedDate = new Date(order.placed_on * 1000).toLocaleDateString();
            return `Placed on: ${placedDate}`;
        } else {
            return "No Order Placed";
        }
    };

    const getHasOrderTodayDisplay = (order, orderType) => {
        const today = new Date();
        const isSameDay = (date1, date2) => {
            return date1.getDate() === date2.getDate() &&
                date1.getMonth() === date2.getMonth() &&
                date1.getFullYear() === date2.getFullYear();
        };

        if (order && orderType === 'AM' && isSameDay(new Date(order.placed_on * 1000), today)) {
            return "Yes";
        }
        if (order && orderType === 'PM' && isSameDay(new Date(order.placed_on * 1000), today)) {
            return "Yes";
        }
        return "No";
    };


    return (
        <div style={{
            padding: '24px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            backgroundColor: '#ffffff',
            minHeight: '100vh'
        }}>
            <h2 style={{
                color: '#2c3e50',
                fontSize: '24px',
                fontWeight: '600',
                marginBottom: '24px',
                borderBottom: '2px solid #eee',
                paddingBottom: '12px'
            }}>Order Management Dashboard</h2>

            {error && (
                <div style={{
                    padding: '12px',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '4px',
                    color: '#dc2626',
                    marginBottom: '20px'
                }}>{error}</div>
            )}

            {(loadingToken || loadingUsers) && (
                <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#6b7280'
                }}>Loading...</div>
            )}

            {(!loadingUsers && !loadingToken) && (
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                    width: '100%'
                }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse'
                        }}>
                            <thead>
                                <tr style={{
                                    backgroundColor: '#f8fafc',
                                    borderBottom: '2px solid #e2e8f0'
                                }}>
                                    <th style={{ padding: '16px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Customer ID</th>
                                    <th style={{ padding: '16px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>AM Order Status</th>
                                    <th style={{ padding: '16px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>PM Order Status</th>
                                    <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>AM Today</th>
                                    <th style={{ padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>PM Today</th>
                                    <th style={{ padding: '16px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignedUsers.map(user => {
                                    const statuses = orderStatuses[user.cust_id] || {};
                                    const amOrderStatus = statuses.am;
                                    const pmOrderStatus = statuses.pm;

                                    return (
                                        <tr key={user.cust_id} style={{
                                            borderBottom: '1px solid #e2e8f0',
                                            '&:hover': { backgroundColor: '#f8fafc' }
                                        }}>
                                            <td style={{ padding: '16px', color: '#1e293b' }}>{user.cust_id}</td>
                                            <td style={{ padding: '16px', color: '#64748b' }}>{getOrderStatusDisplay(amOrderStatus)}</td>
                                            <td style={{ padding: '16px', color: '#64748b' }}>{getOrderStatusDisplay(pmOrderStatus)}</td>
                                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: getHasOrderTodayDisplay(amOrderStatus, 'AM') === 'Yes' ? '#dcfce7' : '#fee2e2',
                                                    color: getHasOrderTodayDisplay(amOrderStatus, 'AM') === 'Yes' ? '#166534' : '#dc2626'
                                                }}>
                                                    {getHasOrderTodayDisplay(amOrderStatus, 'AM')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: getHasOrderTodayDisplay(pmOrderStatus, 'PM') === 'Yes' ? '#dcfce7' : '#fee2e2',
                                                    color: getHasOrderTodayDisplay(pmOrderStatus, 'PM') === 'Yes' ? '#166534' : '#dc2626'
                                                }}>
                                                    {getHasOrderTodayDisplay(pmOrderStatus, 'PM')}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                {getHasOrderTodayDisplay(amOrderStatus, 'AM') === 'No' ? (
                                                    <button
                                                        onClick={() => placeAdminOrder(user.cust_id, 'AM')}
                                                        disabled={placingOrder[user.cust_id]}
                                                        style={{
                                                            padding: '8px 12px',
                                                            backgroundColor: '#4CAF50',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            opacity: placingOrder[user.cust_id] ? 0.7 : 1
                                                        }}
                                                    >
                                                        {placingOrder[user.cust_id] ? 'Placing AM...' : 'Place AM Order'}
                                                    </button>
                                                ) : (
                                                    <span>AM Order Placed</span>
                                                )}
                                                {getHasOrderTodayDisplay(pmOrderStatus, 'PM') === 'No' ? (
                                                    <button
                                                        onClick={() => placeAdminOrder(user.cust_id, 'PM')}
                                                        disabled={placingOrder[user.cust_id]}
                                                        style={{
                                                            padding: '8px 12px',
                                                            backgroundColor: '#4CAF50',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            opacity: placingOrder[user.cust_id] ? 0.7 : 1,
                                                            marginLeft: '8px'
                                                        }}
                                                    >
                                                        {placingOrder[user.cust_id] ? 'Placing PM...' : 'Place PM Order'}
                                                    </button>
                                                ) : (
                                                    <span>PM Order Placed</span>
                                                )}
                                                {placementError[user.cust_id] && (
                                                    <div style={{ color: 'red', marginTop: '5px', fontSize: '0.9em' }}>
                                                        {placementError[user.cust_id]}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {(!loadingUsers && !loadingToken) && assignedUsers.length === 0 && !error && (
                <div style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#6b7280',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                }}>
                    No users assigned to you.
                </div>
            )}
        </div>
    );
};

export default PlaceOrderAdmin;