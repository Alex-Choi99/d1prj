const http = require('http');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
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
        const server = http.createServer((req, res) => {
            switch (req.method) {
                case OPTIONS:
                    res.setHeader(CORS.ORIGIN, CLIENT_ORIGIN);
                    res.setHeader(CORS.METHODS, `${GET}, ${POST}, ${PUT}, ${DELETE}, ${OPTIONS}`);
                    res.setHeader(CORS.HEADERS, `${HEADER_CONTENT_TYPE}, Cookie`);
                    res.setHeader('Access-Control-Allow-Credentials', 'true');
                    res.end();
                    break;

                case GET:
                    res.setHeader(CORS.ORIGIN, CLIENT_ORIGIN);
                    res.setHeader('Access-Control-Allow-Credentials', 'true');

                    if (req.url === '/verify-session') {
                        const cookies = this.parseCookies(req);
                        const token = cookies[SESSION_COOKIE_NAME];
                        const session = this.validateSession(token);

                        res.setHeader(HEADER_CONTENT_TYPE, HEADER_JSON_CONTENT);

                        if (session) {
                            res.writeHead(200, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                            res.end(JSON.stringify({
                                valid: true,
                                email: session.email,
                                userId: session.userId
                            }));
                        } else {
                            res.writeHead(401, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                            res.end(JSON.stringify({ valid: false }));
                        }
                    } else if (req.url === '/admin/users') {
                        const sql = `SELECT id, email, userType, remaining_free_api_calls FROM user`;

                        db.query(sql, (err, results) => {
                            res.setHeader(HEADER_CONTENT_TYPE, HEADER_JSON_CONTENT);

                            if (err) {
                                console.error('Database error:', err);
                                res.writeHead(500, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                                res.end(JSON.stringify({ error: SERVER_ERROR_MSG }));
                                return;
                            }

                            console.log('Admin users query result:', JSON.stringify(results[0]));
                            res.writeHead(200, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                            res.end(JSON.stringify({ users: results }));
                        });
                    } else if (req.url === '/profile') {
                        const userId = this.getUserIdFromSession(req);
                        
                        if (!userId) {
                            res.setHeader(HEADER_CONTENT_TYPE, HEADER_JSON_CONTENT);
                            res.writeHead(401, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                            res.end(JSON.stringify({ error: 'Not authenticated' }));
                            return;
                        }

                        const sql = `SELECT email, userType, remaining_free_api_calls FROM user WHERE id = ?`;
                        db.query(sql, [userId], (err, results) => {
                            res.setHeader(HEADER_CONTENT_TYPE, HEADER_JSON_CONTENT);

                            if (err || results.length === 0) {
                                console.error('Database error:', err);
                                res.writeHead(500, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                                res.end(JSON.stringify({ error: SERVER_ERROR_MSG }));
                                return;
                            }

                            res.writeHead(200, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                            res.end(JSON.stringify(results[0]));
                        });
                    } else {
                        res.writeHead(404, { 
                            [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                            [CORS.ORIGIN]: CLIENT_ORIGIN
                        });
                        res.end(JSON.stringify({ error: NOT_FOUND_MSG }));
                    }
                    break;

                case POST:
                    let body = BODY_DEFAULT;

                    res.setHeader(CORS.ORIGIN, CLIENT_ORIGIN);
                    res.setHeader('Access-Control-Allow-Credentials', 'true');
                    req.on(DATA, chunk => body += chunk.toString());

                    req.on(END, () => {
                        try {
                            const parsed = JSON.parse(body);
                            const email = parsed.email;
                            const password = parsed.password;

                            if (req.url === '/signup') {
                                if (!this.validateEmail(email)) {
                                    res.writeHead(400, { 
                                        [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                                        [CORS.ORIGIN]: CLIENT_ORIGIN
                                    });
                                    res.end(JSON.stringify({ message: INVALID_EMAIL_MSG }));
                                    return;
                                }

                                const checkEmailSql = `SELECT email FROM user WHERE email = ?`;

                                db.query(checkEmailSql, [email], async (err, results) => {
                                    if (results.length > 0) {
                                        res.writeHead(409, { 
                                            [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                                            [CORS.ORIGIN]: CLIENT_ORIGIN
                                        });
                                        res.end(JSON.stringify({ message: EMAIL_ALREADY_IN_USE_MSG }));
                                        return;
                                    }
                                    
                                    if (err) {
                                        console.error('Database error:', err);
                                        res.writeHead(500, { 
                                            [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                                            [CORS.ORIGIN]: CLIENT_ORIGIN
                                        });
                                        res.end(JSON.stringify({ error: err })); 
                                        return;
                                    }

                                    const hashedPassword = await bcrypt.hash(password, 8);
                                    const insertSql = `INSERT INTO user (email, password) VALUES (?, ?)`;

                                    db.query(insertSql, [email, hashedPassword], (err, result) => {
                                        res.setHeader(HEADER_CONTENT_TYPE, HEADER_JSON_CONTENT);

                                        if (err) {
                                            console.error('Database error:', err);
                                            res.writeHead(400, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                                            res.end(JSON.stringify({ message: POST_FAIL_MSG }));
                                        } else {
                                            res.writeHead(200, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                                            res.end(JSON.stringify({
                                                message: POST_SUCCESS_MSG,
                                                userId: result.insertId
                                            }));
                                        }
                                    });
                                });
                            } else if (req.url === '/signin') {
                                const sql = `SELECT * FROM user WHERE email = ?`;

                                db.query(sql, [email], async (err, results) => {
                                    res.setHeader(HEADER_CONTENT_TYPE, HEADER_JSON_CONTENT);

                                    if (err) {
                                        console.error('Database error:', err);
                                        res.writeHead(500, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                                        res.end(JSON.stringify({ error: SERVER_ERROR_MSG }));
                                        return;
                                    }

                                    if (results.length === 0) {
                                        res.writeHead(401, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                                        res.end(JSON.stringify({ error: INVALID_INPUT_MSG }));
                                        return;
                                    }

                                    const user = results[0];

                                    // Compare password with hashed password
                                    const passwordMatch = await bcrypt.compare(password, user.password);

                                    if (passwordMatch) {
                                        // Generate session token
                                        const sessionToken = this.generateSessionToken();
                                        const maxAge = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
                                        
                                        // Store session
                                        sessions.set(sessionToken, {
                                            email: user.email,
                                            userId: user.id,
                                            createdAt: Date.now(),
                                            expiresAt: Date.now() + maxAge
                                        });

                                        // Set cookie
                                        this.setCookie(res, SESSION_COOKIE_NAME, sessionToken, maxAge);

                                        res.writeHead(200, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                                        res.end(JSON.stringify({
                                            message: "Sign in successful",
                                            email: user.email,
                                            userType: user.userType || 'user',
                                            userId: user.id
                                        }));
                                    } else {
                                        res.writeHead(401, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                                        res.end(JSON.stringify({ error: INVALID_INPUT_MSG }) );
                                    }
                                });
                            } else if (req.url === '/create-card-group') {
                                // Get user ID from session
                                const userId = this.getUserIdFromSession(req);
                                
                                if (!userId) {
                                    res.writeHead(401, { 
                                        [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                                        [CORS.ORIGIN]: CLIENT_ORIGIN
                                    });
                                    res.end(JSON.stringify({ error: 'Not authenticated' }));
                                    return;
                                }

                                // Check remaining API calls
                                const checkCallsSql = `SELECT remaining_free_api_calls FROM user WHERE id = ?`;
                                db.query(checkCallsSql, [userId], (err, userResults) => {
                                    if (err || userResults.length === 0) {
                                        res.writeHead(500, { 
                                            [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                                            [CORS.ORIGIN]: CLIENT_ORIGIN
                                        });
                                        res.end(JSON.stringify({ error: 'Failed to verify user' }));
                                        return;
                                    }

                                    if (userResults[0].remaining_free_api_calls <= 0) {
                                        res.writeHead(403, { 
                                            [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                                            [CORS.ORIGIN]: CLIENT_ORIGIN
                                        });
                                        res.end(JSON.stringify({ error: 'No remaining free API calls' }));
                                        return;
                                    }

                                    const { name, description, cards } = parsed;

                                    if (!name || !Array.isArray(cards) || cards.length === 0) {
                                        res.writeHead(400, { 
                                            [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                                            [CORS.ORIGIN]: CLIENT_ORIGIN
                                        });
                                        res.end(JSON.stringify({ error: 'Invalid card group data' }));
                                        return;
                                    }

                                // Insert card group
                                const groupSql = `INSERT INTO card_groups (user_id, name, description) VALUES (?, ?, ?)`;

                                db.query(groupSql, [userId, name, description || ''], (err, groupResult) => {
                                    if (err) {
                                        console.error('Database error:', err);
                                        res.writeHead(500, { 
                                            [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                                            [CORS.ORIGIN]: CLIENT_ORIGIN
                                        });
                                        res.end(JSON.stringify({ error: 'Failed to create card group' }));
                                        return;
                                    }

                                    const groupId = groupResult.insertId;

                                    // Insert all cards
                                    const cardSql = `INSERT INTO cards (group_id, question, answer) VALUES ?`;
                                    const cardValues = cards.map(card => [groupId, card.question, card.answer]);

                                    db.query(cardSql, [cardValues], (err, cardResult) => {
                                        res.setHeader(HEADER_CONTENT_TYPE, HEADER_JSON_CONTENT);

                                        if (err) {
                                            console.error('Database error:', err);
                                            res.writeHead(500, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                                            res.end(JSON.stringify({ error: 'Failed to create cards' }));
                                            return;
                                        }

                                        // Decrement remaining_free_api_calls
                                        const decrementSql = `UPDATE user SET remaining_free_api_calls = remaining_free_api_calls - 1 WHERE id = ?`;
                                        db.query(decrementSql, [userId], (err) => {
                                            if (err) {
                                                console.error('Failed to decrement API calls:', err);
                                            }

                                            res.writeHead(200, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                                            res.end(JSON.stringify({
                                                message: 'Card group created successfully',
                                                groupId: groupId,
                                                cardsCreated: cardResult.affectedRows,
                                                remainingApiCalls: userResults[0].remaining_free_api_calls - 1
                                            }));
                                        });
                                    });
                                });
                                });
                            }
                        }
                        catch (error) {
                            console.error('Server error:', error);
                            res.writeHead(500, { 
                                [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                                [CORS.ORIGIN]: CLIENT_ORIGIN
                            });
                            res.end(JSON.stringify({ error: "Server error" }));
                        }
                    });
                    break;

                case DELETE:
                    let deleteBody = BODY_DEFAULT;

                    res.setHeader(CORS.ORIGIN, CLIENT_ORIGIN);
                    req.on(DATA, chunk => deleteBody += chunk.toString());

                    req.on(END, async () => {
                        try {
                            const parsed = JSON.parse(deleteBody);
                            const userId = parsed.userId;
                            const adminEmail = parsed.adminEmail;
                            const adminPassword = parsed.adminPassword;

                            // Verify admin credentials
                            const adminSql = `SELECT * FROM user WHERE email = ? AND userType = 'admin'`;
                            db.query(adminSql, [adminEmail], async (err, adminResults) => {
                                res.setHeader(HEADER_CONTENT_TYPE, HEADER_JSON_CONTENT);

                                if (err || adminResults.length === 0) {
                                    res.writeHead(401);
                                    res.end(JSON.stringify({ error: "Unauthorized" }));
                                    return;
                                }

                                const admin = adminResults[0];
                                const passwordMatch = await bcrypt.compare(adminPassword, admin.password);

                                if (!passwordMatch) {
                                    res.writeHead(401);
                                    res.end(JSON.stringify({ error: "Invalid password" }));
                                    return;
                                }

                                // Delete user
                                const deleteSql = `DELETE FROM user WHERE id = ?`;
                                db.query(deleteSql, [userId], (err, result) => {
                                    if (err) {
                                        console.error('Database error:', err);
                                        res.writeHead(500);
                                        res.end(JSON.stringify({ error: SERVER_ERROR_MSG }));
                                        return;
                                    }

                                    res.writeHead(200);
                                    res.end(JSON.stringify({ message: "User deleted successfully" }));
                                });
                            });
                        } catch (error) {
                            console.error('Server error:', error);
                            res.writeHead(500, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                            res.end(JSON.stringify({ error: "Server error" }));
                        }
                    });
                    break;

                case PUT:
                    let putBody = BODY_DEFAULT;

                    res.setHeader(CORS.ORIGIN, CLIENT_ORIGIN);
                    req.on(DATA, chunk => putBody += chunk.toString());

                    req.on(END, async () => {
                        try {
                            const parsed = JSON.parse(putBody);
                            const userId = parsed.userId;
                            const newUserType = parsed.userType;
                            const apiCallsIncrement = parsed.apiCallsIncrement;
                            const adminEmail = parsed.adminEmail;
                            const adminPassword = parsed.adminPassword;

                            // Verify admin credentials
                            const adminSql = `SELECT * FROM user WHERE email = ? AND userType = 'admin'`;
                            db.query(adminSql, [adminEmail], async (err, adminResults) => {
                                res.setHeader(HEADER_CONTENT_TYPE, HEADER_JSON_CONTENT);

                                if (err || adminResults.length === 0) {
                                    res.writeHead(401);
                                    res.end(JSON.stringify({ error: "Unauthorized" }));
                                    return;
                                }

                                const admin = adminResults[0];
                                const passwordMatch = await bcrypt.compare(adminPassword, admin.password);

                                if (!passwordMatch) {
                                    res.writeHead(401);
                                    res.end(JSON.stringify({ error: "Invalid password" }));
                                    return;
                                }

                                // Determine what to update
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
                                    res.writeHead(400);
                                    res.end(JSON.stringify({ error: "No update parameters provided" }));
                                    return;
                                }

                                db.query(updateSql, updateParams, (err, result) => {
                                    if (err) {
                                        console.error('Database error:', err);
                                        res.writeHead(500);
                                        res.end(JSON.stringify({ error: SERVER_ERROR_MSG }));
                                        return;
                                    }

                                    res.writeHead(200);
                                    res.end(JSON.stringify({ message: "User updated successfully" }));
                                });
                            });
                        } catch (error) {
                            console.error('Server error:', error);
                            res.writeHead(500, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                            res.end(JSON.stringify({ error: "Server error" }));
                        }
                    });
                    break;

                default:
                    res.writeHead(404, { 
                        [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                        [CORS.ORIGIN]: CLIENT_ORIGIN
                    });
                    res.end(JSON.stringify({ error: NOT_FOUND_MSG }) );
            }
        });

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

module.exports = Main;
