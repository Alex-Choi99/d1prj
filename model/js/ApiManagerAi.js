require('dotenv').config();

/**
 * Makes API calls to the AI
 */
class ApiManagerAi {
    /**
     * Makes a query to the AI API
     * @param {*} data | data to send to the API
     * @returns response from the API
     */
    static async query(data) {
        const response = await fetch(
            "https://router.huggingface.co/v1/chat/completions",
            {
                headers: {
                    Authorization: `Bearer ${process.env.HF_TOKEN}`,
                    "Content-Type": "application/json",
                },
                method: "POST",
                body: JSON.stringify(data),
            }
        );

        const result = await response.json();

        return result;
    }
}

module.exports = ApiManagerAi;
