import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';

dotenv.config();

const createAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const adminData = {
      username: "",
      email: "",
      password: "", 
      role: "admin"
    };

    const admin = await User.create(adminData);
    console.log('Admin user created successfully:', admin);

  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createAdminUser();