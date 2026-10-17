const mongoose = require('mongoose');

let gfsBucket;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Initialize GridFS bucket for file storage
    const db = mongoose.connection.db;
    gfsBucket = new mongoose.mongo.GridFSBucket(db, {
      bucketName: 'uploads'
    });
    console.log('GridFS Bucket initialized successfully');

    return gfsBucket;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

const getGfsBucket = () => {
  if (!gfsBucket) {
    throw new Error('GridFS bucket has not been initialized');
  }
  return gfsBucket;
};

module.exports = { connectDB, getGfsBucket };