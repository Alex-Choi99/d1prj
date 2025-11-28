const http = require('http');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const swaggerUI = require('swagger-ui-express');
const swaggerSpec = require('../docs/FlippyDocs.js');
require('dotenv').config();

const DB_HOST               = process.env.DB_HOST;
const DB_USER               = process.env.DB_USER;
const DB_PASSWORD           = process.env.DB_PASSWORD;
const DB_NAME               = process.env.DB_NAME;
const PORT                  = 3001;
const API_SERVICE_URL       = process.env.API_SERVICE_URL || 'http://localhost:5000';
const HEADER_CONTENT_TYPE   = "Content-Type";
const HEADER_JSON_CONTENT   = "application/json";
const GET                   = "GET";
const POST                  = "POST";
const OPTIONS               = "OPTIONS";
const DELETE                = "DELETE";
const PUT                   = "PUT";
const DATA                  = "data";
const ALL                   = "*";
const CLIENT_ORIGIN        = "http://localhost:8000";
const BODY_DEFAULT          = "";
const END                   = "end";
const DB_CONNECTION_MSG     = "Connected to database.\n";
const CORS = {
    ORIGIN: 'Access-Control-Allow-Origin',
    METHODS: 'Access-Control-Allow-Methods',
    HEADERS: 'Access-Control-Allow-Headers'
};
const POST_FAIL_MSG     = "Data insertion failed.\n";
const POST_SUCCESS_MSG  = "Data inserted successfully.\n";
const INVALID_EMAIL_MSG = "Invalid email format.\n";
const SERVER_ERROR_MSG = "Server error.\n";
const EMAIL_ALREADY_IN_USE_MSG = "Email already in use.\n";
const INVALID_INPUT_MSG = "Invalid email or password.\n";
const NOT_FOUND_MSG = "Not Found.\n";
const SESSION_COOKIE_NAME = 'session_token';
const SESSION_EXPIRY_DAYS = 7;

// In-memory session store (for production, use Redis or database)
const sessions = new Map();

/**
 * Runs the program
 */
class Main {

    /**
     * Generate secure session token
     */
    static generateSessionToken() {
        return require('crypto').randomBytes(32).toString('hex');
    }

    /**
     * Set cookie header
     */
    static setCookie(res, name, value, maxAge) {
        const expires = new Date(Date.now() + maxAge);
        res.setHeader('Set-Cookie', 
            `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge / 1000}; Expires=${expires.toUTCString()}`
        );
    }

    /**
     * Parse cookies from request
     */
    static parseCookies(req) {
        const cookies = {};
        const cookieHeader = req.headers.cookie;
        
        if (cookieHeader) {
            cookieHeader.split(';').forEach(cookie => {
                const [name, value] = cookie.trim().split('=');
                cookies[name] = value;
            });
        }
        
        return cookies;
    }

    /**
     * Validate session token
     */
    static validateSession(token) {
        const session = sessions.get(token);
        
        if (!session) {
            return null;
        }
        
        // Check if session expired
        if (Date.now() > session.expiresAt) {
            sessions.delete(token);
            return null;
        }
        
        return session;
    }

    /**
     * Get user ID from session
     */
    static getUserIdFromSession(req) {
        const cookies = this.parseCookies(req);
        console.log('Cookies:', cookies);
        const token = cookies[SESSION_COOKIE_NAME];
        console.log('Session token:', token);
        const session = this.validateSession(token);
        console.log('Session:', session);
        return session ? session.userId : null;
    }

    /**
     * Log API usage to database
     */
    static logApiUsage(db, userId, method, endpoint, statusCode, responseTime, ipAddress) {
        const sql = `INSERT INTO api_usage_log (user_id, method, endpoint, status_code, response_time_ms, ip_address) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
        
        db.query(sql, [userId, method, endpoint, statusCode, responseTime, ipAddress], (err) => {
            if (err) {
                console.error('Failed to log API usage:', err);
            }
        });
    }

    /**
     * Entry Point
     */
    static main() {
        const db = mysql.createPool({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
            connectionLimit: 10,
            waitForConnections: true,
            queueLimit: 0
        });

        db.getConnection((err, connection) => {
            if (err) {
                throw err;
            }

            console.log(DB_CONNECTION_MSG);
            connection.release();
        });

        this.runServer(db);
    }

    /**
     * Run HTTP Server
     */
    static runServer(db) {
        const app = express();
        app.use(express.json());
        app.use(cookieParser());
        app.use(cors({
            origin: CLIENT_ORIGIN,
            credentials: true
        }));
        
        app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));
        app.get('/api-docs.json', (req, res) => {
            res.json(swaggerSpec);
        });

        /**
         * @swagger
         * /verify-session:
         *   get:
         *     summary: Verify user session
         *     tags: [Authentication]
         *     security:
         *       - cookieAuth: []
         *     responses:
         *       200:
         *         description: Session valid
         *       401:
         *         description: Invalid or expired session
         */
        app.get('/verify-session', (req, res) => {
            const token = req.cookies[SESSION_COOKIE_NAME];
            const session = this.validateSession(token);

            if (session) {
                res.json({
                    valid: true,
                    email: session.email,
                    userId: session.userId
                });
            } else {
                res.status(401).json({ valid: false });
            }
        });

        /**
         * @swagger
         * /admin/users:
         *   get:
         *     summary: Get all users (Admin only)
         *     tags: [Admin]
         *     security:
         *       - cookieAuth: []
         *     responses:
         *       200:
         *         description: List of all users
         *       500:
         *         description: Server error
         */
        app.get('/admin/users', (req, res) => {
            const startTime = Date.now();
            const userId = this.getUserIdFromSession(req);
            const sql = `SELECT id, email, userType, remaining_free_api_calls FROM user`;

            db.query(sql, (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, userId, 'GET', '/admin/users', 500, responseTime, req.ip);
                    return res.status(500).json({ error: "Server error.\n" });
                }

                console.log('Admin users query result:', JSON.stringify(results[0]));
                const responseTime = Date.now() - startTime;
                this.logApiUsage(db, userId, 'GET', '/admin/users', 200, responseTime, req.ip);
                
                res.json({ users: results });
            });
        });

        /**
         * @swagger
         * /profile:
         *   get:
         *     summary: Get user profile
         *     tags: [User]
         *     security:
         *       - cookieAuth: []
         *     responses:
         *       200:
         *         description: User profile retrieved
         *       401:
         *         description: Not authenticated
         */
        app.get('/profile', (req, res) => {
            const startTime = Date.now();
            const userId = this.getUserIdFromSession(req);
            
            if (!userId) {
                const responseTime = Date.now() - startTime;
                this.logApiUsage(db, null, 'GET', '/profile', 401, responseTime, req.ip);
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const sql = `SELECT email, userType, remaining_free_api_calls FROM user WHERE id = ?`;
            db.query(sql, [userId], (err, results) => {
                if (err || results.length === 0) {
                    console.error('Database error:', err);
                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, userId, 'GET', '/profile', 500, responseTime, req.ip);
                    return res.status(500).json({ error: "Server error.\n" });
                }

                const responseTime = Date.now() - startTime;
                this.logApiUsage(db, userId, 'GET', '/profile', 200, responseTime, req.ip);

                res.json(results[0]);
            });
        });

        /**
         * @swagger
         * /signup:
         *   post:
         *     summary: Register a new user
         *     tags: [Authentication]
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - email
         *               - password
         *             properties:
         *               email:
         *                 type: string
         *                 format: email
         *               password:
         *                 type: string
         *                 format: password
         *     responses:
         *       200:
         *         description: User registered successfully
         *       400:
         *         description: Invalid email format
         *       409:
         *         description: Email already in use
         */
        app.post('/signup', async (req, res) => {
            const startTime = Date.now();
            const { email, password } = req.body;

            if (!this.validateEmail(email)) {
                const responseTime = Date.now() - startTime;
                this.logApiUsage(db, null, 'POST', '/signup', 400, responseTime, req.ip);
                return res.status(400).json({ message: "Invalid email format.\n" });
            }

            const checkEmailSql = `SELECT email FROM user WHERE email = ?`;

            db.query(checkEmailSql, [email], async (err, results) => {
                if (results.length > 0) {
                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, null, 'POST', '/signup', 409, responseTime, req.ip);
                    return res.status(409).json({ message: "Email already in use.\n" });
                }
                
                if (err) {
                    console.error('Database error:', err);
                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, null, 'POST', '/signup', 500, responseTime, req.ip);
                    return res.status(500).json({ error: err });
                }

                const hashedPassword = await bcrypt.hash(password, 8);
                const insertSql = `INSERT INTO user (email, password) VALUES (?, ?)`;

                db.query(insertSql, [email, hashedPassword], (err, result) => {
                    if (err) {
                        console.error('Database error:', err);
                        const responseTime = Date.now() - startTime;
                        this.logApiUsage(db, null, 'POST', '/signup', 400, responseTime, req.ip);
                        return res.status(400).json({ message: "Data insertion failed.\n" });
                    }

                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, result.insertId, 'POST', '/signup', 200, responseTime, req.ip);

                    res.json({
                        message: "Data inserted successfully.\n",
                        userId: result.insertId
                    });
                });
            });
        });

        /**
         * @swagger
         * /signin:
         *   post:
         *     summary: Sign in user
         *     tags: [Authentication]
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - email
         *               - password
         *             properties:
         *               email:
         *                 type: string
         *               password:
         *                 type: string
         *     responses:
         *       200:
         *         description: Sign in successful
         *       401:
         *         description: Invalid credentials
         */
        app.post('/signin', async (req, res) => {
            const startTime = Date.now();
            const { email, password } = req.body;
            const sql = `SELECT * FROM user WHERE email = ?`;

            db.query(sql, [email], async (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, null, 'POST', '/signin', 500, responseTime, req.ip);
                    return res.status(500).json({ error: "Server error.\n" });
                }

                if (results.length === 0) {
                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, null, 'POST', '/signin', 401, responseTime, req.ip);
                    return res.status(401).json({ error: "Invalid email or password.\n" });
                }

                const user = results[0];
                const passwordMatch = await bcrypt.compare(password, user.password);

                if (passwordMatch) {
                    const sessionToken = this.generateSessionToken();
                    const maxAge = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
                    
                    sessions.set(sessionToken, {
                        email: user.email,
                        userId: user.id,
                        createdAt: Date.now(),
                        expiresAt: Date.now() + maxAge
                    });

                    res.cookie(SESSION_COOKIE_NAME, sessionToken, {
                        httpOnly: true,
                        sameSite: 'lax',
                        maxAge: maxAge
                    });

                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, user.id, 'POST', '/signin', 200, responseTime, req.ip);

                    res.json({
                        message: "Sign in successful",
                        email: user.email,
                        userType: user.userType || 'user',
                        userId: user.id
                    });
                } else {
                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, user.id, 'POST', '/signin', 401, responseTime, req.ip);
                    res.status(401).json({ error: "Invalid email or password.\n" });
                }
            });
        });

        /**
         * @swagger
         * /create-card-group:
         *   post:
         *     summary: Create a new card group
         *     tags: [Cards]
         *     security:
         *       - cookieAuth: []
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - name
         *               - cards
         *             properties:
         *               name:
         *                 type: string
         *               description:
         *                 type: string
         *               cards:
         *                 type: array
         *                 items:
         *                   type: object
         *                   properties:
         *                     question:
         *                       type: string
         *                     answer:
         *                       type: string
         *     responses:
         *       200:
         *         description: Card group created successfully
         *       401:
         *         description: Not authenticated
         *       403:
         *         description: No remaining free API calls
         */
        app.post('/create-card-group', (req, res) => {
            const userId = this.getUserIdFromSession(req);
            
            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const checkCallsSql = `SELECT remaining_free_api_calls FROM user WHERE id = ?`;
            db.query(checkCallsSql, [userId], (err, userResults) => {
                if (err || userResults.length === 0) {
                    return res.status(500).json({ error: 'Failed to verify user' });
                }

                if (userResults[0].remaining_free_api_calls <= 0) {
                    return res.status(403).json({ error: 'No remaining free API calls' });
                }

                const { name, description, cards } = req.body;

                if (!name || !Array.isArray(cards) || cards.length === 0) {
                    return res.status(400).json({ error: 'Invalid card group data' });
                }

                const groupSql = `INSERT INTO card_groups (user_id, name, description) VALUES (?, ?, ?)`;

                db.query(groupSql, [userId, name, description || ''], (err, groupResult) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: 'Failed to create card group' });
                    }

                    const groupId = groupResult.insertId;
                    const cardSql = `INSERT INTO cards (group_id, question, answer) VALUES ?`;
                    const cardValues = cards.map(card => [groupId, card.question, card.answer]);

                    db.query(cardSql, [cardValues], (err, cardResult) => {
                        if (err) {
                            console.error('Database error:', err);
                            return res.status(500).json({ error: 'Failed to create cards' });
                        }

                        const decrementSql = `UPDATE user SET remaining_free_api_calls = remaining_free_api_calls - 1 WHERE id = ?`;
                        db.query(decrementSql, [userId], (err) => {
                            if (err) {
                                console.error('Failed to decrement API calls:', err);
                            }

                            res.json({
                                message: 'Card group created successfully',
                                groupId: groupId,
                                cardsCreated: cardResult.affectedRows,
                                remainingApiCalls: userResults[0].remaining_free_api_calls - 1
                            });
                        });
                    });
                });
            });
        });

        /**
         * @swagger
         * /admin/users:
         *   delete:
         *     summary: Delete a user (Admin only)
         *     tags: [Admin]
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - userId
         *               - adminEmail
         *               - adminPassword
         *             properties:
         *               userId:
         *                 type: integer
         *               adminEmail:
         *                 type: string
         *               adminPassword:
         *                 type: string
         *     responses:
         *       200:
         *         description: User deleted successfully
         *       401:
         *         description: Unauthorized
         */
        app.delete('/admin/users', async (req, res) => {
            const { userId, adminEmail, adminPassword } = req.body;

            const adminSql = `SELECT * FROM user WHERE email = ? AND userType = 'admin'`;
            db.query(adminSql, [adminEmail], async (err, adminResults) => {
                if (err || adminResults.length === 0) {
                    return res.status(401).json({ error: "Unauthorized" });
                }

                const admin = adminResults[0];
                const passwordMatch = await bcrypt.compare(adminPassword, admin.password);

                if (!passwordMatch) {
                    return res.status(401).json({ error: "Invalid password" });
                }

                const deleteSql = `DELETE FROM user WHERE id = ?`;
                db.query(deleteSql, [userId], (err, result) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: "Server error.\n" });
                    }

                    res.json({ message: "User deleted successfully" });
                });
            });
        });

        /**
         * @swagger
         * /admin/users:
         *   put:
         *     summary: Update user (Admin only)
         *     tags: [Admin]
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - userId
         *               - adminEmail
         *               - adminPassword
         *             properties:
         *               userId:
         *                 type: integer
         *               userType:
         *                 type: string
         *               apiCallsIncrement:
         *                 type: integer
         *               adminEmail:
         *                 type: string
         *               adminPassword:
         *                 type: string
         *     responses:
         *       200:
         *         description: User updated successfully
         *       401:
         *         description: Unauthorized
         */
        app.put('/admin/users', async (req, res) => {
            const { userId, userType: newUserType, apiCallsIncrement, adminEmail, adminPassword } = req.body;

            const adminSql = `SELECT * FROM user WHERE email = ? AND userType = 'admin'`;
            db.query(adminSql, [adminEmail], async (err, adminResults) => {
                if (err || adminResults.length === 0) {
                    return res.status(401).json({ error: "Unauthorized" });
                }

                const admin = adminResults[0];
                const passwordMatch = await bcrypt.compare(adminPassword, admin.password);

                if (!passwordMatch) {
                    return res.status(401).json({ error: "Invalid password" });
                }

                let updateSql, updateParams;
                if (newUserType && apiCallsIncrement) {
                    updateSql = `UPDATE user SET userType = ?, remaining_free_api_calls = remaining_free_api_calls + ? WHERE id = ?`;
                    updateParams = [newUserType, apiCallsIncrement, userId];
                } else if (newUserType) {
                    updateSql = `UPDATE user SET userType = ? WHERE id = ?`;
                    updateParams = [newUserType, userId];
                } else if (apiCallsIncrement) {
                    updateSql = `UPDATE user SET remaining_free_api_calls = remaining_free_api_calls + ? WHERE id = ?`;
                    updateParams = [apiCallsIncrement, userId];
                } else {
                    return res.status(400).json({ error: "No update parameters provided" });
                }

                db.query(updateSql, updateParams, (err, result) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ error: "Server error.\n" });
                    }

                    res.json({ message: "User updated successfully" });
                });
            });
        });

        /**
         * @swagger
         * /admin/endpoint-stats:
         *   get:
         *     summary: Get API endpoint statistics (Admin only)
         *     tags: [Admin]
         *     security:
         *       - cookieAuth: []
         *     responses:
         *       200:
         *         description: Endpoint statistics retrieved successfully
         *       500:
         *         description: Server error
         */
        app.get('/admin/endpoint-stats', (req, res) => {
            const sql = `
                SELECT 
                    method,
                    endpoint,
                    COUNT(*) as request_count,
                    AVG(response_time_ms) as avg_response_time,
                    MAX(created_at) as last_request
                FROM api_usage_log 
                GROUP BY method, endpoint 
                ORDER BY request_count DESC
            `;

            db.query(sql, (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: "Server error.\n" });
                }

                res.json({ stats: results });
            });
        });

        /**
         * @swagger
         * /admin/user-api-usage:
         *   get:
         *     summary: Get user API usage statistics (Admin only)
         *     tags: [Admin]
         *     security:
         *       - cookieAuth: []
         *     responses:
         *       200:
         *         description: User API usage retrieved successfully
         *       500:
         *         description: Server error
         */
        app.get('/admin/user-api-usage', (req, res) => {
            const startTime = Date.now();
            const userId = this.getUserIdFromSession(req);
            const sql = `
                SELECT 
                    u.id as user_id,
                    u.email,
                    u.userType,
                    u.remaining_free_api_calls,
                    COALESCE(api_stats.total_requests, 0) as total_requests,
                    COALESCE(
                        CASE 
                            WHEN u.api_key IS NOT NULL AND u.api_key != '' THEN u.api_key
                            WHEN ak.api_key IS NOT NULL THEN ak.api_key
                            ELSE 'N/A'
                        END, 
                        'N/A'
                    ) as api_key
                FROM user u
                LEFT JOIN (
                    SELECT 
                        user_id, 
                        COUNT(*) as total_requests 
                    FROM api_usage_log 
                    GROUP BY user_id
                ) api_stats ON u.id = api_stats.user_id
                LEFT JOIN (
                    SELECT 
                        user_id, 
                        api_key 
                    FROM api_keys 
                    WHERE is_active = TRUE 
                    ORDER BY created_at DESC 
                    LIMIT 1
                ) ak ON u.id = ak.user_id
                ORDER BY total_requests DESC, u.id ASC
            `;

            db.query(sql, (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, userId, 'GET', '/admin/user-api-usage', 500, responseTime, req.ip);
                    return res.status(500).json({ error: "Server error.\n" });
                }

                const responseTime = Date.now() - startTime;
                this.logApiUsage(db, userId, 'GET', '/admin/user-api-usage', 200, responseTime, req.ip);

                res.json({ users: results });
            });
        });

        /**
         * @swagger
         * /admin/generate-api-key:
         *   post:
         *     summary: Generate API key for a user (Admin only)
         *     tags: [Admin]
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - userId
         *               - adminEmail
         *               - adminPassword
         *             properties:
         *               userId:
         *                 type: integer
         *               keyName:
         *                 type: string
         *               adminEmail:
         *                 type: string
         *               adminPassword:
         *                 type: string
         *     responses:
         *       200:
         *         description: API key generated successfully
         *       401:
         *         description: Unauthorized
         */
        app.post('/admin/generate-api-key', async (req, res) => {
            const startTime = Date.now();
            const adminUserId = this.getUserIdFromSession(req);
            const { userId, keyName, adminEmail, adminPassword } = req.body;

            const adminSql = `SELECT * FROM user WHERE email = ? AND userType = 'admin'`;
            db.query(adminSql, [adminEmail], async (err, adminResults) => {
                if (err || adminResults.length === 0) {
                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, adminUserId, 'POST', '/admin/generate-api-key', 401, responseTime, req.ip);
                    return res.status(401).json({ error: "Unauthorized" });
                }

                const admin = adminResults[0];
                const passwordMatch = await bcrypt.compare(adminPassword, admin.password);

                if (!passwordMatch) {
                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, adminUserId, 'POST', '/admin/generate-api-key', 401, responseTime, req.ip);
                    return res.status(401).json({ error: "Invalid password" });
                }

                // Generate API key
                const apiKey = require('crypto').randomBytes(32).toString('hex');
                const insertSql = `INSERT INTO api_keys (user_id, api_key, key_name) VALUES (?, ?, ?)`;
                
                db.query(insertSql, [userId, apiKey, keyName || 'Default Key'], (err, result) => {
                    if (err) {
                        console.error('Database error:', err);
                        const responseTime = Date.now() - startTime;
                        this.logApiUsage(db, adminUserId, 'POST', '/admin/generate-api-key', 500, responseTime, req.ip);
                        return res.status(500).json({ error: "Server error.\n" });
                    }

                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, adminUserId, 'POST', '/admin/generate-api-key', 200, responseTime, req.ip);

                    res.json({ 
                        message: "API key generated successfully",
                        apiKey: apiKey 
                    });
                });
            });
        });

        /**
         * @swagger
         * /card-groups:
         *   get:
         *     summary: Get user's card groups with cards
         *     tags: [Cards]
         *     security:
         *       - cookieAuth: []
         *     responses:
         *       200:
         *         description: User's card groups retrieved successfully
         *       401:
         *         description: Not authenticated
         */
        app.get('/card-groups', (req, res) => {
            const startTime = Date.now();
            const userId = this.getUserIdFromSession(req);
            
            if (!userId) {
                const responseTime = Date.now() - startTime;
                this.logApiUsage(db, null, 'GET', '/card-groups', 401, responseTime, req.ip);
                return res.status(401).json({ error: 'Not authenticated' });
            }

            // Get card groups for the user
            const groupsSql = `SELECT id, name, description, created_at FROM card_groups WHERE user_id = ? ORDER BY created_at DESC`;
            
            db.query(groupsSql, [userId], (err, groups) => {
                if (err) {
                    console.error('Database error:', err);
                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, userId, 'GET', '/card-groups', 500, responseTime, req.ip);
                    return res.status(500).json({ error: 'Server error' });
                }

                if (groups.length === 0) {
                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, userId, 'GET', '/card-groups', 200, responseTime, req.ip);
                    return res.json({ groups: [] });
                }

                // Get cards for each group
                const groupIds = groups.map(group => group.id);
                const cardsSql = `SELECT * FROM cards WHERE group_id IN (${groupIds.map(() => '?').join(',')}) ORDER BY id ASC`;
                
                db.query(cardsSql, groupIds, (err, cards) => {
                    if (err) {
                        console.error('Database error:', err);
                        const responseTime = Date.now() - startTime;
                        this.logApiUsage(db, userId, 'GET', '/card-groups', 500, responseTime, req.ip);
                        return res.status(500).json({ error: 'Server error' });
                    }

                    // Organize cards by group
                    const groupsWithCards = groups.map(group => ({
                        ...group,
                        cards: cards.filter(card => card.group_id === group.id)
                    }));

                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, userId, 'GET', '/card-groups', 200, responseTime, req.ip);
                    
                    res.json({ groups: groupsWithCards });
                });
            });
        });

        /**
         * @swagger
         * /generate-explanation:
         *   post:
         *     summary: Generate AI explanation for a card
         *     tags: [Cards]
         *     security:
         *       - cookieAuth: []
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - cardId
         *             properties:
         *               cardId:
         *                 type: integer
         *               difficulty:
         *                 type: string
         *                 enum: [easy, medium, hard]
         *     responses:
         *       200:
         *         description: Explanation generated successfully
         *       401:
         *         description: Not authenticated
         */
        app.post('/generate-explanation', async (req, res) => {
            const startTime = Date.now();
            const userId = this.getUserIdFromSession(req);
            
            if (!userId) {
                const responseTime = Date.now() - startTime;
                this.logApiUsage(db, null, 'POST', '/generate-explanation', 401, responseTime, req.ip);
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { cardId, difficulty = 'medium' } = req.body;
            
            if (!cardId) {
                const responseTime = Date.now() - startTime;
                this.logApiUsage(db, userId, 'POST', '/generate-explanation', 400, responseTime, req.ip);
                return res.status(400).json({ error: 'Card ID is required' });
            }

            // Get the card and verify ownership
            const cardSql = `
                SELECT c.*, cg.user_id 
                FROM cards c 
                JOIN card_groups cg ON c.group_id = cg.id 
                WHERE c.id = ? AND cg.user_id = ?
            `;
            
            db.query(cardSql, [cardId, userId], async (err, cardResults) => {
                if (err) {
                    console.error('Database error:', err);
                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, userId, 'POST', '/generate-explanation', 500, responseTime, req.ip);
                    return res.status(500).json({ error: 'Server error' });
                }

                if (cardResults.length === 0) {
                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, userId, 'POST', '/generate-explanation', 404, responseTime, req.ip);
                    return res.status(404).json({ error: 'Card not found or access denied' });
                }

                const card = cardResults[0];
                
                // Generate explanation using the same logic as the API
                const explanation = this.generateExplanation(card.question, card.answer, difficulty);
                
                // Update the card with the new explanation
                const updateSql = `
                    UPDATE cards 
                    SET explanation_text = ?, explanation_difficulty = ?, explanation_generated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `;
                
                db.query(updateSql, [explanation, difficulty, cardId], (err, result) => {
                    if (err) {
                        console.error('Database error:', err);
                        const responseTime = Date.now() - startTime;
                        this.logApiUsage(db, userId, 'POST', '/generate-explanation', 500, responseTime, req.ip);
                        return res.status(500).json({ error: 'Failed to save explanation' });
                    }

                    const responseTime = Date.now() - startTime;
                    this.logApiUsage(db, userId, 'POST', '/generate-explanation', 200, responseTime, req.ip);
                    
                    res.json({
                        success: true,
                        explanation,
                        difficulty,
                        cardId
                    });
                });
            });
        });

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
        });
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Generate AI explanation based on difficulty level
     */
    static generateExplanation(question, answer, difficulty) {
        const templates = {
            easy: `Let me explain this in simple terms:\n\nQuestion: ${question}\n\nAnswer: ${answer}\n\nIn other words: This means ${answer.toLowerCase()}. Think of it as a straightforward concept that you can apply directly.`,
            medium: `Here's a detailed explanation:\n\nQuestion: ${question}\n\nAnswer: ${answer}\n\nExplanation: The answer addresses the question by providing ${answer}. This involves understanding the relationship between the question's key concepts and how they connect to form the solution. Consider the context and how this applies to similar scenarios.`,
            hard: `Advanced Analysis:\n\nQuestion: ${question}\n\nAnswer: ${answer}\n\nDeep Dive: This answer represents a complex concept that requires understanding multiple layers. First, consider the theoretical foundation behind why ${answer} is the correct response. Then, analyze the implications of this answer in broader contexts. Think critically about edge cases, alternative interpretations, and how this knowledge connects to advanced topics in the field.`
        };

        return templates[difficulty] || templates.medium;
    }
}

module.exports = Main;
