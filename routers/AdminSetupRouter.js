const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/UserModel');

const router = express.Router();

// One-time admin creation endpoint (remove after use)
router.post('/create-admin', async (req, res) => {
  try {
    // Security check - only allow in development or with secret key
    const secretKey = req.headers['x-admin-secret'] || req.body.secretKey;
    if (secretKey !== 'kais_admin_create_2025') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized - Invalid secret key' 
      });
    }

    // Admin user data
    const adminData = {
      name: 'Admin User',
      email: 'admin@admin.com',
      password: 'adminpass123', // Change this!
      role: 'admin'
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    
    if (existingAdmin) {
      // Update existing admin password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);
      
      await User.findByIdAndUpdate(existingAdmin._id, {
        password: hashedPassword,
        name: adminData.name
      });
      
      return res.json({
        success: true,
        message: 'Admin user password updated successfully',
        credentials: {
          email: adminData.email,
          password: adminData.password,
          role: adminData.role
        },
        userId: existingAdmin._id
      });
    }

    // Create new admin user
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);

    const adminUser = new User({
      ...adminData,
      password: hashedPassword
    });

    await adminUser.save();

    res.json({
      success: true,
      message: 'Admin user created successfully',
      credentials: {
        email: adminData.email,
        password: adminData.password,
        role: adminData.role
      },
      userId: adminUser._id
    });

  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating admin user',
      error: error.message
    });
  }
});

module.exports = router;