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
const DATA                  = "data";
const ALL                   = "*";
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
                    res.setHeader(CORS.ORIGIN, ALL);
                    res.setHeader(CORS.METHODS, `${GET}, ${POST}, ${OPTIONS}`);
                    res.setHeader(CORS.HEADERS, HEADER_CONTENT_TYPE);
                    res.end();
                    break;

                case POST:
                    let body = BODY_DEFAULT;

                    res.setHeader(CORS.ORIGIN, ALL);
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
                                        [CORS.ORIGIN]: ALL
                                    });
                                    res.end(JSON.stringify({ message: INVALID_EMAIL_MSG }));
                                    return;
                                }

                                const checkEmailSql = `SELECT email FROM user WHERE email = ?`;

                                db.query(checkEmailSql, [email], async (err, results) => {
                                    if (results.length > 0) {
                                        res.writeHead(409, { 
                                            [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                                            [CORS.ORIGIN]: ALL
                                        });
                                        res.end(JSON.stringify({ message: EMAIL_ALREADY_IN_USE_MSG }));
                                        return;
                                    }
                                    
                                    if (err) {
                                        console.error('Database error:', err);
                                        res.writeHead(500, { 
                                            [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                                            [CORS.ORIGIN]: ALL
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
                                            res.writeHead(400, { [CORS.ORIGIN]: ALL });
                                            res.end(JSON.stringify({ message: POST_FAIL_MSG }));
                                        } else {
                                            res.writeHead(200, { [CORS.ORIGIN]: ALL });
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
                                        res.writeHead(500, { [CORS.ORIGIN]: ALL });
                                        res.end(JSON.stringify({ error: SERVER_ERROR_MSG }));
                                        return;
                                    }

                                    if (results.length === 0) {
                                        res.writeHead(401, { [CORS.ORIGIN]: ALL });
                                        res.end(JSON.stringify({ error: INVALID_INPUT_MSG }));
                                        return;
                                    }

                                    const user = results[0];

                                    // Compare password with hashed password
                                    const passwordMatch = await bcrypt.compare(password, user.password);

                                    if (passwordMatch) {
                                        res.writeHead(200, { [CORS.ORIGIN]: ALL });
                                        res.end(JSON.stringify({
                                            message: "Sign in successful",
                                            email: user.email
                                        }));
                                    } else {
                                        res.writeHead(401, { [CORS.ORIGIN]: ALL });
                                        res.end(JSON.stringify({ error: INVALID_INPUT_MSG }) );
                                    }
                                });
                            }
                        }
                        catch (error) {
                            console.error('Server error:', error);
                            res.writeHead(500, { 
                                [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                                [CORS.ORIGIN]: ALL
                            });
                            res.end(JSON.stringify({ error: "Server error" }));
                        }
                    });
                    break;

                default:
                    res.writeHead(404, { 
                        [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT,
                        [CORS.ORIGIN]: ALL
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
