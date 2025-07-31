import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from "@whiskeysockets/baileys"
import P from "pino"
import dotenv from "dotenv"
import fetch from "node-fetch"
import { makeInMemoryStore } from "@whiskeysockets/baileys"

dotenv.config()

const store = makeInMemoryStore({ logger: P().child({ level: "fatal", stream: "store" }) })

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info")

  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    printQRInTerminal: true,
    logger: P({ level: "silent" }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P({ level: "silent" }))
    }
  })

  store.bind(sock.ev)

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const sender = msg.key.remoteJid
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text

    if (!text) return

    console.log(`💬 ${sender}: ${text}`)

    const reply = await getAIReply(text)

    await sock.sendMessage(sender, { text: reply })
    console.log(`🤖 Replied: ${reply}`)
  })
}

connectToWhatsApp()

async function getAIReply(userMessage) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "mixtral-8x7b-32768",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: userMessage }
        ]
      })
    })

    const data = await res.json()
    return data.choices?.[0]?.message?.content || "Sorry, I couldn't respond."
  } catch (err) {
    console.error("AI error:", err)
    return "There was an error getting the reply."
  }
           }
