import React from "react";
import { NavLink } from "react-router-dom";
import { Package, Users, CreditCard, ShoppingBag } from "lucide-react";
import LogoutButton from "./LogoutTab";

const Sidebar = () => {
  const menuItems = [
    { path: "/dashboard", icon: <Package />, label: "Orders" },
    { path: "/dashboard/users", icon: <Users />, label: "Users" },
    { path: "/dashboard/payments", icon: <CreditCard />, label: "Payments" },
    { path: "/dashboard/products", icon: <ShoppingBag />, label: "Products" },
  ];

  return (
    <div className="h-screen w-64 bg-gray-800 text-white">
      <div className="p-4">
        <h2 className="text-2xl font-bold">SLN Enterprises</h2>
      </div>
      <nav className="mt-8">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors ${
                isActive ? "bg-gray-700 text-white" : ""
              }`
            }
          >
            <span className="mr-3">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Add the Logout button at the bottom */}
      <LogoutButton />
    </div>
  );
};

export default Sidebar;
