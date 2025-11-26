-- Migration script to add userType column to user table
-- Run this script on your database to enable admin functionality

-- Add userType column if it doesn't exist
ALTER TABLE user 
ADD COLUMN IF NOT EXISTS userType ENUM('user', 'admin') DEFAULT 'user';

-- Optional: Create an admin user for testing
-- Replace 'admin@example.com' and password hash with your desired admin credentials
-- Password hash below is for 'admin123' - you should change this!
-- To generate a new hash, use: bcrypt.hash('your_password', 10)

-- UPDATE user SET userType = 'admin' WHERE email = 'your_admin_email@example.com';

-- Or insert a new admin user (replace with actual hashed password):
-- INSERT INTO user (email, password, userType) 
-- VALUES ('admin@example.com', '$2b$10$your_hashed_password_here', 'admin');
