const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const registrationRoutes = require('./routes/formRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const tradingFormRoutes = require('./routes/CopyTrading');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

app.get('/', (req, res) => {
  res.send('✨ Welcome to the Trading API Server');
});

// Routes
app.use('/api/registration', registrationRoutes); // ✅ Use registrationRoutes
app.use('/api/payments', paymentRoutes);
app.use('/api/trading-form', tradingFormRoutes); // ✅ Fixed syntax

// Server listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});