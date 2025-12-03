import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import authRoutes from './routes/auth.route.js';
import passport from 'passport';

import userRoutes from "./routes/user.route.js";
import transactionRoutes from "./routes/transaction.route.js";
import userBalanceRoutes from "./routes/userBalance.route.js";
import gigRoutes from './routes/gig.route.js';
import milestoneRoutes from './routes/milestone.route.js';

dotenv.config();

const app = express();

//middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/balances", userBalanceRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/milestones', milestoneRoutes);

//connect to MongoDB
const mongoUri = process.env.MONGO_URI;
const port = process.env.PORT || 3000;

mongoose.connect(mongoUri).then(() => {
    console.log("Connected to MongoDB!");
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
})
.catch((err) => {
    console.log("Connection failed!",err);
});