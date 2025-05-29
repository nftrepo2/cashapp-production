const express = require('express');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const User = require('./server/Models/User');
const SendMoney = require('./server/Models/sendMoney');
const Withdraw = require('./server/Models/withdraw');

const app = express();
const PORT = process.env.PORT || 6500;

// Middlewares (unchanged)
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 },
  useTempFiles: true,
  tempFileDir: 'public/uploads',
}));
app.use(methodOverride('_method'));
app.use(session({
  secret: 'piuscandothis',
  resave: false,
  saveUninitialized: false,
}));
app.use(flash());

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// DB config
const db = 'mongodb+srv://pius1:pius123@webdevelopment.xav1dsx.mongodb.net/cashFake';
mongoose.connect(db)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Middleware to pass flash messages to views
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;
  if (token) {
    jwt.verify(token, 'piuscandothis', (err, decodedToken) => {
      if (err) {
        console.log(err.message);
        res.redirect('/login');
      } else {
        req.userId = decodedToken.id;
        next();
      }
    });
  } else {
    res.redirect('/login');
  }
};

// Unified handleErrors function (unchanged)
const handleErrors = (err) => {
  let errors = {
    fullName: '',
    email: '',
    password: '',
    code: '',
    accNo: '',
    recipient_account: '',
    amount: '',
    recipient_name: '',
  };

  if (err.code === 11000) {
    if (err.keyPattern.email) {
      errors.email = 'That email is already registered';
    } else if (err.keyPattern.accNo) {
      errors.accNo = 'Account number already exists';
    }
    return errors;
  }

  if (err.message.includes('user validation failed') || err.message.includes('sendMoney validation failed')) {
    Object.values(err.errors).forEach(({ properties }) => {
      errors[properties.path] = properties.message;
    });
    return errors;
  }

  if (err.message === 'Incorrect email') {
    errors.email = 'Incorrect email';
  } else if (err.message === 'Incorrect password') {
    errors.password = 'Incorrect password';
  }else if (err.message === 'Your account is suspended. If you believe this is a mistake, please contact support') {
    errors.email = err.message;
  }else if (err.message === 'All fields are required') {
    errors.email = 'All fields are required';
    errors.password = 'All fields are required';
  } else if (err.message === 'Passwords do not match') {
    errors.password = 'Passwords do not match';
  } else if (err.message === 'Recipient account and amount are required') {
    errors.recipient_account = 'Recipient account is required';
    errors.amount = 'Amount is required';
  } else if (err.message === 'Sender not found') {
    errors.email = 'Sender not found';
  } else if (err.message === 'Insufficient balance') {
    errors.amount = 'Insufficient balance';
  } else if (err.message === 'Recipient name is required for non-registered accounts') {
    errors.recipient_name = 'Recipient name is required';
  } else if (err.message === 'Query parameter is required') {
    errors.recipient_account = 'Query parameter is required';
  }

  return errors;
};

// JWT token creation
const maxAge = 3 * 24 * 60 * 60;
const createToken = (id) => {
  return jwt.sign({ id }, 'piuscandothis', { expiresIn: maxAge });
};

// Generate 3-digit routing number
const generateRoutingNumber = () => {
  return Math.floor(100 + Math.random() * 900);
};

// Generate account number
const generateAccountNumber = () => {
  const prefix = '620450';
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomDigits}`;
};

// Routes (keeping existing routes unchanged, updating /api/transactions)
app.get('/', (req, res) => {
  res.render('login');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      throw Error('All fields are required');
    }

    const user = await User.login(email, password);
    const token = createToken(user._id);
    res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        accNo: user.accNo,
        balance: user.balance,
        routingNo: user.routingNo,
      },
      token,
    });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/api/auth/register', async (req, res) => {
  const { fullName, email, password1, password2 } = req.body;

  try {
    if (!fullName || !email || !password1 || !password2) {
      throw Error('All fields are required');
    }

    if (password1 !== password2) {
      throw Error('Passwords do not match');
    }

    let accNo;
    let isUnique = false;

    while (!isUnique) {
      accNo = generateAccountNumber();
      const existingUser = await User.findOne({ accNo });
      if (!existingUser) {
        isUnique = true;
      }
    }

    const routingNo = generateRoutingNumber();

    const user = new User({
      fullName,
      email,
      password: password1,
      accNo,
      routingNo,
    });

    const savedUser = await user.save();
    const token = createToken(savedUser._id);
    res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });

    res.status(201).json({
      success: true,
      user: {
        _id: savedUser._id,
        fullName: savedUser.fullName,
        email: savedUser.email,
        accNo: savedUser.accNo,
        balance: savedUser.balance,
        routingNo: savedUser.routingNo,
      },
      token,
    });
  } catch (err) {
    const errors = handleErrors(err);
    console.error('Registration error:', { message: err.message, errors });
    res.status(400).json({ success: false, errors });
  }
});

app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      res.clearCookie('jwt');
      return res.redirect('/login');
    }
    res.render('dashboard', { user });
  } catch (err) {
    console.error(err);
    res.redirect('/login');
  }
});

app.get('/api/user', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        accNo: user.accNo,
        balance: user.balance,
        routingNo: user.routingNo,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get("/recipient", (req, res) => {
  res.render("recipient");
});

app.get('/api/user/lookup', requireAuth, async (req, res) => {
  const { query } = req.query;

  try {
    if (!query) {
      throw Error('Query parameter is required');
    }

    const user = await User.findOne({
      $or: [{ accNo: query }, { email: query }],
    }).select('fullName accNo email');

    if (!user) {
      return res.status(200).json({ success: true, found: false });
    }

    res.status(200).json({
      success: true,
      found: true,
      user: {
        fullName: user.fullName,
        accNo: user.accNo,
        email: user.email,
      },
    });
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ success: false, errors });
  }
});

app.get('/transactions', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password').lean();
    if (!user) {
      res.clearCookie('jwt');
      return res.redirect('/login');
    }

    res.render('history.ejs');
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
});

app.get('/send', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.redirect('/login');
    }
    await user.save();
    res.render('send');
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
});

app.post('/send-money', requireAuth, async (req, res) => {
  const { recipient_account, amount, note, recipient_name } = req.body;

  console.log('send-money request body:', req.body);

  try {
    if (!recipient_account || !amount || amount <= 0) {
      throw Error('Recipient account and amount are required and amount must be positive');
    }

    const sender = await User.findById(req.userId);
    if (!sender) {
      throw Error('Sender not found');
    }

    if (sender.balance < amount) {
      throw Error('Insufficient balance');
    }

    let recipient = await User.findOne({
      $or: [{ accNo: recipient_account }, { email: recipient_account }],
    });
    let isRecipientNotFound = !recipient;

    if (isRecipientNotFound) {
      if (!recipient_name || typeof recipient_name !== 'string' || recipient_name.trim() === '') {
        throw Error('Recipient name is required for non-registered accounts');
      }
    }

    sender.balance -= amount;
    await sender.save();

    if (!isRecipientNotFound) {
      recipient.balance += amount;
      await recipient.save();
    }

    const transaction = new SendMoney({
      from: sender.accNo,
      recipient_account: isRecipientNotFound ? recipient_account : recipient.accNo,
      amount,
      note,
      owner: sender._id,
      recipient_name: isRecipientNotFound ? recipient_name.trim() : null,
      senderName: sender.fullName,
      recipientName: isRecipientNotFound ? recipient_name.trim() : recipient.fullName,
    });
    await transaction.save();

    const transactionDetails = {
      id: transaction._id,
      senderAccountNumber: sender.accNo,
      recipientAccountNumber: isRecipientNotFound ? recipient_account : recipient.accNo,
      senderName: sender.fullName,
      recipientName: isRecipientNotFound ? recipient_name.trim() : recipient.fullName,
      amount: amount,
      timestamp: transaction.createdAt,
      note: note,
    };

    res.status(200).json({
      success: true,
      redirect: '/success',
      transaction: transactionDetails,
    });
  } catch (err) {
    console.error('send-money error:', err.message);
    const errors = handleErrors(err);
    res.status(400).json({ success: false, errors });
  }
});

app.get('/api/user/recent-contacts', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;

    const transactions = await SendMoney.find({ owner: userId })
      .sort({ createdAt: -1 })
      .limit(10);

    const recipientsMap = new Map();

    for (const tx of transactions) {
      const recipientKey = tx.recipient_account || tx.recipient_name;
      if (!recipientsMap.has(recipientKey)) {
        let recipientInfo = {
          name: tx.recipientName,
          accNo: tx.recipient_account,
        };

        if (tx.recipient_account && !tx.recipient_name) {
          const recipientUser = await User.findOne({ accNo: tx.recipient_account }).select('fullName accNo');
          if (recipientUser) {
            recipientInfo.name = recipientUser.fullName;
            recipientInfo.accNo = recipientUser.accNo;
          }
        }

        recipientsMap.set(recipientKey, recipientInfo);
      }
    }

    const recentContacts = Array.from(recipientsMap.values()).slice(0, 5);

    res.status(200).json({
      success: true,
      contacts: recentContacts,
    });
  } catch (err) {
    console.error('Error fetching recent contacts:', err);
    const errors = handleErrors(err);
    res.status(400).json({ success: false, errors });
  }
});

app.get('/api/transactions', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('accNo fullName');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch SendMoney transactions
    const sendTransactions = await SendMoney.find({
      $or: [
        { owner: req.userId }, // User is the sender
        { recipient_account: user.accNo }, // User is the recipient
      ],
    }).sort({ createdAt: -1 });

    // Fetch Withdraw transactions
    const withdrawTransactions = await Withdraw.find({
      owner: req.userId,
    }).sort({ createdAt: -1 });

    // Map SendMoney transactions
    const sendTransactionDetails = await Promise.all(
      sendTransactions.map(async (transaction) => {
        let senderName = user.fullName;
        let recipientName;

        const isSent = transaction.owner.toString() === req.userId.toString();

        if (isSent) {
          if (transaction.recipient_name) {
            recipientName = transaction.recipient_name;
          } else {
            const recipient = await User.findOne({ accNo: transaction.recipient_account }).select('fullName');
            recipientName = recipient ? recipient.fullName : 'Unknown';
          }
        } else {
          const owner = await User.findById(transaction.owner).select('fullName');
          senderName = owner ? owner.fullName : 'Unknown';
          recipientName = user.fullName;
        }

        return {
          id: transaction._id,
          type: 'Transfer',
          senderAccountNumber: transaction.from,
          recipientAccountNumber: transaction.recipient_account,
          senderName,
          recipientName,
          amount: transaction.amount,
          timestamp: transaction.createdAt,
          note: transaction.note,
          isSent,
        };
      })
    );

    // Map Withdraw transactions
    const withdrawTransactionDetails = withdrawTransactions.map((transaction) => ({
      id: transaction._id,
      type: 'Withdrawal',
      senderAccountNumber: transaction.from,
      recipientAccountNumber: transaction.recipient_account, // "To Your Bank"
      senderName: user.fullName,
      recipientName: 'Your Bank',
      amount: transaction.amount,
      timestamp: transaction.createdAt,
      note: 'Withdrawal to bank account',
      isSent: true, // Withdrawals are initiated by the user
    }));

    // Combine and sort transactions
    const allTransactions = [...sendTransactionDetails, ...withdrawTransactionDetails].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.status(200).json({
      success: true,
      transactions: allTransactions,
    });
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ success: false, message: 'Error fetching transactions' });
  }
});

app.get("/success", (req, res) => {
  res.render("success");
});

app.get("/withdraw", (req, res) => {
  res.render("withdraw");
});

app.post('/api/withdraw', requireAuth, async (req, res) => {
  try {
    const { amount, email } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });
    }
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email, _id: req.userId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    user.balance -= amount;
    await user.save();

    const withdrawal = new Withdraw({
      from: user.accNo,
      recipient_account: 'To Your Bank',
      amount,
      owner: user._id,
    });
    await withdrawal.save();

    user.widthdraws.push(withdrawal._id);
    await user.save();

    res.status(200).json({
      success: true,
      userBalance: user.balance,
    });
  } catch (err) {
    console.error('Error processing withdrawal:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


app.get("/withdraw-success",(req, res)=>{
    res.render("withdraw-success")
  })

  app.get("/profile",(req,res)=>{

    res.render("profile")
  })



app.get("/siteAdminRoute", async (req, res) => {
  let perPage = 100; // Number of users per page
  let page = parseInt(req.query.page) || 1; // Current page
  let sort = req.query.sort || 'createdAt'; // Default sort field
  let order = req.query.order || 'desc'; // Default sort order
  let status = req.query.status || 'all'; // Default status filter

  try {
    // Build query for filtering
    let query = {};
    if (status === 'active') {
      query.isSuspended = false; // Active users
    } else if (status === 'suspended') {
      query.isSuspended = true; // Suspended users
    } // No filter for 'all'

    // Map sort fields to schema fields
    let sortField = sort;
    if (sort === 'fullname') {
      sortField = 'fullName'; // Sort by fullName
    } else if (sort === 'index') {
      sortField = 'createdAt'; // Fallback for index (client-side numbering)
    }

    // Query users with pagination, filtering, and sorting
    const user = await User.aggregate([
      {
        $addFields: {
          fullname: '$fullName', // Use fullName directly
        },
      },
      { $match: query }, // Apply status filter
      { $sort: { [sortField]: order === 'asc' ? 1 : -1 } }, // Apply sorting
    ])
      .skip(perPage * (page - 1)) // Pagination: skip previous pages
      .limit(perPage) // Pagination: limit to perPage
      .exec();

    // Count total users for pagination
    const count = await User.countDocuments(query);

    res.render("adminDashboard", {
      user, // Array of users
      page, // Current page
      totalPages: Math.ceil(count / perPage), // Total pages
      sort,
      order,
      status,
    });
  } catch (error) {
    console.log(error);
    res.render("adminDashboard", {
      user: [], // Empty array on error
      page: 1,
      totalPages: 1,
      sort: 'createdAt',
      order: 'desc',
      status: 'all',
    });
  }
});

app.get("/viewUser/:id", async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id })
      .populate('sendMoneys') // Populate SendMoney details
      .populate('widthdraws') // Populate Withdraw details
      .lean(); // Convert to plain JS object for manipulation

    if (!user) {
      return res.status(404).render('error', { message: 'User not found' });
    }

    // Set fullname
    user.fullname = user.fullName;

    res.render('viewUser', {
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'An error occurred while fetching user details' });
  }
});

app.post("/suspendUser/:id",async(req,res)=>{
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/siteAdminRoute');
        }
  
        // Toggle suspension status
        user.isSuspended = !user.isSuspended;
        await user.save();
  

  
        req.flash('success', `User ${user.isSuspended ? 'suspended' : 'reactivated'} successfully`);
        res.redirect('/siteAdminRoute');
    } catch (error) {
        console.error('Error in suspendUser:', error);
        req.flash('error', 'Error updating user suspension status');
        res.redirect('/siteAdminRoute');
    }
})

app.get("/editUser/:id", async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id })
      .populate('sendMoneys') // Populate SendMoney details
      .populate('widthdraws') // Populate Withdraw details
      .lean();

    if (!user) {
      return res.status(404).render('error', { message: 'User not found' });
    }

    // Set fullname
    user.fullname = user.fullName;

    res.render('editUser', {
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'An error occurred while fetching user details' });
  }
});

app.put("/editUser/:id", async (req, res) => {
  try {
    const { balance, isSuspended } = req.body;

    // Validate balance
    if (!balance || isNaN(balance) || parseFloat(balance) < 0) {
      const user = await User.findOne({ _id: req.params.id })
        .populate('sendMoneys')
        .populate('widthdraws')
        .lean();
      if (!user) {
        return res.status(404).render('error', { message: 'User not found' });
      }
      user.fullname = user.fullName;
      return res.status(400).render('editUser', {
        user,
        error: 'Balance must be a non-negative number',
      });
    }

    // Convert isSuspended to boolean (checkbox sends 'on' or nothing)
    const isSuspendedValue = isSuspended === 'on';

    // Update user
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        balance: parseFloat(balance),
        isSuspended: isSuspendedValue,
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).render('error', { message: 'User not found' });
    }

    // Redirect to viewUser
    res.redirect(`/viewUser/${req.params.id}`);
  } catch (error) {
    console.error(error);
    const user = await User.findOne({ _id: req.params.id })
      .populate('sendMoneys')
      .populate('widthdraws')
      .lean();
    if (!user) {
      return res.status(500).render('error', { message: 'User not found' });
    }
    user.fullname = user.fullName;
    res.status(500).render('editUser', {
      user,
      error: 'An error occurred while updating the user',
    });
  }
});
  app.delete("/deleteUser/:id",async(req, res)=>{
    try {
        await User.deleteOne({ _id: req.params.id });
          res.redirect("/siteAdminRoute")
        } catch (error) {
          console.log(error);
        }
})

app.get('/logout', (req, res) => {
  res.clearCookie('jwt');
  res.redirect('/login');
});



app.listen(PORT, () => console.log(`Server running on ${PORT}`));