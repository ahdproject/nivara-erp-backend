const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

// Security & Performance Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan('combined'));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Static Files
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api', routes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error Handling Middleware
app.use(errorMiddleware);

module.exports = app;
