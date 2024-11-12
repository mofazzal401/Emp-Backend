const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
// const Salary = require('./Salary_Models');
const PondEntry = require("./pondEntries");
const Employee = require("./Emp_Model");
const multer = require("multer");
const path = require("path");
const xlsx = require("xlsx");
const dotenv = require("dotenv");
const app = express();

// Increase JSON payload limit
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

dotenv.config();
app.use(cors());
app.use(express.json());

// app.use(fileUpload());

// Serve static files from the uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Serve uploaded files

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// MongoDB connection
mongoose
  .connect(process.env.REACT_APP_MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.log("Error connecting to MongoDB:", err));

// --------------------- SERVER START ---------------------\\

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ---------------API endpoints

app.post(
  "/employees",
  upload.fields([
    { name: "photo" },
    { name: "nidPhoto" },
    { name: "certificateCopy" },
  ]),
  async (req, res) => {
    try {
      const employeeData = req.body;
      // Handle file paths
      if (req.files.photo) employeeData.photo = req.files.photo[0].path; // Save only the filename
      if (req.files.nidPhoto)
        employeeData.nidPhoto = req.files.nidPhoto[0].path;
      if (req.files.certificateCopy)
        employeeData.certificateCopy = req.files.certificateCopy[0].path;

      const employee = new Employee(employeeData);
      await employee.save();
      res.status(201).send("Employee saved successfully");
    } catch (error) {
      res.status(400).send("Error saving employee: " + error.message);
    }
  }
);

//////Excel Upload POST endpoint to upload employee data
app.post("/employees/upload", async (req, res) => {
  try {
    const employees = req.body;

    // Check if the data is an array
    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({
        message: "Invalid data format. Expected an array of employees.",
      });
    }

    // Validate each employee object before inserting
    for (const employee of employees) {
      // Add more specific checks as necessary
      if (
        !employee.fullName ||
        !employee.dateOfBirth ||
        !employee.contactNumber
      ) {
        return res
          .status(400)
          .json({ message: "Missing required fields in employee data." });
      }
    }

    await Employee.insertMany(employees);
    res.status(201).json({ message: "Employees uploaded successfully!" });
  } catch (error) {
    console.error("Error uploading employees:", error);
    res.status(500).json({ message: "Failed to upload data." });
  }
});

// GET: Retrieve all employees
app.get("/employees", async (req, res) => {
  try {
    const employees = await Employee.find(); // Assuming Employee is your model
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: "Error fetching employees", error });
  }
});

// GET: Retrieve a single employee by ID
app.get("/employees/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json(employee);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error retrieving employee", error: error.message });
  }
});

app.put(
  "/employees/:id",
  upload.fields([
    { name: "photo" },
    { name: "nidPhoto" },
    { name: "certificateCopy" },
  ]),
  async (req, res) => {
    const { id } = req.params;

    // Check if the provided ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid Employee ID" });
    }

    try {
      const employeeData = req.body;

      // Log req.files to check if files are uploaded
      console.log("Uploaded files:", req.files);

      // Update file paths only if files are uploaded
      if (req.files && req.files.photo) {
        employeeData.photo = req.files.photo[0].path;
      }
      if (req.files && req.files.nidPhoto) {
        employeeData.nidPhoto = req.files.nidPhoto[0].path;
      }
      if (req.files && req.files.certificateCopy) {
        employeeData.certificateCopy = req.files.certificateCopy[0].path;
      }

      // Find the employee by ID and update
      const updatedEmployee = await Employee.findByIdAndUpdate(
        id,
        employeeData,
        { new: true }
      );

      // If employee is not found, send a 404 response
      if (!updatedEmployee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      // Return the updated employee
      res.json(updatedEmployee);
    } catch (error) {
      console.error("Error updating employee data:", error); // Log the error for debugging
      res
        .status(500)
        .json({ error: `Error updating employee data: ${error.message}` });
    }
  }
);

// DELETE: Remove an employee by ID
app.delete("/employees/:id", async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error deleting employee", error: error.message });
  }
});

///--------------------Salary Routes------------------------\\\\
// Define Mongoose Schema for salary entries
const salarySchema = new mongoose.Schema({
  date: String,
  employeeID: String,
  fullName: String,
  department: String,
  salaryNet: Number,
  presentCount: Number,
  basic: Number,
  homeRent: Number,
  medical: Number,
  travel: Number,
  welfare: Number,
  hajira: Number,
  pf: Number,
  overTime: Number,
  eidBonus: Number,
  advDeduct: Number,
  absent: Number,
  entryDate: { type: Date, default: Date.now },
});

const Salary = mongoose.model("Salary", salarySchema);

app.post("/salaries", async (req, res) => {
  try {
    const salaryData = req.body; // Expecting an array of salary entries

    // Validate that salaryData is indeed an array
    if (!Array.isArray(salaryData)) {
      return res
        .status(400)
        .json({ message: "Invalid input: expected an array of salary data." });
    }

    // Use insertMany to save an array of salary entries
    const savedSalaries = await Salary.insertMany(salaryData);
    return res
      .status(201)
      .json({ message: "Salary data saved successfully", data: savedSalaries });
  } catch (error) {
    console.error("Error saving salary data:", error);
    return res
      .status(500)
      .json({ message: "Error saving salary data", error: error.message });
  }
});

// Route to get salary data with date filtering
app.get("/salaries", async (req, res) => {
  try {
    const salaries = await Salary.find();
    res.status(200).json(salaries);
  } catch (err) {
    res.status(500).json({ message: "Error fetching salary data" });
  }
});
// GET salary by ID
app.get("/salaries/:id", async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) {
      return res.status(404).send({ error: "Salary not found" });
    }
    res.status(200).json(salary);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Server error" });
  }
});

// Update salary entry
app.put("/salaries/:id", async (req, res) => {
  try {
    await Salary.findByIdAndUpdate(req.params.id, req.body);
    res.status(200).json({ message: "Salary data updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating salary data" });
  }
});

// Delete salary entry
app.delete("/salaries/:id", async (req, res) => {
  try {
    await Salary.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Salary deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting salary data" });
  }
});
// Example for Express.js
// Updated endpoint in server.js to return a message
app.post("/salaries/delete-by-date", async (req, res) => {
  const { date } = req.body;

  try {
    const targetDate = new Date(date).toISOString().split("T")[0];

    // Delete all salary records with the matching date
    const result = await Salary.deleteMany({
      date: { $regex: `^${targetDate}` },
    });

    if (result.deletedCount > 0) {
      res.json({ message: "Delete Successfully" });
    } else {
      res.json({ message: "No records found for the specified date" });
    }
  } catch (error) {
    console.error("Error deleting salaries:", error);
    res.status(500).json({ message: "Error deleting salaries" });
  }
});

//-------Add Pond--------//

// Pond Schema
const pondSchema = new mongoose.Schema({
  name: { type: String, required: true },
  area: { type: Number, required: true },
  boxQuantity: { type: Number, required: true },
  employ: { type: String, required: true },
  status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  pondStart: { type: Date, required: true },
});

// Pond Model
const Pond = mongoose.model("Pond", pondSchema);

// API Routes
app.post("/api/ponds", async (req, res) => {
  try {
    const pond = new Pond(req.body);
    const savedPond = await pond.save();
    res.status(201).json(savedPond);
  } catch (error) {
    console.error("Error saving pond:", error);
    res.status(400).json({ error: error.message || "Server error" });
  }
});
// GET: Retrieve all ponds
app.get("/api/ponds", async (req, res) => {
  try {
    const ponds = await Pond.find();
    res.json(ponds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET: Retrieve a single pond by ID
app.get("/api/ponds/:id", async (req, res) => {
  try {
    const pond = await Pond.findById(req.params.id);
    if (!pond) return res.status(404).json({ error: "Pond not found" });
    res.json(pond);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT: Update a pond by ID
app.put("/api/ponds/:id", async (req, res) => {
  try {
    const updatedPond = await Pond.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedPond) return res.status(404).json({ error: "Pond not found" });
    res.json(updatedPond);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE: Delete a pond by ID
app.delete("/api/ponds/:id", async (req, res) => {
  try {
    const deletedPond = await Pond.findByIdAndDelete(req.params.id);
    if (!deletedPond) return res.status(404).json({ error: "Pond not found" });
    res.json({ message: "Pond deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//------Product Info------////
// Product schema and model
const productSchema = new mongoose.Schema({
  productCode: String,
  productName: String,
  category: String,
  unitName: String,
  pcsCount: Number,
  serialNo: String,
  costPrice: Number,
  salePrice: Number,
  minAlertQty: Number,
  status: String,
});

const Product = mongoose.model("Product", productSchema);

// Routes
app.post("/api/products", async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).send(product);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).send(products);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.put("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res.status(404).send({ error: "Product not found" });
    }
    res.send(product);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).send({ error: "Product not found" });
    }
    res.send({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

//-----------Pond Entry-----------////

//  POST request for saving pond entry data
// app.post("/api/pondEntries", async (req, res) => {
//   try {
//     const pondEntries = req.body; // Data sent in the request body

//     // Ensure the body is in the correct format
//     if (!Array.isArray(pondEntries) || pondEntries.length === 0) {
//       return res.status(400).json({ message: "Invalid input data format." });
//     }

//     // Save each pond entry to the database
//     const savedEntries = await PondEntry.insertMany(pondEntries);

//     res
//       .status(200)
//       .json({ message: "Data saved successfully", data: savedEntries });
//   } catch (error) {
//     console.error("Error saving pond entry data:", error); // Log the entire error object
//     res.status(500).json({
//       message: "Error saving pond entry data.",
//       error: error.message, // Log the error message
//       stack: error.stack, // Optionally log the stack trace for debugging
//     });
//   }
// });
// Your POST endpoint
// POST a new pond entry

// POST route to add a new pond entry
// POST route to save pond entries
app.post("/api/pondEntries", async (req, res) => {
  try {
    // Create a new PondEntry document from the request body
    const pondEntries = req.body;
    const savedEntries = await PondEntry.insertMany(pondEntries); // Use insertMany for multiple entries

    res.status(201).json({
      message: "Data saved successfully!",
      data: savedEntries,
    });
  } catch (error) {
    console.error("Error saving pond entries:", error);
    res.status(500).json({
      message: "An error occurred while saving data",
      error: error.message,
    });
  }
});

// GET route - Fetch all pond entries
app.get("/api/pondEntries", async (req, res) => {
  try {
    const pondEntries = await PondEntry.find();
    res.status(200).json(pondEntries);
  } catch (error) {
    res.status(500).json({ message: "Error fetching data", error });
  }
});
app.get("/api/pondEntries", (req, res) => {
  const { pondName, date } = req.query;
  // Format the date properly, in case the date format sent from frontend differs
  const formattedDate = new Date(date).toISOString().split("T")[0]; // Adjust the format if needed

  PondEntry.find({
    pondName: pondName,
    date: formattedDate,
  })
    .then((entries) => {
      if (entries.length > 0) {
        res.json(entries); // Return found entries
      } else {
        res.json([]); // No matching data found
      }
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      res.status(500).json({ message: "Error fetching data." });
    });
});

// PUT endpoint to update an existing pond entry
app.put("/api/pondEntries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    // Find the existing pond entry by ID
    const existingEntry = await PondEntry.findById(id);

    if (!existingEntry) {
      return res.status(404).json({ message: "Pond entry not found" });
    }

    // Update fields, for example, update products
    existingEntry.products = updatedData.products;

    // Save the updated entry
    const savedEntry = await existingEntry.save();

    res.json({ message: "Pond entry updated successfully", savedEntry });
  } catch (error) {
    console.error("Error updating pond entry:", error);
    res.status(500).json({
      message: "Error updating pond entry",
      error: error.message,
    });
  }
});
