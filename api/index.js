import express from 'express';
import connectDB from '../config/db.js';
import authRoutes from "../routes/auth.routes.js";
import fileRoutes from "../routes/file.routes.js";
import aiRoutes from "../routes/ai.routes.js";

const app = express();

app.use(express.json()); 
connectDB();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('StudyGeni API is Running...');
})

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/me", authRoutes);

app.listen(PORT, ()=>{
    console.log(`Server Is Running on the port ${PORT}....!!`);
})

