import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"
import jwt from "jsonwebtoken"
import { asyncHandler } from "../utils/asyncHandler.js"
import { cookieOptions } from "../utils/cookieOptions.js"

const prisma = new PrismaClient()


const register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!email)
      return res.status(401).json({
        message: "email is required",
      });
    
    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) return res.status(400).json({ message: "User exists. Login" })
    
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashedPassword
        }
    })

    if (!user)
      return res.status(400).json({ message: "Unable to create user" });

    const token = jwt.sign({
        id: user.id
    },
        process.env.JWT_SECRET, {
        expiresIn: '10d'
    })

    res.cookie("token", token, cookieOptions)

    res.status(201).json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        }
    })  
})


const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email) return res.status(401).json({
        message: "email is required"
    })

    const user = await prisma.user.findUnique({
        where: {email}
    })

    if (!user) return res.status(400).json({ message: "User not found" })
    
    const isMatch = await bcrypt.compare(password, user.password)
    
    if (!isMatch) return res.status(400).json({
        message: "Invalid credentials"
    })

    const token = jwt.sign(
        {
            id: user.id
        },
        process.env.JWT_SECRET,
        { expiresIn: '10d'}
    )

    res.cookie("token", token, cookieOptions)

    res.status(201).json({
        user: {id: user.id, email: user.email, name: user.name}
    })
})



export {
    register, login
}