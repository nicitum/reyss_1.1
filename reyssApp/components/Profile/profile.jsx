import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, UIManager } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import LogOutButton from "../LogoutButton";
import { useNavigation } from "@react-navigation/native";
import PasswordChangeButton from "../PasswordChangeButton";
import ProfileModal from "./ProfileModal";
import ProfileContent from "./ProfileContent";
import PayHereContent from "./PayHereContent";
import PaymentsHistoryContent from "./PaymentsHistoryContent";
import { jwtDecode } from "jwt-decode";
import AsyncStorage from "@react-native-async-storage/async-storage";

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const ProfilePage = ({ setIsLoggedIn }) => {
    const navigation = useNavigation();
    const [userRole, setUserRole] = useState(null);
    const [modalData, setModalData] = useState({
        visible: false,
        title: "",
        content: null,
    });

    useEffect(() => {
        const getUserRole = async () => {
            try {
                const token = await AsyncStorage.getItem("userAuthToken");
                if (token) {
                    const decoded = jwtDecode(token);
                    setUserRole(decoded.role);
                }
            } catch (error) {
                console.error("Error decoding token:", error);
            }
        };
        getUserRole();
    }, []);

    const openModal = (ContentComponent) => {
        setModalData({
            visible: true,
            content: <ContentComponent />,
        });
    };

    const closeModal = () => {
        setModalData({ ...modalData, visible: false });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Account Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>
                {/* Profile - Available to all roles */}
                <TouchableOpacity style={styles.menuItem} onPress={() => openModal(ProfileContent)}>
                    <View style={styles.menuIconText}>
                        <MaterialIcons name="person-outline" size={24} color="#ffcc00" />
                        <Text style={styles.menuText}>Profile</Text>
                    </View>
                    <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                </TouchableOpacity>

                {/* Orders Options for Admin */}
                {userRole === "admin" && (
                    <>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("UpdateOrders")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="format-list-numbered" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Update Orders</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>
                       
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("PlaceOrderAdmin")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="format-list-numbered" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Auto Order</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("CollectCash")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="format-list-numbered" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Collect Cash</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>
                       
                    </>
                )}

                {/* Orders Options for User */}
                {userRole === "user" && (
                    <>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("Orders")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="format-list-numbered" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Order History</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("DeliveryStatusUpdate")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="format-list-numbered" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Delivery Status Update</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("PaymentHistory")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="format-list-numbered" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Payment History</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>
                    </>
                )}

                {/* Reports Options for Superadmin */}
                {userRole === "superadmin" && (
                    <>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("UpdateOrdersSA")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="insert-chart" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Update/Edit Orders</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>


                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("OrderAcceptance")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="insert-chart" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Order Acceptance Page</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>


                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("LoadingSlipSA")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="insert-chart" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Loading Slip Page</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>


                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("InvoiceSA")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="insert-chart" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Invoice Page</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("CreditLimit")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="insert-chart" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Credit Limit</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("Remarks")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="insert-chart" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Remarks</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>


                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("CollectCashSA")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="insert-chart" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Cash Collection</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("CashCollectedReport")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="insert-chart" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Cash Collected</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("AmountDueReport")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="insert-chart" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Outstanding Report</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("AutoOrderPage")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="insert-chart" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Auto Order</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("ItemsReport")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="insert-chart" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Items Report</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => navigation.navigate("AutoOrderUpdate")}
                        >
                            <View style={styles.menuIconText}>
                                <MaterialIcons name="insert-chart" size={24} color="#ffcc00" />
                                <Text style={styles.menuText}>Auto Order Update</Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                        </TouchableOpacity>
                    </>
                )}

                {/* Privacy Policy and Terms & Conditions at the end - Available to all roles */}
                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuIconText}>
                        <MaterialIcons name="security" size={24} color="#ffcc00" />
                        <Text style={styles.menuText}>Privacy Policy</Text>
                    </View>
                    <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuIconText}>
                        <MaterialIcons name="info-outline" size={24} color="#ffcc00" />
                        <Text style={styles.menuText}>Terms & Conditions</Text>
                    </View>
                    <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                </TouchableOpacity>
            </ScrollView>

            <ProfileModal visible={modalData.visible} onClose={closeModal} content={modalData.content} />

            <View style={styles.logoutSection}>
                <View style={styles.buttonContainer}>
                    <PasswordChangeButton style={styles.actionButton} />
                </View>
                <View style={styles.buttonContainer}>
                    <LogOutButton navigation={navigation} style={styles.actionButton} />
                </View>
            </View>

            
            
            <Text style={styles.creditText}>
                Copyright © REYSS SL Enterprisess
            </Text>

            <Text style={styles.creditText}>
                Designed & Developed by Nicitum Technologies
            </Text>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f0f0f0",
    },

    creditText: {
        textAlign: 'center',
        fontSize: 14,
        color: '#000',
        paddingBottom: 10,
        fontStyle: 'italic',
        fontWeight: 'bold' // Added fontWeight bold
    },
    header: {
        backgroundColor: "#ffcc00",
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 15,
        marginBottom: 10,
    },
    headerText: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#fff",
    },
    scrollContainer: {
        paddingHorizontal: 10,
        paddingBottom: 20,
    },
    menuItem: {
        backgroundColor: "#fff",
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginBottom: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    menuIconText: {
        flexDirection: "row",
        alignItems: "center",
    },
    menuText: {
        fontSize: 18,
        marginLeft: 15,
        color: "#333",
    },
    logoutSection: {
        padding: 20,
        paddingBottom: 30,
        backgroundColor: '#f0f0f0',
        width: '100%',
    },
    buttonContainer: {
        marginVertical: 8,
        minHeight: 45,
        width: '100%',
    },
    actionButton: {
        width: '100%',
        minHeight: 45,
        marginVertical: 5,
    },
});

export default ProfilePage;