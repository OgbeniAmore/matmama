#!/bin/bash

echo "🏥 Healthcare Reminder Chatbot Setup"
echo "====================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo "📦 Installing server dependencies..."
cd server && npm install && cd ..

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚙️ Creating .env file from template..."
    cp .env.example .env
    echo "📝 Please edit .env file with your configuration:"
    echo "   - Twilio credentials"
    echo "   - Supabase credentials"
    echo "   - Clinic information"
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your credentials"
echo "2. Set up your Supabase database with the provided migration"
echo "3. Configure your Twilio account"
echo ""
echo "To start the application:"
echo "  npm run start:all    # Start both frontend and backend"
echo "  npm run dev          # Start frontend only"
echo "  npm run server:dev   # Start backend only"
echo ""
echo "📚 Read README.md for detailed setup instructions"