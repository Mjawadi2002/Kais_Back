const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/UserModel');

// Production MongoDB URI - replace with your Railway MongoDB connection string
const PRODUCTION_MONGO_URI = 'mongodb://mongo:TfViExVfxawRsQTiACIJbJuUEvnhxSAi@shinkansen.proxy.rlwy.net:52091';

// Admin user data
const adminData = {
  name: 'Admin User',
  email: 'admin@admin.com',
  password: 'adminpass123', // Change this to a secure password
  role: 'admin'
};

async function createProductionAdminUser() {
  try {
    // Connect to Production MongoDB
    console.log('🔗 Connecting to Production MongoDB...');
    await mongoose.connect(PRODUCTION_MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to Production MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists with email:', adminData.email);
      console.log('🔑 Try logging in with:');
      console.log('   Email:', adminData.email);
      console.log('   Password: [check your records]');
      
      // Optionally update the password
      console.log('🔄 Updating password to new one...');
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);
      
      await User.findByIdAndUpdate(existingAdmin._id, {
        password: hashedPassword,
        name: adminData.name
      });
      
      console.log('✅ Admin password updated successfully!');
      console.log('🆔 Admin ID:', existingAdmin._id);
    } else {
      // Hash the password
      console.log('🔐 Hashing password...');
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);

      // Create the admin user
      const adminUser = new User({
        ...adminData,
        password: hashedPassword
      });

      // Save to database
      console.log('💾 Saving admin user to production database...');
      await adminUser.save();

      console.log('✅ Production admin user created successfully!');
      console.log('🆔 User ID:', adminUser._id);
    }

    console.log('\n🎉 PRODUCTION LOGIN CREDENTIALS:');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Password:', adminData.password);
    console.log('👤 Role:', adminData.role);
    console.log('🌐 Frontend URL: https://kaisfront-production.up.railway.app');

  } catch (error) {
    console.error('❌ Error with production admin user:', error.message);
    console.error('Full error:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Production database connection closed');
    process.exit(0);
  }
}

// Run the script
createProductionAdminUser();