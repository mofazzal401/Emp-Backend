const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
// const Salary = require('./Salary_Models');

const Employee = require('./Emp_Model');
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx');


const app = express();
app.use(cors());
app.use(express.json());



// app.use(fileUpload());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files


// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// MongoDB connection
mongoose.connect('mongodb+srv://Mofazzal:290401@cluster0.4lxud.mongodb.net/Employee_Data', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => console.log('Error connecting to MongoDB:', err));

  // --------------------- SERVER START ---------------------\\

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));







// ---------------API endpoints

app.post('/employees', upload.fields([{ name: 'photo' }, { name: 'nidPhoto' }, { name: 'certificateCopy' }]), async (req, res) => {
  try {
    const employeeData = req.body;
    // Handle file paths
    if (req.files.photo) employeeData.photo = req.files.photo[0].path; // Save only the filename
    if (req.files.nidPhoto) employeeData.nidPhoto = req.files.nidPhoto[0].path;
    if (req.files.certificateCopy) employeeData.certificateCopy = req.files.certificateCopy[0].path;

    const employee = new Employee(employeeData);
    await employee.save();
    res.status(201).send('Employee saved successfully');
  } catch (error) {
    res.status(400).send('Error saving employee: ' + error.message);
  }
});

//////Excel Upload      POST endpoint to upload employee data
app.post('/employees/upload', async (req, res) => {
  try {
      const employees = req.body;

      // Check if the data is an array
      if (!Array.isArray(employees) || employees.length === 0) {
          return res.status(400).json({ message: 'Invalid data format. Expected an array of employees.' });
      }

      // Validate each employee object before inserting
      for (const employee of employees) {
          // Add more specific checks as necessary
          if (!employee.fullName || !employee.dateOfBirth || !employee.contactNumber) {
              return res.status(400).json({ message: 'Missing required fields in employee data.' });
          }
      }

      await Employee.insertMany(employees);
      res.status(201).json({ message: 'Employees uploaded successfully!' });
  } catch (error) {
      console.error('Error uploading employees:', error);
      res.status(500).json({ message: 'Failed to upload data.' });
  }
});


// GET: Retrieve all employees
app.get('/employees', async (req, res) => {
  try {
    const employees = await Employee.find(); // Assuming Employee is your model
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employees', error });
  }
});

// GET: Retrieve a single employee by ID
app.get('/employees/:id', async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.status(200).json(employee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving employee', error: error.message });
  }
});


app.put('/employees/:id', upload.fields([{ name: 'photo' }, { name: 'nidPhoto' }, { name: 'certificateCopy' }]), async (req, res) => {
  const { id } = req.params;

  // Check if the provided ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid Employee ID' });
  }

  try {
      const employeeData = req.body;

      // Log req.files to check if files are uploaded
      console.log('Uploaded files:', req.files);

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
      const updatedEmployee = await Employee.findByIdAndUpdate(id, employeeData, { new: true });

      // If employee is not found, send a 404 response
      if (!updatedEmployee) {
          return res.status(404).json({ error: 'Employee not found' });
      }

      // Return the updated employee
      res.json(updatedEmployee);
  } catch (error) {
      console.error('Error updating employee data:', error); // Log the error for debugging
      res.status(500).json({ error: `Error updating employee data: ${error.message}` });
  }
});


// DELETE: Remove an employee by ID
app.delete('/employees/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.status(200).json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting employee', error: error.message });
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
  entryDate: { type: Date, default: Date.now }
});

const Salary = mongoose.model('Salary', salarySchema);



app.post('/salaries', async (req, res) => {
  try {
      const salaryData = req.body; // Expecting an array of salary entries

      // Validate that salaryData is indeed an array
      if (!Array.isArray(salaryData)) {
          return res.status(400).json({ message: "Invalid input: expected an array of salary data." });
      }

      // Use insertMany to save an array of salary entries
      const savedSalaries = await Salary.insertMany(salaryData);
      return res.status(201).json({ message: "Salary data saved successfully", data: savedSalaries });
  } catch (error) {
      console.error('Error saving salary data:', error);
      return res.status(500).json({ message: "Error saving salary data", error: error.message });
  }
});


// Route to get salary data with date filtering
app.get('/salaries', async (req, res) => {
  try {
    const salaries = await Salary.find();
    res.status(200).json(salaries);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching salary data' });
  }
});
// GET salary by ID
app.get('/salaries/:id', async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) {
      return res.status(404).send({ error: 'Salary not found' });
    }
    res.status(200).json(salary);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Server error' });
  }
});



// Update salary entry
app.put('/salaries/:id', async (req, res) => {
  try {
    await Salary.findByIdAndUpdate(req.params.id, req.body);
    res.status(200).json({ message: 'Salary data updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating salary data' });
  }
});

// Delete salary entry
app.delete('/salaries/:id', async (req, res) => {
  try {
    await Salary.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Salary deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting salary data' });
  }
});