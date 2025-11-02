const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/UserModel');
require('dotenv').config();

// Admin user data
const adminData = {
  name: 'admin',
  email: 'admin@admin.com',
  password: 'adminpass', // This will be hashed
  role: 'admin'
};

async function createAdminUser() {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log('❌ Admin user already exists with email:', adminData.email);
      process.exit(1);
    }

    // Hash the password
    console.log('🔐 Hashing password...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);

    // Create the admin user
    const adminUser = new User({
      ...adminData,
      password: hashedPassword
    });

    // Save to database
    console.log('💾 Saving admin user to database...');
    await adminUser.save();

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Password:', adminData.password);
    console.log('👤 Role:', adminData.role);
    console.log('🆔 User ID:', adminUser._id);

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the script
createAdminUser();