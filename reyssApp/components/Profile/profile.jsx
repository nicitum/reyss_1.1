import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import LogOutButton from "../LogoutButton"; // Import the LogOutButton
import { useNavigation } from "@react-navigation/native";
import PasswordChangeButton from "../PasswordChangeButton";
import ProfileModal from "./ProfileModal";
import ProfileContent from "./ProfileContent";
import PayHereContent from "./PayHereContent";
import PaymentsHistoryContent from "./PaymentsHistoryContent";

import DeliveryStatusUpdate from "./DeliveryStatusUpdate";

const ProfilePage = ({ setIsLoggedIn }) => {  // Access setIsLoggedIn here
  const navigation = useNavigation();

  const [modalData, setModalData] = useState({
    visible: false,
    title: "",
    content: null,
  });

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
        <Text style={styles.headerText}>Account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Profile */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => openModal(ProfileContent)}
        >
          <View style={styles.menuIconText}>
            <MaterialIcons name="person-outline" size={24} color="#ffcc00" />
            <Text style={styles.menuText}>Profile</Text>
          </View>
          <MaterialIcons name="keyboard-arrow-down" size={24} color="#ffcc00" />
        </TouchableOpacity>

        {/* Orders */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("Orders")} // Navigate to Orders screen
        >
          <View style={styles.menuIconText}>
            <MaterialIcons
              name="format-list-numbered"
              size={24}
              color="#ffcc00"
            />
            <Text style={styles.menuText}>Orders</Text>
          </View>
          <MaterialIcons name="keyboard-arrow-down" size={24} color="#ffcc00" />
        </TouchableOpacity>

        {/* Pay Here */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => openModal(PayHereContent)}
        >
          <View style={styles.menuIconText}>
            <MaterialIcons name="payment" size={24} color="#ffcc00" />
            <Text style={styles.menuText}>Pay here</Text>
          </View>
          <MaterialIcons name="keyboard-arrow-down" size={24} color="#ffcc00" />
        </TouchableOpacity>

        {/* Payments History */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => openModal(PaymentsHistoryContent)}
        >
          <View style={styles.menuIconText}>
            <MaterialIcons name="history" size={24} color="#ffcc00" />
            <Text style={styles.menuText}>Payments History</Text>
          </View>
          <MaterialIcons name="keyboard-arrow-down" size={24} color="#ffcc00" />
        </TouchableOpacity>

        {/* Monthly Report */}
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconText}>
            <MaterialIcons
              name="insert-chart-outlined"
              size={24}
              color="#ffcc00"
            />
            <Text style={styles.menuText}>Monthly Report</Text>
          </View>
          <MaterialIcons name="keyboard-arrow-down" size={24} color="#ffcc00" />
        </TouchableOpacity>

        {/* Privacy Policy */}
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconText}>
            <MaterialIcons name="security" size={24} color="#ffcc00" />
            <Text style={styles.menuText}>Privacy Policy</Text>
          </View>
          <MaterialIcons name="keyboard-arrow-down" size={24} color="#ffcc00" />
        </TouchableOpacity>

        {/* Terms & Conditions */}
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconText}>
            <MaterialIcons name="info-outline" size={24} color="#ffcc00" />
            <Text style={styles.menuText}>Terms & conditions</Text>
          </View>
          <MaterialIcons name="keyboard-arrow-down" size={24} color="#ffcc00" />
        </TouchableOpacity>

        
        <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => navigation.navigate("DeliveryStatusUpdate")}
        >
            <View style={styles.menuIconText}>
                <MaterialIcons name="info-outline" size={24} color="#ffcc00" />
                <Text style={styles.menuText}>Update Delivery Status</Text>
            </View>
            <MaterialIcons name="keyboard-arrow-down" size={24} color="#ffcc00" />
        </TouchableOpacity>
      </ScrollView>

      {/* Reusable Modal */}
      <ProfileModal
        visible={modalData.visible}
        onClose={closeModal}
        content={modalData.content}
      />

      <PasswordChangeButton />
      
      {/* LogOutButton with passed setIsLoggedIn */}
      <LogOutButton navigation={navigation} />
      {/* Footer */}
      <View style={styles.footer}>
        {/* add design and developed by details here*/}
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
    backgroundColor: "#ffcc00",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  scrollContainer: {
    padding: 10,
  },
  menuItem: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.16)",
  },
  menuIconText: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuText: {
    fontSize: 18,
    marginLeft: 10,
    color: "#333",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 5,
  },
  footerText: {
    fontSize: 10,
    color: "#999",
  },
});

export default ProfilePage;