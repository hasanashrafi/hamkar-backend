// MongoDB connection test script
require('dotenv').config();
const mongoose = require('mongoose');

const testConnection = async () => {
    try {
        console.log('🔍 Testing MongoDB connection...');
        console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);

        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI environment variable is not set');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Successfully connected to MongoDB!');

        // Test a simple operation
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📋 Available collections:', collections.map(c => c.name));

        await mongoose.connection.close();
        console.log('🔌 Connection closed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

testConnection();
