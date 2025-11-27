const http = require('http');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const JWT_EXPIRES = "7d"; // or "1h", "30m", etc.
const HEADER_CONTENT_TYPE = "Content-Type";
const HEADER_JSON_CONTENT = "application/json";
const GET = "GET";
const POST = "POST";
const OPTIONS = "OPTIONS";
const DELETE = "DELETE";
const PUT = "PUT";
const DATA = "data";
const ALL = "*";
const CLIENT_ORIGIN = "http://localhost:8000";
const BODY_DEFAULT = "";
const END = "end";
const DB_CONNECTION_MSG = "Connected to database.\n";
const CORS = {
    ORIGIN: 'Access-Control-Allow-Origin',
    METHODS: 'Access-Control-Allow-Methods',
    HEADERS: 'Access-Control-Allow-Headers',
    CREDENTIALS: 'Access-Control-Allow-Credentials'
};
const POST_FAIL_MSG = "Data insertion failed.\n";
const POST_SUCCESS_MSG = "Data inserted successfully.\n";
const INVALID_EMAIL_MSG = "Invalid email format.\n";
const SERVER_ERROR_MSG = "Server error.\n";
const EMAIL_ALREADY_IN_USE_MSG = "Email already in use.\n";
const INVALID_INPUT_MSG = "Invalid email or password.\n";
const NOT_FOUND_MSG = "Not Found.\n";

/**
 * Runs the program
 */
class Main {

    /**
     * Entry Point
     */
    static main() {
        const db = mysql.createConnection({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME
        });

        db.connect((err) => {
            if (err) {
                throw err;
            }

            console.log(DB_CONNECTION_MSG);
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
                    Main.handleGet(req, res, db);
                    break;

                case POST:
                    Main.handlePost(req, res, db);
                    break;

                default:
                    res.writeHead(404, {
                        [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                        [CORS.ORIGIN]: CLIENT_ORIGIN
                    });
                    res.end(JSON.stringify({ error: NOT_FOUND_MSG }));
            }
        });

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }

    static handlePost(req, res, db) {
        let body = BODY_DEFAULT;

        res.setHeader(CORS.ORIGIN, CLIENT_ORIGIN);
        req.on(DATA, chunk => body += chunk.toString());

        req.on(END, () => {
            try {
                const parsed = JSON.parse(body);
                const email = parsed.email;
                const password = parsed.password;

                if (req.url === '/signup') {
                    Main.signup(db, email, password, res);
                } else if (req.url === '/signin') {
                    Main.signin(db, email, password, res);
                }
                else if (req.url === '/create_card_group') {
                    Main.create_card_group(parsed, req, res, db);
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
    }

    static handleGet(req, res, db) {
        res.setHeader(CORS.ORIGIN, CLIENT_ORIGIN);
        res.setHeader('Access-Control-CLIENT_ORIGINow-Credentials', 'true');

        if (req.url === '/admin/users') {
            Main.adminPage(db, req, res);
        } else {
            res.writeHead(404, {
                [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                [CORS.ORIGIN]: CLIENT_ORIGIN
            });
            res.end(JSON.stringify({ error: NOT_FOUND_MSG }));
        }
    }

    static verifyToken(req) {
        const auth = req.headers['authorization'];
        if (!auth) return null;

        const [, token] = auth.split(" ");

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            return decoded;
        } catch (err) {
            return null;
        }
    }

    static signup(db, email, password, res) {
        if (!this.validateEmail(email)) {
            res.writeHead(400, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
            res.end(JSON.stringify({ message: INVALID_EMAIL_MSG }));
            return;
        }

        const checkEmailSql = `SELECT email FROM user WHERE email = ?`;

        db.query(checkEmailSql, [email], async (err, results) => {
            if (results.length > 0) {
                res.writeHead(409, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
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
    }

    static signin(db, email, password, res) {
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
                const token = jwt.sign(
                    {
                        userId: user.id,
                        email: user.email
                    },
                    JWT_SECRET,
                    { expiresIn: JWT_EXPIRES }
                );

                res.writeHead(200, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                res.end(JSON.stringify({
                    message: "Sign in successful",
                    email: user.email,
                    token: token
                }));
            } else {
                res.writeHead(401, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                res.end(JSON.stringify({ error: INVALID_INPUT_MSG }));
            }
        });
    }

    static create_card_group(body, req, res, db) {
        // Get user ID from session
        const user = Main.verifyToken(req);

        if (!user) {
            res.writeHead(401, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
            res.end(JSON.stringify({ error: "Invalid or missing token" }));
            return;
        }

        const userId = user.userId;

        const { name, description, cards } = body;

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

                res.writeHead(200, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                res.end(JSON.stringify({
                    message: 'Card group created successfully',
                    groupId: groupId,
                    cardsCreated: cardResult.affectedRows
                }));
            });
        });
    }

    static adminPage(db, req, res) {
        const sql = `SELECT id, email, password, userType FROM user`;

        db.query(sql, (err, results) => {
            res.setHeader(HEADER_CONTENT_TYPE, HEADER_JSON_CONTENT);

            if (err) {
                console.error('Database error:', err);
                res.writeHead(500, { [CORS.ORIGIN]: CLIENT_ORIGIN });
                res.end(JSON.stringify({ error: SERVER_ERROR_MSG }));
                return;
            }

            res.writeHead(200, { [CORS.ORIGIN]: CLIENT_ORIGIN });
            res.end(JSON.stringify({ users: results }));
        });
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}



module.exports = Main;
