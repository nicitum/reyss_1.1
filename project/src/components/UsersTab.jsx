import React, { useState, useEffect } from "react";
import {
  getUsers,
  toggleUserBlock,
  updateUser,
  addUser,
} from "../services/api";
import toast from "react-hot-toast";
import SearchBar from "./UsersTab/SearchBar";
import UserTable from "./UsersTab/UserTable";
import EditUserModal from "./UsersTab/EditUserModal";

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({
    username: "",
    phone: "",
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    customer_id: "",
    phone: "",
    password: "",
    name: "",
  });

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const fetchUsers = async (search) => {
    try {
      const data = await getUsers(search);
      setUsers(data);
    } catch (error) {
      toast.error("Failed to fetch users");
    }
  };

  const handleToggleBlock = async (userId, currentStatus) => {
    try {
      // Toggle between 'Block' and 'Active'
      const newStatus = currentStatus === "Block" ? "Active" : "Block";

      // Call the toggleUserBlock function with the new status
      await toggleUserBlock(userId, newStatus);

      // Fetch users again to reflect the change
      fetchUsers(searchTerm);

      // Show a success message
      toast.success(
        `User ${newStatus === "Block" ? "Blocked" : "Activated"} successfully`
      );
    } catch (error) {
      // Show an error message if something goes wrong
      toast.error("Failed to update user status");
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditForm({
      username: user.username,
      phone: user.phone,
    });
  };

  const handleUpdateUser = async () => {
    try {
      await updateUser(selectedUser.customer_id, editForm);
      fetchUsers(searchTerm);
      setSelectedUser(null);
      toast.success("User updated successfully");
    } catch (error) {
      toast.error("Failed to update user");
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await addUser(newUser);
      fetchUsers(searchTerm);
      setShowAddModal(false);
      setNewUser({
        username: "",
        customer_id: "",
        phone: "",
        password: "",
        name: "",
      });
      toast.success("User added successfully");
    } catch (error) {
      toast.error("Failed to add user");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Add User
        </button>
      </div>

      <UserTable
        users={users}
        onToggleBlock={handleToggleBlock}
        onEditUser={handleEditUser}
      />

      {selectedUser && (
        <EditUserModal
          user={selectedUser}
          editForm={editForm}
          onEditFormChange={setEditForm}
          onClose={() => setSelectedUser(null)}
          onSave={handleUpdateUser}
        />
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-medium mb-4">Add New User</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({
                      ...newUser,
                      username: e.target.value,
                      password: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Customer ID
                </label>
                <input
                  type="text"
                  required
                  value={newUser.customer_id}
                  onChange={(e) =>
                    setNewUser({ ...newUser, customer_id: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="text"
                  required
                  value={newUser.phone}
                  onChange={(e) =>
                    setNewUser({ ...newUser, phone: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
