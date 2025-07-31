require("dotenv").config();
const axios = require("axios");

const apiKey = process.env.GROQ_API_KEY;
const model = process.env.GROQ_MODEL;
const baseURL = "https://api.groq.com/openai/v1/chat/completions";

async function getAIReply(message) {
  try {
    const res = await axios.post(
      baseURL,
      {
        model,
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: message }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );
    return res.data.choices[0].message.content.trim();
  } catch (err) {
    console.error("AI Error:", err.response?.data || err.message);
    return "⚠️ AI error, please try again.";
  }
}

module.exports = { getAIReply };
