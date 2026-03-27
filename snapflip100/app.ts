import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import session from "express-session";
import admin from "firebase-admin";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
try {
  if (!admin.apps.length) {
    let projectId = process.env.FIREBASE_PROJECT_ID;
    
    // Try to get projectId from config file if not in env
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (!projectId && fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      projectId = config.projectId;
    }

    admin.initializeApp({
      projectId: projectId || "smart-flip-489617"
    });
    console.log(`Firebase Admin initialized with project: ${projectId || "smart-flip-489617"}`);
  }
} catch (error) {
  console.error("Error initializing Firebase Admin:", error);
}
const db = admin.firestore();

const app = express();
const APP_URL = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'smartflip-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: 'none',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
}));

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV, firebaseConfigured: true, hasGeminiKey: !!process.env.GEMINI_API_KEY });
});

app.post("/api/ai/analyze", async (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: "No image provided" });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Gemini API Key is missing on server" });

  try {
    const mimeTypeMatch = image.match(/^data:(image\/[a-z]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    const cleanBase64Data = base64Data.replace(/\s/g, '');

    const prompt = `Analyze this photo of a resale item. 
    Identify the Brand, Item Type (Shoes, Clothing, or Accessory), and Condition (New, Like New, or Used).
    Also, suggest a catchy marketplace title and a short, professional description.
    Estimate a realistic average resale price based on common market values for this type of item.
    Determine the sell-through rate (High, Medium, or Low).`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: cleanBase64Data } }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brand: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["Shoes", "Clothing", "Accessory"] },
            condition: { type: Type.STRING, enum: ["New", "Like New", "Used"] },
            suggestedTitle: { type: Type.STRING },
            suggestedDescription: { type: Type.STRING },
            estimatedResalePrice: { type: Type.NUMBER },
            sellThroughRate: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
            itemName: { type: Type.STRING }
          },
          required: ["brand", "type", "condition", "suggestedTitle", "suggestedDescription", "estimatedResalePrice", "sellThroughRate", "itemName"]
        }
      }
    });

    res.json(JSON.parse(response.text));
  } catch (error: any) {
    console.error("Gemini Server Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ai/remove-background", async (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: "No image provided" });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: "Gemini API Key is missing on server" });

  try {
    const mimeTypeMatch = image.match(/^data:(image\/[a-z]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    const cleanBase64Data = base64Data.replace(/\s/g, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: cleanBase64Data, mimeType } },
          { text: 'Remove the background from this image. Keep only the main item and place it on a clean, solid white background. Return the edited image.' },
        ],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return res.json({ image: `data:image/png;base64,${part.inlineData.data}` });
      }
    }
    res.status(500).json({ error: "No image returned from AI" });
  } catch (error: any) {
    console.error("Gemini BG Removal Server Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !sig || !webhookSecret) return res.status(400).send('Webhook Error: Missing configuration');

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userEmail = session.metadata?.userEmail;
    const tier = session.metadata?.tier;

    if (userEmail && tier) {
      let maxLookups = 10;
      if (tier === 'Pro') maxLookups = 100;
      if (tier === 'Unlimited') maxLookups = 999999;

      try {
        // Find user by email in Firestore
        const usersRef = db.collection('profiles');
        const snapshot = await usersRef.where('email', '==', userEmail.toLowerCase()).limit(1).get();
        
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          await userDoc.ref.update({
            subscriptionTier: tier,
            maxLookups
          });
          console.log(`Updated subscription for ${userEmail} to ${tier}`);
        }
      } catch (error) {
        console.error("Error updating subscription via webhook:", error);
      }
    }
  }
  res.json({ received: true });
});

app.post("/api/stripe/create-checkout-session", async (req, res) => {
  if (!stripe) return res.status(500).json({ error: "Stripe is not configured" });
  const { tier, userEmail } = req.body;
  let amount = tier === 'Pro' ? 999 : (tier === 'Unlimited' ? 1999 : 0);
  if (!amount) return res.status(400).json({ error: "Invalid tier" });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: `Snap Flip ${tier} Plan` }, unit_amount: amount }, quantity: 1 }],
      mode: 'payment',
      success_url: `${APP_URL}/?payment=success`,
      cancel_url: `${APP_URL}/?payment=cancel`,
      metadata: { userEmail: userEmail.toLowerCase(), tier }
    });
    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { app };
