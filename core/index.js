const express = require("express");
const cors = require("cors");
const userRouter = require("./routes/user");
const orderRouter = require("./routes/order");
const transactionsRouter = require("./routes/transaction");
const adminRouter = require("./routes/admin");
const generalRouter = require("./routes/generalRoutes");

const adminAssignRoutes = require("./routes/adminassign"); // Import the new rout

const app = express();
app.use(express.json());

app.use(cors());

app.get("/", (req, res) => {
  res.send("Homepage");
});

app.use("/", userRouter);
app.use("/", orderRouter);
app.use("/", transactionsRouter);
app.use("/", adminRouter);
app.use("/", generalRouter);
app.use("/",adminAssignRoutes);

app.get("/s", (req, res) => {
  res.send("Secured page.");
});

const PORT = process.env.PORT || 8090;
app.listen(PORT, async () => {
  try {
    console.log("Connected to database");
  } catch (err) {
    console.log(err.message);
  }
  console.log(`Server is running on http://localhost:${PORT}`);
});
