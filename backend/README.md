# DevOps Lab Platform - Backend API

Node.js + Fastify backend for the DevOps Lab Platform.

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL` - PostgreSQL connection string (use Neon for managed service)
- `JWT_SECRET` - Secret key for JWT tokens (generate: `openssl rand -base64 32`)
- `AWS_ACCOUNT_ID` - Your AWS account ID (for STS AssumeRole)
- `PLATFORM_ACCOUNT_ID` - Platform's AWS account ID
- `PORT` - Server port (default: 3001)
- `CORS_ORIGIN` - Frontend URL (default: http://localhost:3000)

### 3. Set Up PostgreSQL

**Option A: Using Neon (Recommended)**
1. Go to [neon.tech](https://neon.tech)
2. Create a free project
3. Copy the connection string to `DATABASE_URL` in `.env`

**Option B: Local PostgreSQL**
```bash
# macOS with Homebrew
brew install postgresql
brew services start postgresql

# Linux
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start

# Windows
# Download from https://www.postgresql.org/download/windows/
```

Create database:
```sql
CREATE DATABASE devops_lab;
```

### 4. Run in Development

```bash
npm run dev
```

Server starts on `http://localhost:3001`

### 5. API Endpoints (Week 1-2)

#### Authentication

**Register**
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

**Login**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Get Current User**
```bash
curl -X GET http://localhost:3001/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### AWS Integration

**Initiate Integration**
```bash
curl -X POST http://localhost:3001/aws/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role_arn": "arn:aws:iam::123456789012:role/DevopsLabRole",
    "region": "ap-south-1"
  }'
```

Returns: External ID and trust policy JSON

**Verify Integration**
```bash
curl -X POST http://localhost:3001/aws/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "integration_id": "uuid-here",
    "role_arn": "arn:aws:iam::123456789012:role/DevopsLabRole",
    "external_id": "uuid-here"
  }'
```

#### Lab Catalog

**List Labs**
```bash
curl http://localhost:3001/labs
```

**Get Lab by Slug**
```bash
curl http://localhost:3001/labs/docker-deployment-101
```

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main Fastify server
│   ├── api/
│   │   └── routes/
│   │       ├── auth.ts       # Auth endpoints
│   │       ├── aws.ts        # AWS integration endpoints
│   │       └── labs.ts       # Lab catalog endpoints
│   ├── auth/
│   │   └── user.ts           # User management utilities
│   ├── aws/
│   │   └── integration.ts    # AWS STS integration
│   ├── db/
│   │   ├── connection.ts     # PostgreSQL pool
│   │   └── schema.ts         # Database schema initialization
│   └── types/
│       └── index.ts          # TypeScript interfaces
├── package.json
├── tsconfig.json
└── .env.example
```

## Next Steps (Week 3-4)

1. Cloudflare Pages + Durable Objects setup
2. Connect frontend to backend API
3. R2 bucket configuration for lab definitions

## Deployment (Azure)

See main project README for Azure App Service deployment steps.

## Troubleshooting

**JWT verification fails**
- Ensure JWT_SECRET matches between auth.ts and your .env

**Database connection fails**
- Verify DATABASE_URL syntax
- Check PostgreSQL service is running
- For Neon: verify firewall allows connections

**AWS STS AssumeRole fails**
- Verify AWS credentials in environment
- Check role ARN format: `arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME`
- Ensure ExternalId matches between trust policy and call

## Development Commands

```bash
npm run dev        # Start dev server with hot reload
npm run build      # Compile TypeScript to dist/
npm start          # Run compiled code
npm run migrate    # Run database migrations
npm run typecheck  # Check TypeScript without emitting
npm run lint       # Run ESLint
```
