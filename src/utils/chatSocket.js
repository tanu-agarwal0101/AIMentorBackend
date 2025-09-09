import { getAIResponse } from "../services/aiService.js";
import { asyncHandler } from "./asyncHandler.js";
import { PrismaClient } from "@prisma/client";



export function registerChatHandlers(io, socket) {
    console.log("User connected:", socket.user.id);
    const prisma = new PrismaClient();

    socket.on("sendMessage", asyncHandler(async ({ message }) => {
        if (!message) return socket.emit("error", { error: "Message not found" })
        
        const response = await getAIResponse(message, socket.user.id)

        if(!response) return socket.emit("error", {error: "AI was unable to respond"})
        const chat = await prisma.chat.create({
          data: { userId: socket.user.id, message, response },
        });

        if(!chat) return socket.emit("error", { error: "Chat not created" });
         
        socket.emit("message_response", chat)


    }))

    socket.on("history", asyncHandler(async () => {
        const chats = await prisma.chat.findMany({
          where: { userId: socket.user.id },
          orderBy: { createdAt: "asc" },
        });

        if (!chats) return socket.emit("error", { error: "unable to fetch chats" })
        
        socket.emit("history_response", chats)
    }))

  
  socket.on("clearHistory", asyncHandler(async () => {
    await prisma.chat.deleteMany({
      where: {userId: socket.user.id}
    })
    console.log("Chats cleared for user")
    socket.emit("history_cleared", {success: true})
  }))
  
  
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    })
}


