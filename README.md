# 🧠 StackIt – Minimal Q&A Platform for Collaborative Learning

**StackIt** is a lightweight question-and-answer platform designed to encourage structured knowledge sharing and collaborative learning. It’s simple, clean, and focused on the core experience of asking and answering questions within a community.

---

## 🚀 Features

### 👥 Role-Based Access

| Role   | Permissions                                                                 |
|--------|------------------------------------------------------------------------------|
| Guest  | View all questions and answers                                               |
| User   | Register, log in, post questions/answers, upvote/downvote                   |
| Admin  | Moderate content, manage users, broadcast updates, export reports           |

---

### 📌 Core Functionality

#### ✅ Ask a Question  
- **Title** – Short and descriptive  
- **Description** – Written using a **rich text editor**  
- **Tags** – Multi-select input (e.g., `React`, `JWT`)

#### ✅ Rich Text Editor  
Supports:  
- Formatting: **Bold**, *Italic*, ~~Strikethrough~~  
- Lists: Numbered, Bullet points  
- 🔗 Hyperlinks  
- 😀 Emojis  
- 📷 Image Uploads  
- Text alignment: Left, Center, Right

#### ✅ Answering Questions  
- Only logged-in users can post answers  
- Answers use the same rich text editor  

#### ✅ Voting & Accepted Answers  
- Users can upvote/downvote answers  
- Question owners can mark one answer as accepted  

#### ✅ Tagging  
- Questions require relevant tags for better filtering  

#### ✅ Notification System  
- 🔔 Bell icon in navbar  
- Users notified when:
  - Someone answers their question  
  - Someone comments on their answer  
  - They’re mentioned via `@username`  
- Unread count + dropdown menu for recent notifications

---

## 🛠️ Admin Features

- Reject inappropriate/spam content  
- Ban users violating policies  
- Monitor pending, accepted, or cancelled swaps  
- Send global messages (feature updates, maintenance alerts)  
- Download reports:
  - User activity  
  - Feedback logs  
  - Swap stats  

---

## 📐 Mockup

[🔗 View UI Mockup](https://link.excalidraw.com/l/65VNwvy7c4X/8bM86GXnnUN)

---

## 🧰 Tech Stack

| Layer        | Technology         |
|--------------|--------------------|
| Backend      | FastAPI            |
| Database     | MongoDB            |
| Validation   | Pydantic           |
| Frontend     | Next.js            |
| Styling      | Heroui (Tailwind)  |
| Deployment   | Heroku (or similar)|

---

## 📄 License

MIT License. Fork it, build on it, or make it yours.

---

## 👨‍💻 Contributing

Open issues, submit PRs, or just shoot your shot. Contributions welcome.
