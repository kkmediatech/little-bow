require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const { OpenAI } = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(bodyParser.json());

// ✅ ตั้งค่า Webhook สำหรับ Facebook
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ✅ รับข้อความจาก Messenger
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    body.entry.forEach(async (entry) => {
      const webhookEvent = entry.messaging[0];
      const senderId = webhookEvent.sender.id;

      if (webhookEvent.message) {
        const userMessage = webhookEvent.message.text;
        const aiResponse = await getOpenAIResponse(userMessage);
        sendMessage(senderId, aiResponse);
      }
    });

    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// ✅ ใช้ OpenAI API ตอบข้อความ
async function getOpenAIResponse(userMessage) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: userMessage }],
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    return "ขอโทษค่ะ มีปัญหาในการประมวลผล";
  }
}

// ✅ ส่งข้อความกลับไปที่ Messenger
async function sendMessage(senderId, messageText) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: senderId },
        message: { text: messageText },
      }
    );
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
