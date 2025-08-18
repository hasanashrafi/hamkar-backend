# Hamkar Backend - Job Matching Platform

A comprehensive Node.js backend API for a job matching platform connecting developers and employers. Built with Express.js, MongoDB, and Mongoose, featuring JWT authentication, file uploads, and comprehensive Swagger documentation.

## 🚀 Features

- **User Management**: Developer and Employer registration, authentication, and profile management
- **Project Management**: Developers can create, update, and manage their portfolio projects
- **Job Requests**: Employers can send job requests to developers with interview scheduling
- **Advanced Search**: Filter developers by skills, location, experience, and salary expectations
- **Dashboard Analytics**: Comprehensive dashboards for both developers and employers
- **File Uploads**: Resume, profile picture, and company logo uploads with Multer
- **JWT Authentication**: Secure role-based access control
- **Swagger Documentation**: Complete API documentation with interactive testing
- **Docker Support**: Containerized deployment with MongoDB

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi schema validation
- **File Upload**: Multer
- **Documentation**: Swagger/OpenAPI 3.0
- **Security**: Helmet, CORS, Rate Limiting
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- Node.js 18+
- MongoDB 6.0+
- Docker & Docker Compose (optional)

## 🚀 Quick Start

### Option 1: Local Development

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd hamkar-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   # Copy environment file
   cp .env.example .env

   # Edit .env with your configuration
   NODE_ENV=development
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/hamkar
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   FILE_UPLOAD_PATH=./uploads
   MAX_FILE_SIZE=5242880
   ```

4. **Start MongoDB**

   ```bash
   # Start MongoDB service
   mongod

   # Or use MongoDB Atlas cloud service
   ```

5. **Run the application**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

6. **Access the API**
   - API Base URL: `http://localhost:3000/api`
   - Swagger Documentation: `http://localhost:3000/api-docs`
   - Health Check: `http://localhost:3000/api/health`

### Option 2: Docker Deployment

1. **Build and run with Docker Compose**

   ```bash
   docker-compose up --build
   ```

2. **Access the services**
   - API: `http://localhost:3000`
   - MongoDB: `mongodb://localhost:27017`
   - Mongo Express: `http://localhost:8081` (admin/admin)

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/developer/signup` - Developer registration
- `POST /api/auth/employer/signup` - Employer registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/logout` - User logout

### Developer Endpoints

- `GET /api/developers` - List all developers
- `GET /api/developers/:id` - Get developer by ID
- `GET /api/developers/profile` - Get current developer profile
- `PUT /api/developers/profile` - Update developer profile
- `PATCH /api/developers/profile/availability` - Toggle availability

### Employer Endpoints

- `GET /api/employers` - List all employers
- `GET /api/employers/:id` - Get employer by ID
- `GET /api/employers/profile` - Get current employer profile
- `PUT /api/employers/profile` - Update employer profile

### Project Endpoints

- `GET /api/projects` - List all public projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/developer/:developerId` - Get projects by developer

### Job Request Endpoints

- `GET /api/job-requests` - List job requests (filtered by user role)
- `GET /api/job-requests/:id` - Get job request by ID
- `POST /api/job-requests` - Create job request (Employer only)
- `PUT /api/job-requests/:id` - Update job request
- `PATCH /api/job-requests/:id/accept` - Accept job request
- `PATCH /api/job-requests/:id/reject` - Reject job request

### Search Endpoints

- `POST /api/search/developers` - Advanced developer search
- `GET /api/search/developers/quick` - Quick developer search
- `GET /api/search/skills` - Get all available skills
- `GET /api/search/cities` - Get all available cities
- `GET /api/search/statistics` - Get search statistics

### Dashboard Endpoints

- `GET /api/dashboard/developer` - Developer dashboard
- `GET /api/dashboard/employer` - Employer dashboard
- `GET /api/dashboard/admin` - Admin dashboard
- `GET /api/dashboard/analytics` - Analytics data

### File Upload Endpoints

- `POST /api/upload/resume` - Upload developer resume
- `POST /api/upload/profile-picture` - Upload profile picture
- `POST /api/upload/company-logo` - Upload company logo
- `POST /api/upload/project-image` - Upload project image
- `POST /api/upload/multiple` - Upload multiple files
- `GET /api/upload/files` - List user files
- `DELETE /api/upload/files/:filename` - Delete file

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles

- **Developer**: Can manage projects, accept/reject job requests
- **Employer**: Can send job requests, manage company profile
- **Admin**: Full access to all endpoints

## 📁 Project Structure

```
hamkar-backend/
├── models/              # Mongoose schemas
│   ├── Developer.js
│   ├── Employer.js
│   ├── Project.js
│   └── JobRequest.js
├── routes/              # API route handlers
│   ├── auth.js
│   ├── developers.js
│   ├── employers.js
│   ├── projects.js
│   ├── jobRequests.js
│   ├── search.js
│   ├── dashboard.js
│   └── upload.js
├── middlewares/         # Custom middleware
│   ├── auth.js
│   ├── validation.js
│   └── errorHandler.js
├── uploads/             # File uploads directory
├── server.js            # Main application file
├── package.json         # Dependencies
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker services
└── README.md            # This file
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🐳 Docker Commands

```bash
# Build and start services
docker-compose up --build

# Start services in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f app

# Access MongoDB shell
docker-compose exec mongo mongosh -u admin -p password123

# Access application container
docker-compose exec app sh
```

## 🔧 Environment Variables

| Variable           | Description                | Default                            |
| ------------------ | -------------------------- | ---------------------------------- |
| `NODE_ENV`         | Environment mode           | `development`                      |
| `PORT`             | Server port                | `3000`                             |
| `MONGODB_URI`      | MongoDB connection string  | `mongodb://localhost:27017/hamkar` |
| `JWT_SECRET`       | JWT signing secret         | Required                           |
| `JWT_EXPIRES_IN`   | JWT expiration time        | `7d`                               |
| `FILE_UPLOAD_PATH` | File upload directory      | `./uploads`                        |
| `MAX_FILE_SIZE`    | Maximum file size in bytes | `5242880` (5MB)                    |

## 📊 Database Schema

### Developer

- Basic info: name, email, phone, city
- Professional: skills, experience, portfolio URLs
- Files: resume, profile picture
- Projects: array of project references

### Employer

- Company info: name, description, industry
- Contact: email, phone, city, website
- Files: company logo

### Project

- Details: title, description, tech stack
- Links: demo, GitHub, image
- Ownership: developer reference

### Job Request

- Job details: title, description, salary
- Status: pending, accepted, rejected, withdrawn
- Interview: date, location, notes

## 🚀 Deployment

### Production Considerations

1. **Environment Variables**: Set secure JWT secrets and MongoDB credentials
2. **HTTPS**: Use reverse proxy (Nginx) with SSL certificates
3. **Monitoring**: Implement logging and monitoring solutions
4. **Backup**: Regular MongoDB backups
5. **Security**: Firewall rules, rate limiting, input validation

### Scaling

- **Horizontal Scaling**: Multiple Node.js instances behind load balancer
- **Database**: MongoDB replica sets for read scaling
- **Caching**: Redis for session storage and caching
- **CDN**: For static file delivery

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the Swagger documentation at `/api-docs`
- Review the API health endpoint at `/api/health`

## 🔄 Changelog

### v1.0.0

- Initial release
- Complete CRUD operations for all entities
- JWT authentication system
- File upload functionality
- Advanced search and filtering
- Dashboard analytics
- Swagger documentation
- Docker support
