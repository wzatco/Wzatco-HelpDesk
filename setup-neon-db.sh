#!/bin/bash

echo "🚀 Setting up Neon Database for Vercel..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo ""
    echo "💡 Create a .env file with:"
    echo "   DATABASE_URL=postgresql://neondb_owner:npg_iFHl5j3WPyQC@ep-crimson-base-ad14rm9i-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi

echo "✅ Prisma client generated"
echo ""

# Push schema to database (creates tables)
echo "🗄️  Pushing schema to Neon database..."
npx prisma db push

if [ $? -ne 0 ]; then
    echo "❌ Failed to push schema"
    exit 1
fi

echo "✅ Schema pushed successfully"
echo ""

# Or use migrations (uncomment if you prefer)
# echo "🗄️  Running migrations..."
# npx prisma migrate deploy
# echo "✅ Migrations completed"
# echo ""

echo "🎉 Setup complete! Your Neon database is ready."
echo ""
echo "Next steps:"
echo "  1. Add DATABASE_URL to Vercel environment variables"
echo "  2. Deploy your application"
echo "  3. Run migrations on Vercel if needed"

