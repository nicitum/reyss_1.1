import React from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LogOut } from "lucide-react"; // import logout icon from lucide-react

const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear the localStorage
    localStorage.removeItem("token");

    // Show a toast notification
    toast.success("Logged out successfully!");

    // Redirect to the login page
    navigate("/login");
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors w-full mt-8"
    >
      <LogOut className="mr-3" />
      Logout
    </button>
  );
};

export default LogoutButton;
