const mongoose = require('mongoose');

const withdrawSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true,
  },
  recipient_account: {
    type: String,
    default: "To Your Bank"
  },
 
  amount: {
    type: Number,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
}, { timestamps: true }); // Adds createdAt and updatedAt fields

const Withdraw = mongoose.model('withdraw', withdrawSchema);

module.exports = Withdraw;