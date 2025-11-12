import User from '../model/user.model.js'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config();

const generateToken = (userId, role)=> {
    return jwt.sign({userId, role},process.env.JWT_SECRET_KEY,{
        expiresIn:"30d"
    })
} 

export const signup = async (req,res)=> {
    try 
    {
        const {username,email,password,role} = req.body;
        console.log(req.body);
        if(!username || !password || !email)
        {
            return res.status(400).json({
                message : "All Fields are Required...!!"
            })
        }

        const userExist = await User.findOne({email})
    
        if(userExist)
        {
             return res.status(409).json({
                message : "User Already Exist...!!"
            })
        }

        const newUser = await User.create({
            username, email, password, role 

        })

        const token = generateToken(newUser._id, newUser.role);
        console.log(token);

        res.status(201).json({
            success: true,
            message: "User created", 
            token,
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
            }
        }) 
    } 

    catch (err) 
    {
        console.error(err);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
}  

export const login = async (req, res) => { 
  try { 
    const { email, password } = req.body; 
 
    if (!email || !password) { 
      return res.status(400).json({ message: "Email and password are required" }); 
    } 
 
    const user = await User.findOne({ email }).select("+password"); 
    if (!user) { 
      return res.status(401).json({ message: "Invalid email or password" }); 
    } 
 
    const isPasswordCorrect = await user.matchPassword(password); 
    if (!isPasswordCorrect) { 
      return res.status(401).json({ message: "Invalid email or password" }); 
    } 
 
    const token = generateToken(user._id, user.role);
    console.log(token); 
 
    res.status(200).json({ 
      success: true, 
      message: "Login successful", 
      token,
      user: { 
        id: user._id, 
        username: user.username, 
        email: user.email, 
        role: user.role, 
      }, 
    }); 
  } catch (error) { 
    console.error("Login Error:", error); 
res.status(500).json({ message: "Internal Server Error" }); 
} 
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role === "student" && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: "Access denied! Students can only view their own profile.",
      });
    }

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Get user error:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching user details",
    });
  }
};

