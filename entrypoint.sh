#!/bin/sh

# Wait for MongoDB to be ready
./wait-for-it.sh mongodb 27017 -- echo "MongoDB is up"

# Run the database seed
echo "Seeding the database..."
pnpm run seed

# Start the main application
echo "Starting the API..."
exec pnpm run start:dev
