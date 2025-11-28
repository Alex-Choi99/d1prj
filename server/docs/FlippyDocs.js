const path = require('path');
const flippyDoc = require('swagger-jsdoc');

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
                url: 'http://localhost:3001',
                description: 'Flippy++ server',
            },
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'session_token',
                }
            }
        }
    },
    apis: [path.join(__dirname, '../js/Main.js')]
}
module.exports = flippyDoc(options);