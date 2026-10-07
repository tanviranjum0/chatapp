import mongoose from "mongoose";
import { io, userRoom } from "../lib/socket.js";
import { isValidImageDataUri, uploadImage } from "../lib/image.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const MESSAGE_PAGE_SIZE = 300;

export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } })
      .select("-password")
      .sort({ fullName: 1 })
      .lean();

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getAllContacts:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    if (!mongoose.isValidObjectId(userToChatId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    // newest page first (uses the compound indexes), then flip back to chronological order
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(MESSAGE_PAGE_SIZE)
      .lean();

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error("Error in getMessages controller: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    if (!mongoose.isValidObjectId(receiverId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    if (text !== undefined && typeof text !== "string") {
      return res.status(400).json({ message: "Invalid message text." });
    }
    if (!text?.trim() && !image) {
      return res.status(400).json({ message: "Text or image is required." });
    }
    if (text && text.length > 2000) {
      return res.status(400).json({ message: "Message is too long (max 2000 characters)." });
    }
    if (image && !isValidImageDataUri(image)) {
      return res.status(400).json({ message: "Invalid or too large image." });
    }
    if (senderId.equals(receiverId)) {
      return res.status(400).json({ message: "Cannot send messages to yourself." });
    }
    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found." });
    }

    const imageUrl = image
      ? await uploadImage(image, {
          folder: "chatapp/messages",
          transformation: [{ width: 1600, height: 1600, crop: "limit" }],
        })
      : undefined;

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    // every tab/device of the receiver is in this room
    io.to(userRoom(receiverId)).emit("newMessage", newMessage);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage controller: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    // distinct() is answered straight from the indexes - no need to load every message
    const [sentTo, receivedFrom] = await Promise.all([
      Message.distinct("receiverId", { senderId: loggedInUserId }),
      Message.distinct("senderId", { receiverId: loggedInUserId }),
    ]);

    const chatPartnerIds = [...new Set([...sentTo, ...receivedFrom].map(String))];

    const chatPartners = await User.find({ _id: { $in: chatPartnerIds } })
      .select("-password")
      .lean();

    res.status(200).json(chatPartners);
  } catch (error) {
    console.error("Error in getChatPartners: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
