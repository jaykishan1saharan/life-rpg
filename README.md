# 🎮 Life RPG

> **Turn your real-life goals into quests, earn XP, level up, and build better habits.**

Life RPG is a full-stack web application that transforms everyday activities and personal goals into an RPG-style experience. Users can create and complete quests, earn XP and gold, increase their character attributes, maintain streaks, unlock levels, and spend earned gold on rewards.

The project combines a modern **Next.js frontend**, **NestJS backend**, **PostgreSQL database**, and **Firebase Authentication** to provide a simple but engaging productivity experience.

---

## ✨ Features

### 🧙 Character System

* Create and maintain an RPG-style character
* Track character level and total XP
* Track four core attributes:

  * 💪 Strength
  * 🧠 Intellect
  * 🎯 Discipline
  * 🎨 Creativity
* Track current and longest activity streaks
* Earn gold through completed quests

### ⚔️ Quest System

* Create personal quests
* Add quest title and description
* Select a category
* Select difficulty:

  * Easy
  * Medium
  * Hard
  * Epic
* Assign an attribute to each quest
* Complete quests and receive rewards
* Prevent repeated completion of the same quest within the daily flow

### ⭐ XP & Leveling

The RPG engine calculates level progression from accumulated XP.

| Difficulty |  XP | Gold |
| ---------- | --: | ---: |
| Easy       |  25 |    5 |
| Medium     |  50 |   10 |
| Hard       | 100 |   20 |
| Epic       | 200 |   40 |

The XP requirement is calculated using:

```text
XP Required = floor(100 × level^1.5)
```

When enough XP is earned, the character automatically levels up.

### 🪙 Rewards & Shop

Users can spend earned gold on unlockable rewards such as:

* Neon Aura
* Cyber Knight
* XP Hunter
* Legendary Crown
* Void Walker

Rewards can belong to different types:

* `ITEM`
* `THEME`
* `BADGE`

### 🎒 Inventory

Purchased rewards are stored in the user's inventory and can be viewed through the inventory section.

### 🔐 Authentication

The application uses **Firebase Authentication**.

Authenticated requests use a Firebase ID token which is verified by the NestJS backend before protected API operations are performed.

---

# 🏗️ Tech Stack

## Frontend

* **Next.js 16**
* **React 19**
* **TypeScript**
* **Tailwind CSS**
* **Framer Motion**
* **Firebase Authentication**

## Backend

* **NestJS 12**
* **TypeScript**
* **PostgreSQL**
* **Firebase Admin SDK**
* **REST API**
* **Vitest**
* **Oxlint**

## Database

PostgreSQL stores:

* Users
* Characters
* Quests
* Quest completions
* Activity logs
* Shop items
* Inventory

---

# 📁 Project Structure

```text
life-rpg-main/
│
├── frontend/
│   ├── app/
│   │   ├── character/
│   │   ├── dashboard/
│   │   ├── inventory/
│   │   ├── login/
│   │   ├── quests/
│   │   ├── register/
│   │   └── shop/
│   │
│   └── src/
│       ├── components/
│       ├── lib/
│       └── services/
│
├── backend/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_rewards.sql
│   │
│   └── src/
│       ├── auth/
│       ├── characters/
│       ├── database/
│       ├── quests/
│       ├── rewards/
│       ├── rpg/
│       └── users/
│
└── README.md
```

---

# 🔄 How It Works

```text
User
  │
  ▼
Firebase Authentication
  │
  ▼
Next.js Frontend
  │
  │ Firebase ID Token
  ▼
NestJS REST API
  │
  ├── Authentication
  ├── Users
  ├── Characters
  ├── Quests
  ├── RPG Engine
  └── Rewards
  │
  ▼
PostgreSQL Database
```

### Basic user flow

```text
Register / Login
       ↓
Create Character
       ↓
Create or View Quests
       ↓
Complete Quest
       ↓
Earn XP + Gold + Attribute Points
       ↓
Level Up
       ↓
Spend Gold in Shop
       ↓
Unlock Rewards
       ↓
Track Progress & Streaks
```

---

# 🚀 Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/life-rpg.git
cd life-rpg
```

---

# 🔥 Firebase Setup

Create a Firebase project from:

https://console.firebase.google.com/

Enable **Firebase Authentication** and configure the required authentication provider.

The frontend requires Firebase configuration.

Create the appropriate frontend environment file according to the Firebase configuration used by the project.

The backend also requires Firebase Admin credentials.

---

# 🗄️ Database Setup

The backend uses PostgreSQL.

Create a PostgreSQL database and run the migrations in order:

```text
backend/migrations/001_initial_schema.sql
backend/migrations/002_rewards.sql
```

The first migration creates the main database schema.

The second migration inserts the default shop rewards.

---

# ⚙️ Backend Configuration

Inside the `backend` directory, create a `.env` file.

Use `.env.example` as the reference:

```env
PORT=4000

DATABASE_URL=your_postgresql_connection_string

FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY=your_firebase_private_key
```

Install dependencies:

```bash
cd backend
npm install
```

Start the development server:

```bash
npm run start:dev
```

The backend runs on:

```text
http://localhost:4000
```

---

# 💻 Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Configure the API URL used by the frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 🧪 Testing

### Backend tests

```bash
cd backend
npm test
```

### Backend test coverage

```bash
npm run test:cov
```

### End-to-end tests

```bash
npm run test:e2e
```

### Frontend lint

```bash
cd frontend
npm run lint
```

---

# 🔌 API Overview

The backend provides protected REST endpoints for the main application functionality.

### Users

```http
GET /users/me
```

Returns the authenticated user's profile and character information.

### Quests

```http
GET /quests
POST /quests
GET /quests/:id
PATCH /quests/:id
DELETE /quests/:id
POST /quests/:id/complete
```

### Rewards

```http
GET /rewards
POST /rewards/:id/purchase
```

### Inventory

```http
GET /inventory
```

Protected endpoints require a valid Firebase authentication token.

---

# 🗃️ Database Design

The PostgreSQL database contains the following major tables:

### `users`

Stores application user information and Firebase UID.

### `characters`

Stores RPG progression including:

* Level
* XP
* Gold
* Strength
* Intellect
* Discipline
* Creativity
* Current streak
* Longest streak

### `quests`

Stores user-created quests and their rewards.

### `quest_completions`

Stores completed quests and the rewards earned from them.

### `activity_logs`

Stores user activity and XP/gold changes.

### `shop_items`

Stores available rewards in the shop.

### `inventory`

Stores rewards purchased by users.

---

# 🧠 RPG Logic

The RPG engine is implemented in the backend.

### Level calculation

```text
Level XP = floor(100 × level^1.5)
```

For example, the system progressively increases the XP required for higher levels.

### Quest rewards

Quest difficulty determines the default reward:

```text
EASY    → 25 XP + 5 Gold
MEDIUM  → 50 XP + 10 Gold
HARD    → 100 XP + 20 Gold
EPIC    → 200 XP + 40 Gold
```

Completing a quest can also increase the selected character attribute.

---

# 👥 Team Contributions

This project was developed collaboratively by two team members.

## 👨‍💻 Manish Shinde

**GitHub:** [@manishshinde](https://github.com/manishshinde)

### Contributions

* Project planning and overall application architecture
* Frontend application development
* Next.js page structure and navigation
* Dashboard implementation
* Quest creation and completion interface
* Character/progression interface
* Login and registration flow integration
* Firebase Authentication integration on the frontend
* API service integration between frontend and backend
* Responsive UI and user experience
* RPG dashboard interactions and animations
* Frontend testing and debugging
* Overall project integration

---

## 👨‍💻 Jaykishan Saharan

**GitHub:** [@jaykishan1saharan](https://github.com/jaykishan1saharan)

### Contributions

* Backend application architecture
* NestJS REST API development
* PostgreSQL database design
* Database migrations and schema implementation
* Firebase Admin authentication and authorization
* User and character backend services
* Quest CRUD APIs
* Quest completion and reward processing
* RPG engine and XP/level calculation
* Gold and attribute reward logic
* Shop/reward backend functionality
* Inventory management
* Backend validation and error handling
* API testing and backend debugging

---

# 🤝 Collaboration

The project was developed as a collaborative full-stack application where both members contributed to different layers of the system.

```text
                 LIFE RPG
                    │
        ┌───────────┴───────────┐
        │                       │
   MANISH SHINDE          JAYKISHAN SAHARAN
        │                       │
   Frontend / UI            Backend / API
        │                       │
   Next.js                  NestJS
   React                    PostgreSQL
   Firebase Client          Firebase Admin
   UI/UX                     RPG Engine
   API Integration           Rewards
        │                       │
        └───────────┬───────────┘
                    │
             Full-Stack System
```

---

# 🔒 Security

* Firebase Authentication is used for user authentication.
* Protected backend routes require authentication.
* Firebase ID tokens are verified by the backend.
* User-specific database operations are associated with the authenticated user.
* Environment variables are used for sensitive configuration.
* Database credentials and Firebase private keys should never be committed to GitHub.

---

# 📌 Future Improvements

Possible future enhancements include:

* Daily quest recommendations
* Achievement system
* Leaderboards
* More character customization
* Advanced statistics and progress charts
* Habit tracking
* Quest reminders and notifications
* Social challenges
* Additional reward categories
* Mobile/PWA support
* AI-powered personalized quest recommendations

---

# 🎯 Project Goal

Life RPG aims to make personal productivity more engaging by combining **real-world goals with RPG mechanics**.

Instead of simply checking tasks off a list, users can:

> **Complete real-life tasks → Earn XP → Improve attributes → Level up → Earn gold → Unlock rewards.**

The goal is to encourage consistency, motivation, and personal growth through a simple gamified experience.

---

# 📄 License

This project is developed as an academic/project implementation.

All rights reserved to the project contributors unless otherwise specified.

---

# 👨‍💻 Contributors

### Manish Shinde

GitHub: [@manishshinde](https://github.com/manishshinde)

### Jaykishan Saharan

GitHub: [@jaykishan1saharan](https://github.com/jaykishan1saharan)

---

⭐ **If you like the project, consider giving it a star!**
