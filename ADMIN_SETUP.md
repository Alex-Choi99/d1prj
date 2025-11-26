# Admin Panel Setup and Usage Guide

## Overview
The admin panel allows administrators to manage users, including deleting accounts and promoting users to admin status.

## Features
- ✅ Secure admin-only access with session checking
- ✅ Initial password verification modal with blocking overlay
- ✅ Password confirmation for all destructive actions (delete/make admin)
- ✅ User table displaying: ID, Email, Hashed Password, User Type
- ✅ Bulk selection with checkboxes
- ✅ Real-time user management

## Setup Instructions

### 1. Database Migration
Run the SQL migration script to add the `userType` column to your user table:

```sql
-- Run this on your MySQL database
ALTER TABLE user 
ADD COLUMN IF NOT EXISTS userType ENUM('user', 'admin') DEFAULT 'user';
```

Location: `server/migrations/add_userType.sql`

### 2. Create Your First Admin User
Option A - Update existing user:
```sql
UPDATE user SET userType = 'admin' WHERE email = 'your_email@example.com';
```

Option B - Create new admin user via command line:
```bash
# Use bcrypt to hash a password
# Then insert directly into database
```

### 3. Server Configuration
The server has been updated with the following endpoints:

- `GET /admin/users` - List all users
- `DELETE /admin/users` - Delete a user (requires admin credentials)
- `PUT /admin/users` - Update user type (requires admin credentials)

These are already implemented in `server/js/Main.js`

### 4. Client Files Added
- `client/admin.html` - Admin panel page
- `client/css/admin.css` - Admin panel styling
- `client/js/admin.js` - Admin panel logic

### 5. Updated Files
- `server/js/Main.js` - Added admin API endpoints
- `client/js/auth.js` - Added admin checking and navigation updates
- `client/js/SignInFormHandler.js` - Store userType in session
- `client/index.html` - Added admin navigation link
- `client/cardGen.html` - Added admin navigation link

## Usage

### Accessing the Admin Panel
1. Sign in with an admin account
2. Navigate to `/admin.html` or click "Admin" in the navigation
3. Non-admin users will be redirected to the home page immediately

### First-Time Access (Per Session)
- A modal will appear with a blocking overlay
- Enter your admin password to verify
- This happens once per browser session

### Managing Users

#### View All Users
- The table displays all users with their ID, email, hashed password, and user type
- Admin users have a green badge, regular users have a gray badge

#### Delete Users
1. Select one or more users using checkboxes
2. Click "Delete Selected"
3. Confirm by entering your admin password
4. Users will be deleted after verification

#### Make Users Admin
1. Select one or more users using checkboxes
2. Click "Make Admin"
3. Confirm by entering your admin password
4. Selected users will become admins after verification

#### Refresh List
- Click "Refresh" to reload the user list from the server

## Security Features

### Session-Based Access Control
- Non-admin users are redirected immediately upon accessing `/admin`
- No page content is shown to unauthorized users

### Password Verification
- Initial access requires password verification
- Delete and make-admin actions require password re-verification
- All admin actions verify credentials server-side

### Blocking Overlay
- The initial password modal has a blocking overlay
- Prevents viewing page content before verification
- Action modals do NOT block the page view (as requested)

### Server-Side Validation
- All destructive actions verify admin credentials
- Password is compared using bcrypt
- User type is checked in the database

## API Endpoints

### GET /admin/users
Returns list of all users.

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "password": "$2b$10$hashed...",
      "userType": "user"
    }
  ]
}
```

### DELETE /admin/users
Delete a user account.

**Request Body:**
```json
{
  "userId": 1,
  "adminEmail": "admin@example.com",
  "adminPassword": "admin_password"
}
```

### PUT /admin/users
Update user type.

**Request Body:**
```json
{
  "userId": 1,
  "userType": "admin",
  "adminEmail": "admin@example.com",
  "adminPassword": "admin_password"
}
```

## Troubleshooting

### Can't access admin page
- Verify you're logged in
- Check that your user has `userType = 'admin'` in database
- Clear browser cache and session storage

### Password verification fails
- Ensure you're using the correct password
- Check that the password hash in database is correct

### Users not loading
- Check server is running on port 3001
- Verify database connection
- Check browser console for errors

### Navigation doesn't show Admin link
- Verify you're logged in
- Check sessionStorage has `userType = 'admin'`
- Refresh the page

## Testing Checklist

- [ ] Database has userType column
- [ ] At least one admin user exists
- [ ] Server is running on port 3001
- [ ] Can sign in as admin user
- [ ] Admin link appears in navigation
- [ ] Non-admin users can't access /admin
- [ ] Initial password modal appears on first access
- [ ] Password verification works
- [ ] User table loads and displays correctly
- [ ] Can delete users with password confirmation
- [ ] Can make users admin with password confirmation
- [ ] Refresh button works
- [ ] Checkboxes and bulk actions work

## Next Steps

1. Run the database migration
2. Create your first admin user
3. Test the admin panel functionality
4. Deploy to production
5. Monitor for any issues

## Notes
- The password field shows the hashed password (truncated for security)
- Hover over the password to see the full hash
- All passwords are stored using bcrypt hashing
- Admin status persists across sessions until logout
