const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');
const { logger } = require('../../config/logger');

const login = async (email, password) => {
  try {
    const query = 'SELECT id, email, password, name, role FROM users WHERE email = $1';
    const result = await db.query(query, [email]);

    if (result.rows.length === 0) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      throw { statusCode: 401, message: 'Invalid credentials' };
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  } catch (error) {
    throw error;
  }
};

const register = async (email, password, name, role) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query =
      'INSERT INTO users (email, password, name, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id';

    const result = await db.query(query, [email, hashedPassword, name, role || 'user']);
    const userId = result.rows[0].id;

    const token = jwt.sign(
      { id: userId, email, role: role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    return {
      token,
      user: { id: userId, email, name, role: role || 'user' },
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  login,
  register,
};
