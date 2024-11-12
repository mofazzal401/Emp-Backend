const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  employeeID: { type: String, required: true },
  fullName: { type: String, required: true },
  department: { type: String, required: true },
  netSalary: { type: Number, required: true },
  presentCount: { type: Number, required: true },
  basic: { type: Number, required: true },
  homeRent: { type: Number, required: true },
  medical: { type: Number, required: true },
  travel: { type: Number, required: true },
  welfare: { type: Number, required: true },
  hajira: { type: Number, required: true },
  overTime: { type: Number, default: 0 },
  eidBonus: { type: Number, default: 0 },
  pf: { type: Number, required: true },
  advDeduct: { type: Number, default: 0 },
  absent: { type: Number, required: true },
  date: { type: Date, required: true },
  entryDateTime: { type: Date, default: Date.now } // Automatically set when the entry is made
});

module.exports = mongoose.model('Salary', salarySchema);
