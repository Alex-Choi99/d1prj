const express = require('express');
const swaggerUI = require('swagger-ui-express');
const swaggerDocs = require('./docs/swaggerDocs.js');

const explanationRoutes = require('./routes/explanations.routes.js');
const authRoutes = require('./routes/auth.routes.js');

const PORT = process.env.PORT || 5000;

const app = express();
app.use(express.json());

app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

app.use('/api/explanations', explanationRoutes);
app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
    

