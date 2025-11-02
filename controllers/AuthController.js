require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change_this_refresh_secret';
const JWT_EXPIRES = '1h'; // Access token expires in 1 hour
const JWT_REFRESH_EXPIRES = '7d'; // Refresh token expires in 7 days

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = { id: user._id, role: user.role, name: user.name, email: user.email };
    
    // Generate access token (1 hour)
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    
    // Generate refresh token (7 days)
    const refreshToken = jwt.sign({ id: user._id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });

    return res.json({ 
      accessToken,
      refreshToken,
      user: payload,
      expiresIn: 3600 // 1 hour in seconds
    });
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Route to verify token and return current user
exports.me = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    jwt.verify(token, JWT_SECRET, (err, payload) => {
      if (err) return res.status(401).json({ message: 'Invalid token' });
      return res.json({ user: payload });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Refresh token endpoint
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Verify refresh token
    jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, payload) => {
      if (err) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      try {
        // Get user data
        const user = await User.findById(payload.id);
        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }

        // Generate new access token
        const userPayload = { 
          id: user._id, 
          role: user.role, 
          name: user.name, 
          email: user.email 
        };
        
        const newAccessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
        
        // Optionally generate new refresh token for better security
        const newRefreshToken = jwt.sign({ id: user._id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });

        return res.json({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          user: userPayload,
          expiresIn: 3600 // 1 hour in seconds
        });
      } catch (dbErr) {
        console.error('Database error:', dbErr);
        return res.status(500).json({ message: 'Server error' });
      }
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
