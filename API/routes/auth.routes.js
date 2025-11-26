const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const router = express.Router();

/**
 * @swagger
 * /api/auth/generate-explanation-token:
 *   post:
 *     summary: Generate JWT token for creating/regenerating AI explanations
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               explanationId:
 *                 type: string
 *                 description: ID of explanation (for regeneration)
 *               difficulty:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *                 description: Difficulty level for the explanation
 *               context:
 *                 type: object
 *                 description: Additional context (topic, user preferences, etc.)
 *     responses:
 *       200:
 *         description: Explanation token generated
 *       400:
 *         description: Invalid request
 */
router.post("/generate_explanation_token", (req, res) => {
    try
    {
        const { explanationId, difficulty, context } = req.body;

        if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
            return res.status(400).send("Invalid difficulty level");
        }

        const token = jwt.sign(
            {
                type: "explanation",
                explanationId: explanationId || null,
                difficulty: difficulty,
                context: context || {}
            },
            process.env.JWT_SECRET,
            { 
                expiresIn: '24h'
            }
        );
        res.cookie("explanation_token", token, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        res.status(200).json({
            message: "Explanation token generated",
            expiresIn: '24h'
        });
    } catch (error) {
        console.error("Error generating explanation token:", error);
        res.status(500).send("Server error");
    }
});

module.exports = router;