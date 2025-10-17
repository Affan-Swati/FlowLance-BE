import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userRoutes from "./routes/user.route.js";

dotenv.config();

const app = express();

//middleware
app.use(express.json());
app.use(express.urlencoded({extended: false}));

// Routes
app.use("/api/users", userRoutes);

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