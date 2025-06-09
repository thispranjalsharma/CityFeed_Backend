# CityFeed App Backend

A Node.js backend application for the CityFeed platform, enabling merchants to create offers and users to redeem them.

## Tech Stack

- Node.js
- Express.js
- MongoDB (Mongoose)
- TypeScript
- Razorpay (for payments)
- Nodemailer (for email verification)
- Multer (for image uploads)

## Project Structure

```
src/
├── interfaces/     # TypeScript interfaces
├── models/        # Mongoose models
├── routes/        # API routes
├── controllers/   # Route controllers
├── services/      # Business logic
├── repositories/  # Database operations
├── utils/         # Utility functions
├── config/        # Configuration files
├── middlewares/   # Custom middlewares
├── app.ts         # Express app setup
└── server.ts      # Server entry point
```

## Features

- User and Merchant registration with email verification
- Offer creation and management
- Coin-based payment system
- Dine-in experience with tiered discounts
- Review system
- Admin dashboard

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/cityfeed
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRES_IN=7d
   NODE_ENV=development
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_email_app_password
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   UPLOAD_PATH=uploads
   MAX_FILE_SIZE=5242880
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## API Documentation

The API documentation will be available at `/api-docs` when the server is running.

## License

ISC 