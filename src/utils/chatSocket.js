import { getAIResponse } from "../services/aiService.js";
import { socketAsyncHandler } from "./asyncHandler.js";
import prisma from "./prisma.js";

export function registerChatHandlers(io, socket) {
  console.log("User connected:", socket.user.id);

  // socket.on(
  //   "sendMessage",
  //   socketAsyncHandler(async ({ message }) => {
  //     if (!message) return socket.emit("error", { error: "Message not found" });

  //     const response = await getAIResponse(message, socket.user.id);

  //     if (!response)
  //       return socket.emit("error", { error: "AI was unable to respond" });
  //     const chat = await prisma.chat.create({
  //       data: { userId: socket.user.id, message, response },
  //     });

  //     if (!chat) return socket.emit("error", { error: "Chat not created" });

  //     socket.emit("message_response", chat);
  //   })
  // );

  // socket.on(
  //   "history",
  //   socketAsyncHandler(async () => {
  //     const chats = await prisma.chat.findMany({
  //       where: { userId: socket.user.id },
  //       orderBy: { createdAt: "asc" },
  //     });

  //     if (!chats)
  //       return socket.emit("error", { error: "unable to fetch chats" });

  //     socket.emit("history_response", chats);
  //   })
  // );

  // socket.on(
  //   "clearHistory",
  //   socketAsyncHandler(async () => {
  //     await prisma.chat.deleteMany({
  //       where: { userId: socket.user.id },
  //     });
  //     console.log("Chats cleared for user");
  //     socket.emit("history_cleared", { success: true });
  //   })
  // );

  socket.on(
    "createConversation",
    socketAsyncHandler(async ({ title }) => {
      const conversation = await prisma.conversation.create({
        data: {
          userId: socket.user.id,
          title: title || "New Chat",
        },
        include: {
          chats: true,
        },
      });

      if (!conversation) {
        socket.emit("error", { error: "Unable to create conversation" });
      }
      console.log("convo created");
      socket.emit("conversation_created", conversation);
    })
  );

  socket.on(
    "getConversations",
    socketAsyncHandler(async () => {
      const conversations = await prisma.conversation.findMany({
        where: { userId: socket.user.id },
        orderBy: { updatedAt: "desc" },
      });

      if (!conversations) {
        socket.emit("error", { error: "Unable to get conversations" });
      }
      console.log("convo received");
      socket.emit("conversations_response", conversations);
    })
  );

  socket.on(
    "sendMessage",
    socketAsyncHandler(async ({ conversationId, message }) => {
      if (!message) return socket.emit("error", { error: "Message not found" });

      const response = await getAIResponse(message, conversationId);

      if (!response)
        return socket.emit("error", { error: "AI was unable to respond" });

      const chat = await prisma.chat.create({
        data: { conversationId, message, response },
      });

      if (!chat) return socket.emit("error", { error: "Chat not created" });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      console.log("chat created");

      socket.emit("message_response", chat);
    })
  );

  socket.on(
    "getHistory",
    socketAsyncHandler(async ({ conversationId }) => {
      const chats = await prisma.chat.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
      });

      if (!chats)
        return socket.emit("error", { error: "unable to fetch chats" });

      console.log("history rec");
      socket.emit("history_response", chats);
    })
  );

  socket.on(
    "clearHistory",
    socketAsyncHandler(async ({ conversationId }) => {
      await prisma.chat.deleteMany({
        where: { conversationId },
      });
      console.log("Chats cleared for user");
      socket.emit("history_cleared", { success: true, conversationId });
    })
  );

  socket.on(
    "deleteConversation",
    socketAsyncHandler(async ({ conversationId }) => {
      await prisma.chat.deleteMany({ where: { conversationId } });
      await prisma.conversation.delete({
        where: { id: conversationId },
      });
      console.log("convo deleted");
      socket.emit("conversation_deleted", { success: true, conversationId });
    })
  );

  socket.on("editConversation", socketAsyncHandler(async ({ conversationId, title }) => {
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {title}
    })

    socket.emit("conversation_updated", updated)
  }))
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
}
