# CityFeed  Backend

A Node.js backend application for the CityFeed Club platform, enabling merchants to create offers and users to redeem them. This project is built with scalability, security, and maintainability in mind.

---

## Tech Stack

- Node.js
- Express.js
- MongoDB (Mongoose)
- TypeScript
- Razorpay (for payments)
- Nodemailer (for email verification)
- Multer (for image uploads)
- Cloudinary (for media storage)
- Swagger (API documentation)
- Winston (logging)

---

## Project Structure

```
src/
├── @types/           # Custom type definitions
├── config/           # Configuration files
├── controllers/      # Route controllers
├── interfaces/       # TypeScript interfaces
├── middleware/       # Custom middlewares
├── models/           # Mongoose models
├── repositories/     # Database operations
├── routes/           # API routes
├── scripts/          # Utility and test scripts
├── services/         # Business logic
├── types/            # Additional type definitions
├── utils/            # Utility functions
├── app.ts            # Express app setup
├── config.ts         # App-wide config
└── server.ts         # Server entry point
```

---

## Features

- User, Super Admin, and Outlet Admin registration with email verification
- Offer creation and management
- Coin-based payment system
- Dine-in experience with tiered discounts
- Review and feedback system
- Admin dashboard
- Secure authentication and authorization (JWT)
- Role-based access control
- File uploads and media management
- Payment integration (Razorpay)
- API documentation (Swagger)

---

## Getting Started

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Create a `.env` file** (see `.env.example` for all required variables):
   ```
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   BASE_URL=http://localhost:3000
   FRONTEND_URL=http://localhost:5173
   
   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/cityfeed
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=1d
   
   # CORS Configuration
   CORS_ORIGIN=*
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # Email Configuration (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_email_app_password
   SMTP_FROM=your_email@gmail.com
   
   # Razorpay Configuration
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   
   # File Uploads
   UPLOAD_PATH=uploads
   MAX_FILE_SIZE=5242880
   
   # Coin Rewards Configuration (Optional)
   REGISTRATION_COINS_CITYFEED_SELECT=500
   REGISTRATION_COINS_CITYFEED_EDGE=750
   REGISTRATION_COINS_CITYFEED_PRIME=1000
   ```
4. **Build the project:**
   ```bash
   npm run build
   ```
5. **Start the development server:**
   ```bash
   npm run dev
   ```

---

## API Documentation

- The API documentation is available at [`/api-docs`](http://localhost:3000/api-docs) when the server is running.
- Swagger UI provides interactive documentation and testing for all endpoints.

---

## Testing

- **Automated tests:** (To be implemented)
- For now, you can use the `test-email` script to verify email configuration:
  ```bash
  npm run test-email
  ```
- Add your tests in a `/tests` directory and use Jest or Mocha for coverage.

---

## Deployment

- The project includes a `Procfile` and `render.yaml` for deployment on platforms like Render.
- Ensure all environment variables are set in your deployment environment.
- For production, set `NODE_ENV=production` and use secure secrets.

---

## Contribution

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Create a new Pull Request

---

## Security

- Never commit sensitive information to the repository.
- Always use strong, unique secrets for JWT, database, and third-party services.
- Restrict CORS in production to trusted domains.
- Sanitize and validate all user input.

---

## TODOs & Known Issues

- Add automated tests for all modules
- Complete TODOs in code (see comments in source files)
- Improve error messages and logging
- Add pagination and caching for large datasets
- Track and address all in-code TODOs via issues

---

## License

ISC 