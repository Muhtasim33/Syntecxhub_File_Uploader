const mongoose = require('mongoose');

let gfsBucket;

const getMongoUri = () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is not set');
  }

  let parsedUri;
  try {
    parsedUri = new URL(mongoUri);
  } catch {
    throw new Error('MONGO_URI must be a valid MongoDB connection URI');
  }

  if (!['mongodb:', 'mongodb+srv:'].includes(parsedUri.protocol)) {
    throw new Error('MONGO_URI must use the mongodb:// or mongodb+srv:// scheme');
  }

  let databaseName;
  try {
    databaseName = decodeURIComponent(parsedUri.pathname.slice(1));
  } catch {
    throw new Error('MONGO_URI contains an invalidly encoded database name');
  }

  if (/\s+--[A-Za-z][\w-]*(?:\s|=|$)/.test(databaseName)) {
    throw new Error(
      'MONGO_URI database name contains command-line options. Use only the MongoDB connection URI; do not append options such as --apiVersion, --username, or --password.'
    );
  }

  return mongoUri;
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(getMongoUri());
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