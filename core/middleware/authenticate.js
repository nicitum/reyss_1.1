const jwt = require("jsonwebtoken");
require("dotenv").config();
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (token) {
    jwt.verify(token, 'smokeFirstMobileApp', (err, decoded) => {
      if (err) {
        res.status(401).json({ msg: "Invalid token, please login again" });
      } else {
        req.userID = decoded.id;
        req.userRole = decoded.role;
        next();
      }
    });
  } else {
    res.status(401).json({ msg: "Authorization token required" });
  }
};

const authorizeAdmin = (req, res, next) => {
  const { userRole } = req;

  if (userRole === "admin" || userRole === "super_admin") {
    next();
  } else {
    return res.status(403).json({ msg: "Access denied: Admins only" });
  }
};

module.exports = { authenticate, authorizeAdmin };
