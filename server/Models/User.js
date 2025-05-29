const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  isSuspended: {
    type: Boolean,
    default: false,
  },
  fullName: {
    type: String,
    required: [true, 'Please enter your first name'],
    trim: true,
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    required: [true, 'Please enter an email'],
    validate: [validator.isEmail, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Please enter a password'],
    minlength: [6, 'Password must be at least 6 characters'],
  },
  accNo: {
    type: String,
    unique: true,
    validate: {
      validator: function (v) {
        return /^620450\d{4}$/.test(v); // Starts with  followed by 4 digits
      },
      message: 'Invalid account number format',
    },
  },
  balance: {
    type: Number,
    default: 0,
  },
  routingNo: {
    type: Number
  },
  sendMoneys: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'sendMoney',
  },

  widthdraws: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'withdraw',
  },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Static login method
userSchema.statics.login = async function (email, password) {
  const user = await this.findOne({ email });
  if (!user) {
    throw Error('Incorrect email');
  }
   if (user.isSuspended) {
    throw Error('Your account is suspended. If you believe this is a mistake, please contact support');
  }
  const auth = await bcrypt.compare(password, user.password);
  if (!auth) {
    throw Error('Incorrect password');
  }
  return user;
};

const User = mongoose.model('user', userSchema);

module.exports = User;