# OpenNotes Discord Bot

A powerful Discord bot that brings Community Notes functionality to Discord servers, allowing users to request and contribute contextual notes on messages to combat misinformation and provide helpful context.

## 🌟 Features

- **Context Menu Integration**: Right-click any message to request a community note
- **User Verification System**: Multiple verification methods (email, phone, OAuth)
- **Note Creation & Rating**: Rich text editor for creating notes with source citations
- **Helpfulness Scoring**: Advanced matrix factorization algorithm for scoring note quality
- **Real-time Dashboard**: Web interface for contributors to manage note requests
- **Rate Limiting**: Prevent spam with configurable rate limits
- **Admin Controls**: Server-specific configuration and moderation tools
- **Notification System**: Real-time alerts via Discord DMs and channels
- **Analytics**: Track conversion rates, engagement, and performance metrics

## 🏗️ Architecture

The bot is built with a modern, scalable architecture:

- **Discord Bot**: Discord.js v14 for bot interactions
- **Backend API**: Express.js REST API with Socket.IO for real-time updates
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis for performance optimization
- **Message Queue**: NATS JetStream for event streaming
- **Frontend Dashboard**: React with Vite and TailwindCSS
- **Language**: TypeScript for type safety

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14 or higher
- **Redis**: v6.0 or higher
- **NATS Server**: v2.10 or higher (with JetStream enabled)
- **Git**: For cloning the repository
- **Discord Developer Account**: For bot creation

### Optional (for Docker deployment):
- **Docker**: v20.10 or higher
- **Docker Compose**: v2.0 or higher

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/opennotes-bot.git
cd opennotes-bot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Configuration](#configuration) section below).

### 4. Set Up the Database

Generate Prisma client and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

Optional: Seed the database with sample data:

```bash
npm run db:seed
```

## ⚙️ Configuration

### Discord Bot Setup

1. **Create a Discord Application**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name
   - Navigate to the "Bot" section
   - Click "Add Bot"
   - Copy the bot token (you'll need this for `DISCORD_TOKEN`)

2. **Configure Bot Permissions**:
   - In the "OAuth2" > "URL Generator" section
   - Select scopes: `bot`, `applications.commands`
   - Select bot permissions:
     - Send Messages
     - Embed Links
     - Attach Files
     - Read Message History
     - Manage Messages
     - Use Slash Commands
     - Add Reactions
     - View Channels

3. **Invite Bot to Your Server**:
   - Copy the generated OAuth2 URL
   - Open it in your browser and select your server

### Environment Variables

Configure your `.env` file with the following variables:

#### Required Variables

```env
# Discord Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/opennotes_bot
REDIS_URL=redis://localhost:6379
NATS_URL=nats://localhost:4222

# Security
JWT_SECRET=generate_a_secure_32_character_string_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

#### Optional Variables

```env
# Community Notes Settings
MAX_REQUESTS_PER_DAY=5
REQUEST_TIMEOUT_HOURS=24
MIN_REQUESTS_FOR_VISIBILITY=4

# Email Provider (for email verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password

# SMS Provider (for phone verification)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

## 🗄️ Database Setup

### Local PostgreSQL Setup

1. **Install PostgreSQL**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql

   # macOS with Homebrew
   brew install postgresql

   # Windows: Download from https://www.postgresql.org/download/windows/
   ```

2. **Create Database**:
   ```bash
   psql -U postgres
   CREATE DATABASE opennotes_bot;
   \q
   ```

3. **Run Migrations**:
   ```bash
   npm run db:migrate
   ```

### Using Prisma Studio (Database GUI)

To visually inspect and edit your database:

```bash
npm run db:studio
```

This opens a web interface at `http://localhost:5555`

## 🏃 Running the Bot

### Development Mode

Run with hot-reload for development:

```bash
npm run dev
```

For the dashboard development server:

```bash
npm run dev:dashboard
```

### Production Mode

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Start the bot**:
   ```bash
   npm start
   ```

### Using PM2 (Recommended for Production)

1. **Install PM2 globally**:
   ```bash
   npm install -g pm2
   ```

2. **Start with PM2**:
   ```bash
   pm2 start dist/index.js --name opennotes-bot
   ```

3. **Monitor logs**:
   ```bash
   pm2 logs opennotes-bot
   ```

## 🐳 Docker Deployment

### Using Docker Compose

The easiest way to run the bot with all dependencies:

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

   This starts:
   - PostgreSQL
   - Redis
   - NATS JetStream
   - The Discord bot

2. **View logs**:
   ```bash
   docker-compose logs -f bot
   ```

3. **Stop services**:
   ```bash
   docker-compose down
   ```

### Building Docker Image Manually

```bash
# Build the image
npm run docker:build

# Run the container
docker run -d \
  --name opennotes-bot \
  --env-file .env \
  --network host \
  opennotes-bot
```

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run for CI/CD
npm run test:ci
```

### Test Structure

- `src/**/*.test.ts` - Unit tests
- `src/integration.test.ts` - Integration tests
- Coverage threshold: Currently set to 0% (can be adjusted in `jest.config.js`)

## 📚 API Documentation

The bot includes a REST API for the web dashboard:

### Endpoints

- `GET /api/health` - Health check
- `GET /api/stats` - Bot statistics
- `GET /api/requests` - List note requests
- `POST /api/notes` - Create a note
- `GET /api/notes/:id` - Get specific note
- `POST /api/notes/:id/rate` - Rate a note
- `GET /api/users/:id` - Get user profile
- `WebSocket /socket.io` - Real-time updates

### Dashboard Access

Once running, access the dashboard at:
- Development: `http://localhost:5173`
- Production: `http://localhost:3000`

## 🔧 Troubleshooting

### Common Issues

#### Bot doesn't respond to commands
- Ensure the bot has proper permissions in your Discord server
- Check that `DISCORD_TOKEN` is correct
- Verify the bot is online in Discord

#### Database connection failed
- Ensure PostgreSQL is running: `sudo service postgresql status`
- Verify `DATABASE_URL` is correct
- Check database exists: `psql -U postgres -l`

#### Redis connection error
- Ensure Redis is running: `redis-cli ping`
- Verify `REDIS_URL` is correct
- Check Redis logs: `redis-server --loglevel debug`

#### NATS connection timeout
- Ensure NATS is running with JetStream: `nats-server -js`
- Verify `NATS_URL` is correct
- Check NATS monitoring: `http://localhost:8222`

#### TypeScript compilation errors
- Regenerate Prisma client: `npm run db:generate`
- Clear build cache: `rm -rf dist && npm run build`
- Ensure Node.js version is 18+: `node --version`

#### Docker issues
- Ensure Docker daemon is running: `docker ps`
- Check container logs: `docker-compose logs bot`
- Rebuild containers: `docker-compose build --no-cache`

### Getting Help

1. Check existing issues on GitHub
2. Enable debug logging: `LOG_LEVEL=debug npm run dev`
3. Inspect database: `npm run db:studio`
4. Join our Discord support server (if available)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Follow TypeScript best practices
- Use conventional commit messages
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Discord.js community for excellent documentation
- Prisma team for the powerful ORM
- Community Notes algorithm inspired by X (formerly Twitter)

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact the maintainers
- Check the [FAQ](docs/FAQ.md) (if available)

---

Built with ❤️ for combating misinformation in Discord communities