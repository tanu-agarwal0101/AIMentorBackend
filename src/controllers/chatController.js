import { PrismaClient } from "@prisma/client";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getAIResponse } from "../services/aiService.js";

const prisma = new PrismaClient


const sendMessage = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { message } = req.body;
    if (!message) {return res.status(400).json({ error: "Message not found" })}
    
    const response = await getAIResponse(message)

    const chat = await prisma.chat.create({
        data: {
            userId, message, response
        }
    })

    if(!chat) res.status(400).json({error: "Error creating chat"})

    res.status(201).json(chat)
})

const getChatHistory = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const chats = await prisma.chat.findMany({
        where: { userId },
        orderBy: {createdAt: "asc"}
    })
    if (!chats) return res.status(400).json({ error: "Unable to fetch Chats" })
    
    res.status(200).json(chats)
})




const createConvo = asyncHandler(async(req, res)=> {
    const userId = req.user.id;
    
})
export {
    sendMessage, getChatHistory
}