const http = require('http');
const mysql = require('mysql');
require('dotenv').config();

const DB_HOST               = process.env.DB_HOST;
const DB_USER               = process.env.DB_USER;
const DB_PASSWORD           = process.env.DB_PASSWORD;
const DB_NAME               = process.env.DB_NAME;
const PORT                  = 3000;
const HEADER_CONTENT_TYPE   = "Content-Type";
const HEADER_JSON_CONTENT   = "application/json";
const GET                   = "GET";
const POST                  = "POST";
const OPTIONS               = "OPTIONS";
const DATA                  = "data";
const ALL                   = "*";
const BODY_DEFAULT          = "";
const DB_CONNECTION_MSG     = "Connected to database.\n";
const CORS = {
    ORIGIN: 'Access-Control-Allow-Origin',
    METHODS: 'Access-Control-Allow-Methods',
    HEADERS: 'Access-Control-Allow-Headers'
};
const POST_FAIL_MSG     = "Data insertion failed.\n";
const GET_FAIL_MSG      = "Data retrieval failed.\n";

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
            switch(req.method) {
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

                        let email;
                        let password;
                        const parsed = JSON.parse(body);
                        
                        email = parsed.email;
                        password = parsed.password;

                        const sql = `INSERT INTO user (email, password) VALUES (${email}, ${password})`;

                        db.query(sql, (err) => {
                            if (err) {
                                res.end(JSON.stringify({ message: POST_FAIL_MSG }));
                            } else {
                                res.end(JSON.stringify({ message: POST_SUCCESS_MSG }));
                            }
                        });
                    });
                    break;
                
                default:
                    res.writeHead(404, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                    res.end(JSON.stringify({ error: "Not Found" }));
            }
        });

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    }

    static validateEmail(email) {
        
    }
}

module.exports = Main;
