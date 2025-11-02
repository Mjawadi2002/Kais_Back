require('dotenv').config();
const bcrypt = require('bcryptjs');
const User = require('../models/UserModel'); // Directly import the model

// Create a new user (admin-only route should guard this on the router)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Prevent duplicate emails
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const newUser = new User({ name, email, password: hashed, role });
    await newUser.save();

    res.status(201).json({
      message: 'User created successfully',
      user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role },
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// list clients (admin)
exports.listClients = async (req, res) => {
  try {
    const clients = await User.find({ role: 'client' }).select('-password');
    res.json({ clients });
  } catch (err) {
    console.error('List clients error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// list delivery persons (admin)
exports.listDeliveryPersons = async (req, res) => {
  try {
    const delivery = await User.find({ role: 'delivery' }).select('-password');
    res.json({ delivery });
  } catch (err) {
    console.error('List delivery error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// list all users (admin) with optional role filter
exports.listAllUsers = async (req, res) => {
  try {
    const role = req.query.role;
    const filter = {};
    if (role) filter.role = role;
    const users = await User.find(filter).select('-password');
    res.json({ users });
  } catch (err) {
    console.error('List all users error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// get a user by id (admin)
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password');
    if (!user) return res.status(404).json({ message: 'Not found' });
    res.json({ user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// update user (admin)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;

    await user.save();
    res.json({ message: 'User updated', user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// delete user (admin)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await User.deleteOne({ _id: id });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
