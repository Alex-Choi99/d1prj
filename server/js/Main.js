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
        const token = cookies[SESSION_COOKIE_NAME];
        const session = this.validateSession(token);
        return session ? session.userId : null;
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
            const sql = `SELECT id, email, userType, remaining_free_api_calls FROM user`;

            db.query(sql, (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: "Server error.\n" });
                }

                console.log('Admin users query result:', JSON.stringify(results[0]));
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
            const userId = this.getUserIdFromSession(req);
            
            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const sql = `SELECT email, userType, remaining_free_api_calls FROM user WHERE id = ?`;
            db.query(sql, [userId], (err, results) => {
                if (err || results.length === 0) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: "Server error.\n" });
                }

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
            const { email, password } = req.body;

            if (!this.validateEmail(email)) {
                return res.status(400).json({ message: "Invalid email format.\n" });
            }

            const checkEmailSql = `SELECT email FROM user WHERE email = ?`;

            db.query(checkEmailSql, [email], async (err, results) => {
                if (results.length > 0) {
                    return res.status(409).json({ message: "Email already in use.\n" });
                }
                
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: err });
                }

                const hashedPassword = await bcrypt.hash(password, 8);
                const insertSql = `INSERT INTO user (email, password) VALUES (?, ?)`;

                db.query(insertSql, [email, hashedPassword], (err, result) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(400).json({ message: "Data insertion failed.\n" });
                    }

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
            const { email, password } = req.body;
            const sql = `SELECT * FROM user WHERE email = ?`;

            db.query(sql, [email], async (err, results) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ error: "Server error.\n" });
                }

                if (results.length === 0) {
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

                    res.json({
                        message: "Sign in successful",
                        email: user.email,
                        userType: user.userType || 'user',
                        userId: user.id
                    });
                } else {
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

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
        });
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

module.exports = Main;
