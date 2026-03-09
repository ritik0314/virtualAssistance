# Project Overview
This project is a virtual assistant application designed to help users manage their tasks and streamline daily activities effortlessly.

## Features
- User authentication and authorization
- Task management
- Real-time notifications
- API integration for weather and news updates

## Tech Stack
- **Frontend:** Vite, React
- **Backend:** Node.js, Express
- **Database:** MongoDB
- **Cloud Storage:** Cloudinary

## Architecture
- The application follows a microservices architecture with separate services for the frontend and backend, allowing for scalability and independent deployment.

## API Routes
- **/api/auth**: Handles user authentication and authorization.
- **/api/user**: Manages user data and profiles.

## Setup Steps
### Frontend (Vite React)
1. Clone the repository.
2. Navigate to the frontend directory: `cd frontend`
3. Install dependencies: `npm install`
4. Run the development server: `npm run dev`

### Backend (Express/MongoDB)
1. Clone the repository.
2. Navigate to the backend directory: `cd backend`
3. Install dependencies: `npm install`
4. Set up your environment variables in a `.env` file.
5. Run the development server: `npm run dev`

## Environment Variables
- **MONGODB_URL**: MongoDB connection string.
- **JWT_SECRET**: Secret key for JWT authentication.
- **GEMINI_API_URL**: URL for Gemini API.
- **Cloudinary keys**: Keys for Cloudinary integration.

## Deployment Notes
- Ensure that the environment variables are set correctly in the production environment.
- Use a process manager like PM2 for managing the backend application.
- Deploy the frontend build folder to a static site hosting service (e.g., Vercel, Netlify).