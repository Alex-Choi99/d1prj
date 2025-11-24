const swaggerJSdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Flippy++ API Documentation',
            version: '1.0.0',
            description: 'API documentation for the Flippy++ server'
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Local server'
            }
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                Explanation: {
                    type: 'object',
                    properties: {
                        id: {type: "string"},
                        question: {type: "string"},
                        answer: {type: "string"},
                        sourceText: {type: "string"},
                        explanation: {type: "string"},
                        difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                        createdAt: { type: "string", format: "date-time" },
                        updatedAt: { type: "string", format: "date-time" }
                    }
                },
                CreateExplanationRequest: {
                    type: 'object',
                    required:['question', 'answer', 'sourceText'],
                    properties: {
                        question: {type: "string"},
                        answer: {type: "string"},
                        sourceText: {type: "string"},
                        difficulty: {
                            type: "string",
                            enum: ["easy", "medium", "hard"],
                            default: "medium"
                        }
                    }
                }
            }
        },
        security: [{BearerAuth: []}]
    },
    apis: ["./routes/*.js"]
};

module.exports = swaggerJSdoc(options);