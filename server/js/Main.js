const http = require('http');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const url = require('url');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const PORT = 3000;
const NO_CONTENT = 204;
const NOT_FOUND = 404;
const HEADER_CONTENT_TYPE = "Content-Type";
const HEADER_JSON_CONTENT = "application/json";
const GET = "GET";
const POST = "POST";
const OPTIONS = "OPTIONS";
const DATA = "data";
const END = "end";
const ALL = "*";
const BODY_DEFAULT = "";
const DB_CONNECTION_MSG = "Connected to database.\n";
const POST_FAIL_MSG = "Data insertion failed.\n";
const POST_SUCCESS_MSG = "Data insertion successful.\n";
const GET_FAIL_MSG = "Data retrieval failed.\n";
const NOT_FOUND_MSG = "Not Found";
const ENDPOINT_NOT_FOUND_MSG = "Endpoint not found";
const SIGNUP_PATHNAME = "/signup";
const SIGNIN_PATHNAME = "/signin";
const SAVE_CARDS_PATHNAME = "/save-cards";
const CORS = {
    ORIGIN: 'Access-Control-Allow-Origin',
    METHODS: 'Access-Control-Allow-Methods',
    HEADERS: 'Access-Control-Allow-Headers'
};

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
            const parsedUrl = url.parse(req.url, true);
            const pathname = parsedUrl.pathname;

            // Set CORS headers for all requests
            res.setHeader(CORS.ORIGIN, ALL);
            res.setHeader(CORS.METHODS, `${GET}, ${POST}, ${OPTIONS}`);
            res.setHeader(CORS.HEADERS, HEADER_CONTENT_TYPE);

            switch (req.method) {
                case OPTIONS:
                    res.writeHead(NO_CONTENT);
                    res.end();
                    break;

                case POST:
                    this.handlePost(req, res, db, pathname);
                    break;

                case GET:
                    this.handleGet(req, res, db, pathname, parsedUrl.query);
                    break;

                default:
                    res.writeHead(NOT_FOUND, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                    res.end(JSON.stringify({ error: NOT_FOUND_MSG }));
            }
        });

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }

    /**
     * Handle POST requests
     */
    static handlePost(req, res, db, pathname) {
        let body = BODY_DEFAULT;

        req.on(DATA, chunk => body += chunk.toString());

        req.on(END, async () => {
            try {
                const parsed = JSON.parse(body);

                if (pathname === SIGNUP_PATHNAME) 
                {
                    await this.handleSignup(parsed, res, db);
                } 
                else if (pathname === SIGNIN_PATHNAME) 
                {
                    await this.handleSignin(parsed, res, db);
                } 
                else if (pathname === SAVE_CARDS_PATHNAME) 
                {
                    await this.handleSaveCards(parsed, res, db);
                } 
                else 
                {
                    res.writeHead(NOT_FOUND, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                    res.end(JSON.stringify({ error: ENDPOINT_NOT_FOUND_MSG }));
                }
            } catch (error) {
                console.error('Error handling POST request:', error);
                res.writeHead(500, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                res.end(JSON.stringify({ error: "Internal server error" }));
            }
        });
    }

    /**
     * Handle GET requests
     */
    static handleGet(req, res, db, pathname, query) {
        if (pathname === '/card-groups') {
            this.getCardGroups(query.user_id, res, db);
        } else if (pathname === '/cards') {
            this.getCards(query.group_id, res, db);
        } else {
            res.writeHead(404, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
            res.end(JSON.stringify({ error: "Endpoint not found" }));
        }
    }

    /**
     * Handle user signup
     */
    static async handleSignup(data, res, db) {
        const { email, password } = data;

        if (!email || !password) {
            res.writeHead(400, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
            res.end(JSON.stringify({ error: "Email and password are required" }));
            return;
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const sql = 'INSERT INTO user (email, password) VALUES (?, ?)';

            db.query(sql, [email, hashedPassword], (err, result) => {
                if (err) {
                    console.error('Signup error:', err);
                    res.writeHead(500, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                    res.end(JSON.stringify({ error: POST_FAIL_MSG }));
                } else {
                    res.writeHead(200, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                    res.end(JSON.stringify({
                        message: POST_SUCCESS_MSG,
                        userId: result.insertId
                    }));
                }
            });
        } catch (error) {
            console.error('Hashing error:', error);
            res.writeHead(500, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
            res.end(JSON.stringify({ error: "Error creating account" }));
        }
    }

    /**
     * Handle user signin
     */
    static async handleSignin(data, res, db) {
        const { email, password } = data;

        if (!email || !password) {
            res.writeHead(400, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
            res.end(JSON.stringify({ error: "Email and password are required" }));
            return;
        }

        const sql = 'SELECT * FROM user WHERE email = ?';

        db.query(sql, [email], async (err, results) => {
            if (err) {
                console.error('Signin error:', err);
                res.writeHead(500, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                res.end(JSON.stringify({ error: "Error signing in" }));
                return;
            }

            if (results.length === 0) {
                res.writeHead(401, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                res.end(JSON.stringify({ error: "Invalid credentials" }));
                return;
            }

            const user = results[0];
            const match = await bcrypt.compare(password, user.password);

            if (match) {
                res.writeHead(200, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                res.end(JSON.stringify({
                    message: "Sign in successful",
                    userId: user.id,
                    email: user.email
                }));
            } else {
                res.writeHead(401, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                res.end(JSON.stringify({ error: "Invalid credentials" }));
            }
        });
    }

    /**
     * Handle saving flash cards to database
     */
    static async handleSaveCards(data, res, db) {
        const { userId, groupName, groupDescription, cards } = data;

        if (!userId || !groupName || !cards || cards.length === 0) {
            res.writeHead(400, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
            res.end(JSON.stringify({ error: "Missing required fields" }));
            return;
        }

        // Insert card group
        const groupSql = 'INSERT INTO card_groups (user_id, name, description) VALUES (?, ?, ?)';

        db.query(groupSql, [userId, groupName, groupDescription || ''], (err, groupResult) => {
            if (err) {
                console.error('Error creating card group:', err);
                res.writeHead(500, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                res.end(JSON.stringify({ error: "Failed to create card group" }));
                return;
            }

            const groupId = groupResult.insertId;

            // Insert cards
            const cardSql = 'INSERT INTO cards (group_id, question, answer) VALUES ?';
            const cardValues = cards.map(card => [groupId, card.question, card.answer]);

            db.query(cardSql, [cardValues], (err, cardResult) => {
                if (err) {
                    console.error('Error inserting cards:', err);
                    res.writeHead(500, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                    res.end(JSON.stringify({ error: "Failed to save cards" }));
                    return;
                }

                res.writeHead(200, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                res.end(JSON.stringify({
                    message: "Cards saved successfully",
                    groupId: groupId,
                    cardsCount: cardResult.affectedRows
                }));
            });
        });
    }

    /**
     * Get card groups for a user
     */
    static getCardGroups(userId, res, db) {
        if (!userId) {
            res.writeHead(400, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
            res.end(JSON.stringify({ error: "User ID is required" }));
            return;
        }

        const sql = 'SELECT * FROM card_groups WHERE user_id = ? ORDER BY created_at DESC';

        db.query(sql, [userId], (err, results) => {
            if (err) {
                console.error('Error fetching card groups:', err);
                res.writeHead(500, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                res.end(JSON.stringify({ error: GET_FAIL_MSG }));
            } else {
                res.writeHead(200, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                res.end(JSON.stringify(results));
            }
        });
    }

    /**
     * Get cards for a specific group
     */
    static getCards(groupId, res, db) {
        if (!groupId) {
            res.writeHead(400, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
            res.end(JSON.stringify({ error: "Group ID is required" }));
            return;
        }

        const sql = 'SELECT * FROM cards WHERE group_id = ? ORDER BY created_at ASC';

        db.query(sql, [groupId], (err, results) => {
            if (err) {
                console.error('Error fetching cards:', err);
                res.writeHead(500, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                res.end(JSON.stringify({ error: GET_FAIL_MSG }));
            } else {
                res.writeHead(200, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                res.end(JSON.stringify(results));
            }
        });
    }

    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

module.exports = Main;
