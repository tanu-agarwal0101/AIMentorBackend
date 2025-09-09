import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler.js";

const prisma = new PrismaClient()

const getProfile = asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {id: true, name: true, email: true},
    })

    if (!user) return res.status(404).json({ error: "User not found" })
    
    res.status(200).json(user)
})


const updateProfile = asyncHandler(async (req, res) => {
    const { name, email } = req.body;

    if(!email && !name) return res.status(401).json({error: "One of the two is required"})
    const updated = await prisma.user.update({
        where: { id: req.user.id },
        data:{name, email}
    })

    if (!updated) return res.status(500).json({ error: "failed to update user profile" })
    
    res.status(201).json(updated)
})


export {
    getProfile, updateProfile
}