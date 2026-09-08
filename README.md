# 💬 ChatApp - Real-Time MERN Chat Application

A modern **real-time chat application** built using the **MERN Stack** with **Socket.IO**.  
Users can register, login, update their profile, send real-time messages, share images/files, see online/offline status, typing indicators, and manage conversations.

---

## 🚀 Live Demo

🔗 **Live Application:** https://chat-app-2-0.vercel.app/

🔗 **Backend API:** https://chatapp-2-0-nds3.onrender.com/

---

## 📸 Preview

![ChatApp Preview](./frontend/public/chatapp-preview.png)

> Add your project screenshot as `chatapp-preview.png` inside the `frontend/public` folder.

---

## ✨ Features

### 🔐 Authentication
- User Registration
- User Login
- Secure JWT Authentication
- HTTP-only Cookie Authentication
- Logout
- Protected Routes
- Persistent Login Session

### 💬 Real-Time Messaging
- One-to-one messaging
- Real-time message delivery
- Socket.IO integration
- Message history
- Read/unread messages
- Message timestamps

### 📎 File & Media Sharing
- Send text messages
- Upload images
- Upload files
- PDF support
- TXT support
- ZIP/RAR support
- File size validation
- Cloudinary media storage

### 👤 User Profile
- Update profile
- Change profile picture
- Update bio
- Change password
- Online/offline status
- Last seen

### ⚡ Real-Time Features
- Online status
- Offline status
- Last seen
- Typing indicator
- Stop typing indicator
- Message read status
- Multiple socket connection handling

### 🎨 UI/UX
- Responsive design
- Mobile-friendly interface
- Dark/Light theme
- Modern chat interface
- Responsive sidebar
- Profile modal
- Loading states
- Error handling

---

## 🛠️ Tech Stack

### Frontend

- React.js
- Vite
- Tailwind CSS
- Axios
- React Router DOM
- Socket.IO Client
- JavaScript (ES6+)

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- JWT
- bcryptjs
- Cookie Parser
- Multer
- Cloudinary
- CORS
- dotenv

### Deployment

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** MongoDB Atlas
- **Media Storage:** Cloudinary

---

## 📁 Project Structure

```text
ChatApp/
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       ├── services/
│       ├── App.jsx
│       └── main.jsx
│
├── backend/
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── conversationController.js
│   │   └── messageController.js
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── uploadMiddleware.js
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Conversation.js
│   │   └── Message.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── conversationRoutes.js
│   │   └── messageRoutes.js
│   │
│   ├── socket/
│   │   └── socket.js
│   │
│   ├── index.js
│   ├── package.json
│   └── .env
│
└── README.md
