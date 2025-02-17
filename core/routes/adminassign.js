const express = require("express");
const router = express.Router();
const { executeQuery } = require("../dbUtils/db");

router.post("/save-assignment", async (req, res) => {
  const { customerId, routes } = req.body;
  console.log("Received customerId:", customerId);
  console.log("Received routes:", routes);

  if (!customerId || !routes) {
    return res.status(400).json({ success: false, message: "Customer ID or routes missing." });
  }

  try {
    // Step 1: Check if customerId exists in the users table
    const userCheckQuery = "SELECT * FROM users WHERE customer_id = ?";
    const user = await executeQuery(userCheckQuery, [customerId]);

    if (user.length === 0) {
      return res.status(400).json({ success: false, message: "Customer ID does not exist in users table." });
    }

    // Step 2: Get the id of the customer from the users table (assuming `id` is the primary key in users)
    const adminId = user[0].id;  // Assuming `id` in `users` table is what you need for `admin_id` in `admin_assign`

    // Step 3: Proceed with saving the routes if customerId is valid
    const insertPromises = routes.map((route) => {
      const query = "INSERT INTO admin_assign (admin_id, route) VALUES (?, ?)";
      return executeQuery(query, [adminId, route]);
    });

    // Wait for all insert queries to complete
    await Promise.all(insertPromises);

    // Send success response
    res.status(200).json({ success: true, message: "Routes updated successfully!" });
  } catch (error) {
    console.error("Error saving routes:", error);
    res.status(500).json({ success: false, message: "Error saving routes." });
  }
});

module.exports = router;
