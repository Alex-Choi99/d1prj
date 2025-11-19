const ApiManagerAi = require('./ApiManagerAi.js');
const http = require('http');

const PORT = 3001;
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
                            const prompt = body + "\n\nBased on the following content, generate 10 flashcard questions and answers. " +
                                "Return ONLY a valid JSON array with no additional text. Each object must have 'question' and 'answer' fields. " +
                                "Format: [{\"question\": \"...\", \"answer\": \"...\"}, ...]. " +
                                "Keep questions clear and concise. Keep answers brief and accurate.";
                            
                            const response = await Main.query(prompt);
                            
                            // Extract the message content
                            const messageContent = response.choices[0].message.content;
                            
                            // Parse the JSON from the response
                            let cards;
                            try {
                                // Try to extract JSON if it's wrapped in markdown code blocks
                                const jsonMatch = messageContent.match(/\[[\s\S]*\]/);
                                if (jsonMatch) {
                                    cards = JSON.parse(jsonMatch[0]);
                                } else {
                                    cards = JSON.parse(messageContent);
                                }

                                // Validate that we have an array of cards
                                if (!Array.isArray(cards) || cards.length === 0) {
                                    throw new Error("Invalid cards format");
                                }

                                // Return structured response with cards
                                res.writeHead(200, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                                res.end(JSON.stringify({
                                    success: true,
                                    cards: cards,
                                    count: cards.length,
                                    model: response.model,
                                    usage: response.usage
                                }));
                            } catch (parseError) {
                                console.error('Error parsing AI response:', parseError);
                                console.log('AI Response:', messageContent);
                                res.writeHead(500, { [HEADER_CONTENT_TYPE]: HEADER_JSON_CONTENT });
                                res.end(JSON.stringify({ 
                                    error: "Failed to parse flashcards from AI response",
                                    rawResponse: messageContent
                                }));
                            }
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
