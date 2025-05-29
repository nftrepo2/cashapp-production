const mongoose = require('mongoose');

const sendMoneySchema = new mongoose.Schema({
  from: {
    type: String,
    required: true,
  },
  recipient_account: {
    type: String,
    required: true,
  },
  recipient_email: {
    type: String,
  },
  amount: {
    type: Number,
    required: true,
  },
  note: {
    type: String,
  },
  recipient_name: {
    type: String,
    default: null,
  },
  senderName: {
    type: String,
    required: true,
  },
  recipientName: {
    type: String,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
}, { timestamps: true });

const SendMoney = mongoose.model('sendMoney', sendMoneySchema);

module.exports = SendMoney;