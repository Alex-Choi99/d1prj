const ApiManagerAi = require('./ApiManagerAi.js');
const http = require('http');

const PORT = 3000;
const HEADER_CONTENT_TYPE = "Content-Type";
const HEADER_JSON_CONTENT = "application/json";
const GET = "GET";
const POST = "POST";
const OPTIONS = "OPTIONS";
const DATA = "data";
const END = "end";
const ALL = "*";
const BODY_DEFAULT = "";
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
     * Runs the server
     */
    static runServer() {
        const server = http.createServer((req, res) => {
            res.setHeader(CORS.ORIGIN, ALL);
            res.setHeader(CORS.METHODS, `${GET}, ${POST}, ${OPTIONS}`);
            res.setHeader(CORS.HEADERS, HEADER_CONTENT_TYPE);

            switch(req.method) {
                case OPTIONS:
                    res.writeHead(204);
                    res.end();
                    break;

                case POST:
                    let body = BODY_DEFAULT;

                    req.on(DATA, chunk => body += chunk.toString());

                    req.on(END, async () => {
                        try {
                            body += "\n\nBased on the following content, generate exactly 5 flashcards in the following JSON format. Each flashcard should have a question and a detailed answer. Return ONLY the JSON array, no additional text:\n[{\"question\": \"Your question here?\", \"answer\": \"Your detailed answer here\"}, ...]";
                            const response = await Main.query(body);
                            
                            res.writeHead(200, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                            res.end(JSON.stringify(response));
                        } catch (error) {
                            console.error('Error processing request:', error);
                            res.writeHead(500, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                            res.end(JSON.stringify({ error: "Internal Server Error" }));
                        }
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

    /**
     * Queries the AI model
     */
    static async query(data) {
        const response = await ApiManagerAi.query({ 
            messages: [
                {
                    role: "user",
                    content: data,
                },
            ],
            model: "Qwen/Qwen2.5-7B-Instruct:together",
        });

        return response;
    }
}

module.exports = Main;
