const express = require("express");
const router = express.Router();
const { executeQuery } = require("../dbUtils/db");

router.post("/save-assignment", async (req, res) => {
  const { customerId, routes } = req.body;  // Receive customerId and routes from request body
  console.log("Received customerId:", customerId);
  console.log("Received routes:", routes);

  if (!customerId || !routes || routes.length === 0) {
    return res.status(400).json({ success: false, message: "Customer ID or routes missing." });
  }

  try {
    // Step 1: Check if customerId exists in the users table
    const userCheckQuery = "SELECT * FROM users WHERE customer_id = ?";
    const user = await executeQuery(userCheckQuery, [customerId]);

    if (user.length === 0) {
      return res.status(400).json({ success: false, message: "Customer ID does not exist in users table." });
    }

    const adminId = user[0].id;  // Getting the admin ID
    const custId = user[0].customer_id;  // Get customer_id from the users table to populate cust_id in admin_assign

    // Step 2: Insert new routes for the admin
    const insertPromises = routes.map((route) => {
      const query = "INSERT INTO admin_assign (admin_id, customer_id, cust_id, route, assigned_date, status) VALUES (?, ?, ?, ?, NOW(), 'assigned')";
      return executeQuery(query, [adminId, customerId, custId, route]);  // Populate cust_id here
    });

    await Promise.all(insertPromises);

    res.status(200).json({
      success: true,
      message: "Routes and cust_id updated successfully!",
      newlyAssignedRoutes: routes,
    });
  } catch (error) {
    console.error("Error saving routes:", error);
    res.status(500).json({ success: false, message: "Error saving routes." });
  }
});



router.post("/get-all-assigned-routes", async (req, res) => {
  console.log("Fetching all assigned routes...");

  try {
    // Fetch both route, admin_id, and corresponding user details from users table
    const query = `
      SELECT aa.route, aa.admin_id, u.username, u.customer_id
      FROM admin_assign aa
      JOIN users u ON aa.admin_id = u.id
    `;
    const assignedRoutes = await executeQuery(query);

    // Map the result to include route, admin_id, username, and customer_id
    const routesWithAdminDetails = assignedRoutes.map((routeData) => ({
      route: routeData.route,
      admin_id: routeData.admin_id,
      username: routeData.username,    // Admin's name
      customer_id: routeData.customer_id,  // Admin's customer ID
    }));

    res.status(200).json({
      success: true,
      assignedRoutes: routesWithAdminDetails,  // Send all necessary details
    });
  } catch (error) {
    console.error("Error fetching assigned routes:", error);
    res.status(500).json({ success: false, message: "Error fetching assigned routes." });
  }
});






// Fetch all unique routes from users table
router.get("/get-unique-routes", async (req, res) => {
  console.log("Fetching unique routes from users table...");

  try {
    // Query to select distinct routes from the users table
    const routesQuery = "SELECT DISTINCT route FROM users";
    const routes = await executeQuery(routesQuery);

    if (routes.length === 0) {
      return res.status(404).json({ success: false, message: "No routes found." });
    }

    // Extracting route names into an array
    const uniqueRoutes = routes.map(row => row.route);

    // Sending response
    res.status(200).json({ success: true, routes: uniqueRoutes });
  } catch (error) {
    console.error("Error fetching unique routes:", error);
    res.status(500).json({ success: false, message: "Error fetching unique routes." });
  }
});



router.post("/assign-users-to-admin", async (req, res) => {
  const { adminId, users } = req.body;  // Receive adminId and users array from the request body
  console.log("Assigning users to admin:", adminId);
  console.log("Users to assign:", users);

  if (!adminId || !users || users.length === 0) {
    return res.status(400).json({ success: false, message: "Admin ID or users missing." });
  }

  try {
    // Step 1: Check if admin exists
    const adminCheckQuery = "SELECT * FROM users WHERE id = ?";
    const admin = await executeQuery(adminCheckQuery, [adminId]);

    if (admin.length === 0) {
      return res.status(400).json({ success: false, message: "Admin ID does not exist." });
    }

    // Step 2: Insert records into admin_assign table for each user
    const assignmentPromises = users.map(async (userId) => {
      // Fetch the customer_id for the user from the users table
      const userCheckQuery = "SELECT customer_id FROM users WHERE id = ?";
      const user = await executeQuery(userCheckQuery, [userId]);

      if (user.length === 0) {
        return res.status(400).json({ success: false, message: `User ID ${userId} does not exist.` });
      }

      const custId = user[0].customer_id;  // Extract the customer_id for the user

      const insertQuery = `
        INSERT INTO admin_assign (admin_id, customer_id, cust_id, assigned_date, status)
        VALUES (?, ?, ?, NOW(), 'assigned')
      `;
      return executeQuery(insertQuery, [adminId, userId, custId]);  // Insert adminId, userId, and custId into the table
    });

    await Promise.all(assignmentPromises);

    res.status(200).json({
      success: true,
      message: "Users successfully assigned to the admin.",
      assignedUsers: users,
    });
  } catch (error) {
    console.error("Error assigning users:", error);
    res.status(500).json({ success: false, message: "Error assigning users to admin." });
  }
});





// display helper api for only admins users .
// Endpoint to fetch users assigned to a specific admin
router.get("/assigned-users/:adminId", async (req, res) => {
  const { adminId } = req.params; // Get adminId from route parameter

  // Validate the adminId
  if (!adminId) {
    return res.status(400).json({ success: false, message: "Admin ID is required." });
  }

  try {
    // Fetch the users assigned to the given admin by joining the 'admin_assign' and 'users' tables
    
    const fetchQuery = `
    SELECT u.id, u.username, u.phone, u.customer_id AS cust_id, u.name, u.route, u.status
    FROM users u
    INNER JOIN admin_assign aa ON u.id = aa.customer_id
    WHERE aa.admin_id = ?
  `;
  
    // Execute the query
    const assignedUsers = await executeQuery(fetchQuery, [adminId]);

    // Return the assigned users
    if (assignedUsers.length > 0) {
      return res.status(200).json({
        success: true,
        assignedUsers,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "No users assigned to this admin.",
      });
    }
  } catch (error) {
    console.error("Error fetching assigned users:", error);
    return res.status(500).json({ success: false, message: "Error fetching assigned users." });
  }
});


module.exports = router;
