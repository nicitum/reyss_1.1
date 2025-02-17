import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import OrdersTab from './OrdersTab';
import UsersTab from './UsersTab';
import PaymentsTab from './PaymentsTab';
import ProductsTab from './ProductsTab';

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<OrdersTab />} />
          <Route path="/users" element={<UsersTab />} />
          <Route path="/payments" element={<PaymentsTab />} />
          <Route path="/products" element={<ProductsTab />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}