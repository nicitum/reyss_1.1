import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, LayoutAnimation, Platform, UIManager } from "react-native";
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
    const [isOrdersSubMenuOpen, setIsOrdersSubMenuOpen] = useState(false);
    const [isReportsSubMenuOpen, setIsReportsSubMenuOpen] = useState(false); // New state for Reports submenu

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

    const toggleOrdersSubMenu = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsOrdersSubMenuOpen(!isOrdersSubMenuOpen);
        setIsReportsSubMenuOpen(false); // Close Reports submenu if Orders is opened
    };

    const toggleReportsSubMenu = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsReportsSubMenuOpen(!isReportsSubMenuOpen);
        setIsOrdersSubMenuOpen(false); // Close Orders submenu if Reports is opened
    };


    const navigateToAdminOrders = () => {
        toggleOrdersSubMenu();
    };

    const navigateToLoadingSlip = () => {
        toggleReportsSubMenu();
        navigation.navigate("LoadingSlip"); // Navigate to LoadingSlip screen
    };


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Account Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <TouchableOpacity style={styles.menuItem} onPress={() => openModal(ProfileContent)}>
                    <View style={styles.menuIconText}>
                        <MaterialIcons name="person-outline" size={24} color="#ffcc00" />
                        <Text style={styles.menuText}>Profile</Text>
                    </View>
                    <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={toggleOrdersSubMenu}
                >
                    <View style={styles.menuIconText}>
                        <MaterialIcons name="format-list-numbered" size={24} color="#ffcc00" />
                        <Text style={styles.menuText}>Orders</Text>
                    </View>
                    <MaterialIcons name={isOrdersSubMenuOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color="#ffcc00" />
                </TouchableOpacity>

                {isOrdersSubMenuOpen && (
                    <View style={styles.subMenu}>
                        {userRole === "admin" ? (
                            // Admin Submenu
                            <>
                                <TouchableOpacity
                                    style={styles.subMenuItem}
                                    onPress={() => { navigateToAdminOrders(); navigation.navigate("UpdateOrders"); }}
                                >
                                    <Text style={styles.subMenuText}>Update Orders</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.subMenuItem}
                                    onPress={() => { navigateToAdminOrders(); navigation.navigate("AdminOrderHistory"); }}
                                >
                                    <Text style={styles.subMenuText}>Admin Order History</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.subMenuItem}
                                    onPress={() => { navigateToAdminOrders(); navigation.navigate("DeliveryStatusUpdate"); }}
                                >
                                    <Text style={styles.subMenuText}>Manage Deliveries</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.subMenuItem}
                                    onPress={() => { navigateToAdminOrders(); navigation.navigate("PlaceOrderAdmin"); }}
                                >
                                    <Text style={styles.subMenuText}>On Behalf</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            // User Submenu
                            <>
                                <TouchableOpacity
                                    style={styles.subMenuItem}
                                    onPress={() => { toggleOrdersSubMenu(); navigation.navigate("Orders"); }} // Navigate to Order History (current "Orders" screen)
                                >
                                    <Text style={styles.subMenuText}>Order History</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.subMenuItem}
                                    onPress={() => { toggleOrdersSubMenu(); navigation.navigate("UpdateOrdersU"); }}
                                >
                                    <Text style={styles.subMenuText}>Edit Orders</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.subMenuItem}
                                    onPress={() => { toggleOrdersSubMenu(); navigation.navigate("DeliveryStatusUpdate"); }}
                                >
                                    <Text style={styles.subMenuText}>Delivery Status Update</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}

                {userRole === "admin" && ( // Conditionally render "Reports" menu for admin only
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={toggleReportsSubMenu}
                    >
                        <View style={styles.menuIconText}>
                            <MaterialIcons name="insert-chart" size={24} color="#ffcc00" />
                            <Text style={styles.menuText}>Reports</Text>
                        </View>
                        <MaterialIcons name={isReportsSubMenuOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={24} color="#ffcc00" />
                    </TouchableOpacity>
                )}

                {isReportsSubMenuOpen && userRole === "admin" && ( // Conditionally render Reports submenu for admin only
                    <View style={styles.subMenu}>
                        <TouchableOpacity
                            style={styles.subMenuItem}
                            onPress={navigateToLoadingSlip}
                        >
                            <Text style={styles.subMenuText}>Loading Slip</Text>
                        </TouchableOpacity>
                    </View>
                )}


                <TouchableOpacity style={styles.menuItem} onPress={() => openModal(PayHereContent)}>
                    <View style={styles.menuIconText}>
                        <MaterialIcons name="payment" size={24} color="#ffcc00" />
                        <Text style={styles.menuText}>Pay Here</Text>
                    </View>
                    <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => openModal(PaymentsHistoryContent)}>
                    <View style={styles.menuIconText}>
                        <MaterialIcons name="history" size={24} color="#ffcc00" />
                        <Text style={styles.menuText}>Payment History</Text>
                    </View>
                    <MaterialIcons name="keyboard-arrow-right" size={24} color="#ffcc00" />
                </TouchableOpacity>

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


        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f0f0f0",
    },
    header: {
        backgroundColor: "#ffcc00", // Yellow Header
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
    subMenu: {
        backgroundColor: "#fff",
        borderRadius: 8,
        marginTop: 0,
        marginBottom: 8,
        marginLeft: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 2,
        overflow: 'hidden',
    },
    subMenuItem: {
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#e0e0e0',
    },
    subMenuText: {
        fontSize: 16,
        color: "#555",
    },
   // Replace the related styles in your StyleSheet:
        logoutSection: {
            padding: 20,
            paddingBottom: 30,
            backgroundColor: '#f0f0f0',
            width: '100%',
        },
        buttonContainer: {
            marginVertical: 8,
            minHeight: 45, // Ensure minimum height for buttons
            width: '100%',
        },
        actionButton: {
            width: '100%',
            minHeight: 45,
            marginVertical: 5,
        },

    logoutButtonWrapper: {
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    passwordChangeButtonWrapper: {
        marginBottom: 10,
        paddingHorizontal: 10,
    },
});

export default ProfilePage;