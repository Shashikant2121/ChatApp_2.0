import api from "./api";

export const getMessages = async (conversationId) => {
  const response = await api.get(`/messages/${conversationId}`);

  return response.data;
};

export const sendMessage = async (
  receiverId,
  text,
  messageType = "text",
  mediaUrl = "",
  fileName = "",
  fileSize = 0,
  mimeType = "",
) => {
  const response = await api.post("/messages", {
    receiverId,
    text,
    messageType,
    mediaUrl,
    fileName,
    fileSize,
    mimeType,
  });

  return response.data;
};

export const uploadMessageMedia = async (file) => {
  const formData = new FormData();

  formData.append("file", file);

  const response = await api.post("/messages/upload", formData);

  return response.data;
};

export const markMessagesAsRead = async (conversationId) => {
  const response = await api.patch(`/messages/${conversationId}/read`);

  return response.data;
};
