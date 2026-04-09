# FoodHub Backend

FoodHub Backend is the REST API server for the FoodHub platform. It provides authentication, user management, meal catalog, provider workflows, order processing, category management, admin controls, cloudinary image handling, and all backend business logic.

## Live Links
🔗 [Backend API](https://foodhub-server-seven.vercel.app)

🔗 [Frontend](https://foodhub-seven-navy.vercel.app)

🔗 [Frontend Repository](https://github.com/marziulrafi/FoodHub)

## Features
- Email/password authentication via `better-auth`
- JWT + session cookie management
- Role-based users: `CUSTOMER`, `PROVIDER`, `ADMIN`
- Provider registration + approval flow
- Meal CRUD for providers
- Orders creation and tracking
- Category management
- Admin approval and provider review
- Cloudinary integration for image upload
- Error handling and request validation
- CORS support for frontend domain

## Tech Stack
- Node.js
- TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- Better Auth
- Cloudinary
- CORS
- Zod validation
- bcryptjs
- tsx / tsup

## Project Structure
```
src/
├── config/
│   ├── auth.ts - Better Auth setup with roles and trusted origins
│   ├── cloudinary.ts - Cloudinary configuration
│   └── prisma.ts - Prisma client
├── modules/
│   ├── auth/ - Authentication routes, controller, service
│   ├── meals/ - Meal CRUD endpoints
│   ├── orders/ - Order creation and tracking
│   ├── providers/ - Provider management
│   ├── categories/ - Category management
│   ├── users/ - User profiles
│   ├── admin/ - Admin-only endpoints
│   ├── reviews/ - Review management
│   ├── cloudinary/ - Image upload service
│   └── images/ - Image metadata handling
├── middleware/
│   ├── auth.middleware.ts - JWT and role verification
│   ├── validate.middleware.ts - Zod request validation
│   └── error.middleware.ts - Global error handler
└── prisma/
    ├── schema.prisma - Database schema
    └── seed.ts - Admin user seed script
```

## API Key Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user

### Meals
- `GET /api/v1/meals` - Get all meals (paginated)
- `GET /api/v1/meals/:id` - Get meal details
- `POST /api/v1/meals` - Create meal (provider only)
- `PATCH /api/v1/meals/:id` - Update meal (provider only)
- `DELETE /api/v1/meals/:id` - Delete meal (provider only)

### Orders
- `GET /api/v1/orders` - Get user's orders
- `POST /api/v1/orders` - Create new order
- `GET /api/v1/orders/:id` - Get order details
- `PATCH /api/v1/orders/:id` - Update order status

### Providers
- `GET /api/v1/providers` - List all providers
- `GET /api/v1/providers/:id` - Get provider details

### Categories
- `GET /api/v1/categories` - Get all categories
- `POST /api/v1/admin/categories` - Create category (admin only)

### Image Upload
- `POST /api/v1/cloudinary/upload` - Upload image to Cloudinary

## Deployment
- Deployed on Vercel as the backend service