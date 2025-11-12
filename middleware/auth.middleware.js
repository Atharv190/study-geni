import User from "../model/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from 'dotenv'
dotenv.config();

export const protectRoute = async (req, res, next) =>{


    try {
        const authHeader = req.headers.authorization ;
        if(!authHeader || !authHeader.startsWith("Bearer ")){
             return res.status(401).json({
            message: "unauthorized...!!"
        })
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const user = await User.findById(decoded.userId).select("-password");

        if(!user){
            return res.status(404).json({
                message:"User Not Found...!!"
            })
        }
        req.user = user;
        next();
    } 
    catch (error) {
        res.status(500).json({
            message:"Internal Server Error"
        })
    }
            
}

export const isAdmin = async (req,res,next)=> {
    if(req.user?.role !== 'teacher'){
        return res.status(401).json({
            message:" Access Denied...!!"
        })

    }

    next();
}

