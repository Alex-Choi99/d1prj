const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login to get JWT token (HttpOnly cookie)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 */
router.post("/login", (req, res) => {
    const token = jwt.sign({user: "example"}, "secret", {
        expiresIn: '1h'
    });

    res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
    });

    res.status(200).send("Login successful");
});

module.exports = router;