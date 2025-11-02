

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

async function connectDB() {
	try {
		await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
		console.log(`MongoDB connected: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);
	} catch (err) {
		console.error('MongoDB connection error:', err);
		process.exit(1);
	}
}

module.exports = { connectDB, mongoose };

