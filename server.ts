import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  setDoc,
  query,
  where,
  deleteDoc
} from "firebase/firestore";
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL 
} from "firebase/storage";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Load Firebase configuration
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
if (!fs.existsSync(configPath)) {
  console.error("firebase-applet-config.json not found!");
  process.exit(1);
}
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || "(default)");
const storage = getStorage(firebaseApp);

// Vocals Cache directory definition
const VOCALS_CACHE_DIR = path.join("/tmp", "vocals_cache");
if (!fs.existsSync(VOCALS_CACHE_DIR)) {
  fs.mkdirSync(VOCALS_CACHE_DIR, { recursive: true });
}

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Custom Simple Hash for password representation (safety first, avoiding plain-text displays in tools/logs where possible)
function hashPassword(password: string): string {
  // Simple Base64-like reversible obfuscation or a light cipher for simple storage
  return Buffer.from(password).toString("base64");
}

// ---------------- AUTH ENDPOINTS ----------------

// User Sign Up
app.post("/api/auth/signup", async (req: Request, res: Response): Promise<any> => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: "Missing email, password, or displayName" });
  }

  try {
    const emailLower = email.toLowerCase().trim();
    // Check if user already exists
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", emailLower));
    const snap = await getDocs(q);

    if (!snap.empty) {
      return res.status(400).json({ error: "This email address is already registered." });
    }

    const adminEmail = "rk89experiment@gmail.com";
    const role = emailLower === adminEmail.toLowerCase() ? "admin" : "user";
    const uid = "u_" + Math.random().toString(36).substr(2, 9);

    const newProfile = {
      uid,
      email: emailLower,
      password: hashPassword(password),
      displayName: displayName.trim(),
      role,
      subscriptionStatus: role === "admin" ? "Active" : "None",
      subscriptionExpiry: "",
      updatedAt: new Date().toISOString()
    };

    // Save to Firestore
    await setDoc(doc(db, "users", uid), newProfile);

    // Don't return the password field
    const { password: _, ...safeProfile } = newProfile;
    return res.json({ success: true, profile: safeProfile });
  } catch (error: any) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: error.message || "Failed to sign up" });
  }
});

// User Login
app.post("/api/auth/login", async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  try {
    const emailLower = email.toLowerCase().trim();
    const hashedPassword = hashPassword(password);

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", emailLower));
    const snap = await getDocs(q);

    if (snap.empty) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    let authenticatedUser: any = null;
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.password === hashedPassword) {
        authenticatedUser = { uid: docSnap.id, ...data };
      }
    });

    if (!authenticatedUser) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Don't return the password
    const { password: _, ...safeProfile } = authenticatedUser;
    return res.json({ success: true, profile: safeProfile });
  } catch (error: any) {
    console.error("Login error:", error);
    return res.status(500).json({ error: error.message || "Failed to log in" });
  }
});

// Get User Profile (Me)
app.get("/api/auth/me", async (req: Request, res: Response): Promise<any> => {
  const { uid } = req.query;
  if (!uid || typeof uid !== "string") {
    return res.status(400).json({ error: "Missing or invalid uid" });
  }

  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const { password: _, ...safeProfile } = userDoc.data()!;
    safeProfile.uid = userDoc.id;
    return res.json({ success: true, profile: safeProfile });
  } catch (error: any) {
    console.error("Get profile error:", error);
    return res.status(500).json({ error: error.message || "Failed to load profile" });
  }
});

// Update profile / Request Subscription
app.post("/api/auth/update", async (req: Request, res: Response): Promise<any> => {
  const { uid, subscriptionStatus } = req.body;
  if (!uid) {
    return res.status(400).json({ error: "Missing uid" });
  }

  try {
    const userDocRef = doc(db, "users", uid);
    const updates: any = { updatedAt: new Date().toISOString() };
    if (subscriptionStatus !== undefined) updates.subscriptionStatus = subscriptionStatus;

    await updateDoc(userDocRef, updates);

    const updatedDoc = await getDoc(userDocRef);
    const { password: _, ...safeProfile } = updatedDoc.data()!;
    safeProfile.uid = updatedDoc.id;

    return res.json({ success: true, profile: safeProfile });
  } catch (error: any) {
    console.error("Update profile error:", error);
    return res.status(500).json({ error: error.message || "Failed to update profile" });
  }
});


// Helper function to generate Google Translate TTS
async function generateGoogleTTS(text: string, lang: string): Promise<Buffer> {
  try {
    console.log(`Attempting Google Translate TTS for language: ${lang}...`);
    const truncatedText = text.substring(0, 200); // Google Translate supports up to 200 characters
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(truncatedText)}&tl=${lang}&client=tw-ob`;
    
    const response = await fetch(googleTtsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    
    if (!response.ok) {
      throw new Error(`Google Translate TTS failed: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log("Google Translate TTS generated successfully!");
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error(`Google Translate TTS failed for language ${lang}:`, err);
    throw err;
  }
}

// Helper function to generate energetic DJ vocals with TikTok TTS and a foolproof Google Translate fallback
async function generateTTSBuffer(text: string, voiceType: string): Promise<Buffer> {
  // Determine if it is Hindi or contains Hindi/Devanagari characters
  const isHindi = /[\u0900-\u097F]/.test(text);

  if (isHindi) {
    console.log(`Text contains Hindi characters. Bypassing TikTok TTS and using Google Translate TTS with Hindi voice...`);
    try {
      return await generateGoogleTTS(text, "hi");
    } catch (err) {
      console.warn("Hindi Google Translate TTS failed, falling back to English voice", err);
    }
  }

  // Determine TikTok voice code
  let tiktokVoice = "en_us_010"; // Default Hype Male
  if (voiceType === "male") {
    tiktokVoice = "en_us_010";
  } else if (voiceType === "female") {
    tiktokVoice = "en_us_001";
  } else if (voiceType && voiceType.trim()) {
    tiktokVoice = voiceType.trim();
  }

  try {
    console.log(`Attempting TikTok TTS (Ottsy) for voice: ${tiktokVoice}`);
    const response = await fetch("https://ottsy.weilbyte.dev/api/generation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voice: tiktokVoice, text })
    });
    
    if (response.ok) {
      const json = await response.json() as any;
      if (json && json.success && json.data) {
        console.log("TikTok TTS generated successfully!");
        return Buffer.from(json.data, "base64");
      } else {
        console.warn("TikTok TTS response did not indicate success:", json);
      }
    } else {
      console.warn(`TikTok TTS returned status: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    console.error("TikTok TTS failed, trying Google Translate fallback...", err);
  }

  // Fallback to Google Translate TTS
  try {
    console.log("Attempting Google Translate TTS fallback...");
    const lang = isHindi ? "hi" : "en";
    return await generateGoogleTTS(text, lang);
  } catch (err) {
    console.error("All TTS options failed:", err);
    throw new Error(`All TTS options failed. Final error: ${err instanceof Error ? err.message : String(err)}`);
  }
}


// Helper function to use Gemini for generating high-energy DJ vocal text
async function getEnhancedTextUsingGemini(userText: string, djName: string, voiceType: string): Promise<string> {
  const textToEnhance = userText || djName || "";
  if (!textToEnhance.trim()) return "";

  try {
    // 1. Fetch admin system prompt setting or use default
    const promptDocRef = doc(db, "settings", "ai_prompt");
    const promptDocSnap = await getDoc(promptDocRef);
    let systemPrompt = "You are a professional DJ voice artist. Convert normal text into a powerful DJ announcement style with energy, bass feeling and stage performance.";
    if (promptDocSnap.exists()) {
      systemPrompt = promptDocSnap.data().systemPrompt || systemPrompt;
    }

    // 2. Classify voice style (male vs female)
    const isFemale = voiceType.includes("female") || voiceType === "female" || ["en_us_001", "en_us_002", "en_uk_003"].includes(voiceType);
    const voiceStyleDesc = isFemale ? "female DJ voice" : "male DJ voice";

    // 3. Command Gemini to enhance text for a high-energy, local Hindi girl DJ drop signature
    const geminiPrompt = `You are a professional Hindi female DJ voice artist.
Your job is to convert the user's input name/text into an extremely energetic, high-vibe, modern Indian female DJ producer tag or vocal drop.

The script must be written in simple Roman English / Hinglish (so that an English Text-To-Speech reader can pronounce it perfectly in Hindi/Hinglish with a beautiful professional local accent).

Here are some top-tier Hinglish/English style examples:
- Input: "DJ Gautam" -> Output: "DJ Gautam, DJ Gautam... dhum machane aa gayi... in the mix... ready or not!"
- Input: "DJ Amit" -> Output: "Bass badha do, shor macha do, aapka apna DJ Amit aa gaya!"
- Input: "DJ Rahul" -> Output: "Aaya aapka apna, DJ Rahul... floor pe aao, shor machao!"
- Input: "DJ Suman" -> Output: "Dhak dhak beats ke saath... pesh hai... DJ Suman... check it out!"

Rules:
1. ONLY output the final styled Hinglish/English text to be read aloud by the ${voiceStyleDesc}.
2. Do NOT include any background descriptions, sound effects in brackets (e.g. No [music starts], [sfx], etc.), emojis, or introductory chat.
3. Make it extremely catchy, energetic, and suitable for a club track or song drop.
4. Keep it short and sweet (under 140 characters) so that the drop is extremely punchy in songs.
5. User Input Text: "${textToEnhance}"`;

    console.log(`Calling Gemini API to enhance text: "${textToEnhance}"`);
    const aiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: geminiPrompt,
      config: {
        systemInstruction: systemPrompt,
      }
    });

    let enhancedText = aiResponse.text?.trim() || textToEnhance;
    // Strip markdown and bracket characters
    enhancedText = enhancedText.replace(/[*_#`\[\]]/g, "");
    console.log(`Gemini Enhanced Text result: "${enhancedText}"`);
    return enhancedText;
  } catch (err) {
    console.error("Gemini text enhancement failed, falling back to original text:", err);
    return textToEnhance.replace(/[*_#`\[\]]/g, "");
  }
}


// Background processor to generate vocal without admin manual approval for Premium/Admin users
async function processVocalRequestBackground(requestId: string) {
  try {
    console.log(`Starting automatic vocal generation for request ${requestId}...`);
    const reqDocRef = doc(db, "requests", requestId);
    const reqDocSnap = await getDoc(reqDocRef);
    if (!reqDocSnap.exists()) return;

    const requestData = reqDocSnap.data();
    const { djName, userText, voiceType } = requestData;

    // Enhance text using Gemini
    const enhancedText = await getEnhancedTextUsingGemini(userText, djName, voiceType);
    console.log(`[Auto-Gen] Generating vocal with enhanced text: "${enhancedText}"`);

    // Call robust TTS API helper
    const buffer = await generateTTSBuffer(enhancedText, voiceType);

    // Convert buffer to base64 for persistent Firestore storage
    const audioDataBase64 = buffer.toString("base64");
    const audioUrl = `/api/vocals/${requestId}.mp3`;

    // Cache locally
    const localPath = path.join(VOCALS_CACHE_DIR, `${requestId}.mp3`);
    fs.writeFileSync(localPath, buffer);

    // Update request in Firestore (saving base64 data for absolute permanence)
    await updateDoc(reqDocRef, {
      enhancedText,
      audioUrl,
      audioData: audioDataBase64,
      status: "Completed",
      updatedAt: new Date().toISOString()
    });
    console.log(`Automatic vocal request ${requestId} generation completed successfully!`);
  } catch (error: any) {
    console.error(`Automatic vocal generation failed for request ${requestId}:`, error);
    try {
      await updateDoc(doc(db, "requests", requestId), {
        status: "Pending",
        error: error.message || "Automatic voice generation failed."
      });
    } catch (e) {
      console.error("Revert status failed:", e);
    }
  }
}


// GET Vocal Audio File Endpoint
app.get("/api/vocals/:id.mp3", async (req: Request, res: Response): Promise<any> => {
  const { id } = req.params;
  const localPath = path.join(VOCALS_CACHE_DIR, `${id}.mp3`);

  console.log(`GET /api/vocals/${id}.mp3: Request received`);

  // 1. Check if it exists in local cache
  if (fs.existsSync(localPath)) {
    console.log(`GET /api/vocals/${id}.mp3: Found in local cache`);
    res.setHeader("Content-Type", "audio/mpeg");
    return res.sendFile(localPath);
  }

  // 2. Otherwise, fetch from Firestore
  try {
    console.log(`GET /api/vocals/${id}.mp3: Fetching from Firestore`);
    const docRef = doc(db, "requests", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      console.warn(`GET /api/vocals/${id}.mp3: Request document not found in Firestore`);
      return res.status(404).json({ error: "Vocal request not found" });
    }

    const data = snap.data();
    if (data.audioData) {
      console.log(`GET /api/vocals/${id}.mp3: Found audioData in Firestore, saving to local cache`);
      const buffer = Buffer.from(data.audioData, "base64");
      fs.writeFileSync(localPath, buffer);
      res.setHeader("Content-Type", "audio/mpeg");
      return res.sendFile(localPath);
    }

    console.warn(`GET /api/vocals/${id}.mp3: audioData field is missing in Firestore`);
    return res.status(404).json({ error: "Vocal audio not yet generated or missing" });
  } catch (err: any) {
    console.error(`GET /api/vocals/${id}.mp3: Error serving vocal audio:`, err);
    return res.status(500).json({ error: "Failed to retrieve vocal audio" });
  }
});


// ---------------- REQUESTS ENDPOINTS ----------------

// Create Vocal Request
app.post("/api/requests", async (req: Request, res: Response): Promise<any> => {
  const { userId, userName, djName, userText, voiceType } = req.body;
  if (!userId || !userName || !djName || !userText || !voiceType) {
    return res.status(400).json({ error: "Missing required request parameters" });
  }

  try {
    // Check if the user is Premium (Active subscription) or Admin
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.exists() ? userDoc.data() : null;
    
    const isPremium = userData?.subscriptionStatus === "Active" || userData?.role === "admin";

    const id = "req_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    const newRequest = {
      id,
      userId,
      userName,
      djName: djName.trim(),
      userText: userText.trim(),
      voiceType,
      status: isPremium ? "Processing" : "Pending",
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, "requests", id), newRequest);

    if (isPremium) {
      // Execute vocal generation in background asynchronously
      processVocalRequestBackground(id);
    }

    return res.json({ success: true, request: newRequest });
  } catch (error: any) {
    console.error("Create request error:", error);
    return res.status(500).json({ error: error.message || "Failed to submit request" });
  }
});

// Get User's Vocal Requests
app.get("/api/requests", async (req: Request, res: Response): Promise<any> => {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "Missing or invalid userId" });
  }

  try {
    const q = query(collection(db, "requests"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    // Sort descending by createdAt
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json(list);
  } catch (error: any) {
    console.error("Get requests error:", error);
    return res.status(500).json({ error: error.message || "Failed to load requests" });
  }
});


// ---------------- SUPPORT LINKS ENDPOINTS ----------------

// Get Support Links
app.get("/api/support-links", async (req: Request, res: Response): Promise<any> => {
  try {
    const snap = await getDocs(collection(db, "support_links"));
    const list: any[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    return res.json(list);
  } catch (error: any) {
    console.error("Get support links error:", error);
    return res.status(500).json({ error: error.message || "Failed to load support links" });
  }
});

// Create Support Link
app.post("/api/support-links", async (req: Request, res: Response): Promise<any> => {
  const { title, url } = req.body;
  if (!title || !url) {
    return res.status(400).json({ error: "Missing title or url" });
  }

  try {
    const id = "link_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    const newLink = { id, title: title.trim(), url: url.trim() };
    await setDoc(doc(db, "support_links", id), newLink);
    return res.json({ success: true, link: newLink });
  } catch (error: any) {
    console.error("Create support link error:", error);
    return res.status(500).json({ error: error.message || "Failed to create support link" });
  }
});

// Delete Support Link
app.delete("/api/support-links", async (req: Request, res: Response): Promise<any> => {
  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing or invalid link ID" });
  }

  try {
    await deleteDoc(doc(db, "support_links", id));
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Delete support link error:", error);
    return res.status(500).json({ error: error.message || "Failed to delete support link" });
  }
});


// ---------------- ADMIN ENDPOINTS ----------------

// Get All Users (Admin)
app.get("/api/admin/users", async (req: Request, res: Response): Promise<any> => {
  try {
    const snap = await getDocs(collection(db, "users"));
    const list: any[] = [];
    snap.forEach((docSnap) => {
      const { password: _, ...safeProfile } = docSnap.data();
      list.push({ uid: docSnap.id, ...safeProfile });
    });
    return res.json(list);
  } catch (error: any) {
    console.error("Admin load users error:", error);
    return res.status(500).json({ error: error.message || "Failed to load users" });
  }
});

// Get All Requests (Admin)
app.get("/api/admin/requests", async (req: Request, res: Response): Promise<any> => {
  try {
    const snap = await getDocs(collection(db, "requests"));
    const list: any[] = [];
    snap.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json(list);
  } catch (error: any) {
    console.error("Admin load requests error:", error);
    return res.status(500).json({ error: error.message || "Failed to load requests" });
  }
});

// Update Request Status
app.post("/api/admin/requests/status", async (req: Request, res: Response): Promise<any> => {
  const { id, status } = req.body;
  if (!id || !status) {
    return res.status(400).json({ error: "Missing request id or status" });
  }

  try {
    await updateDoc(doc(db, "requests", id), { status });
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Admin update request status error:", error);
    return res.status(500).json({ error: error.message || "Failed to update status" });
  }
});

// Update User Subscription (Admin)
app.post("/api/admin/users/subscription", async (req: Request, res: Response): Promise<any> => {
  const { userId, subscriptionStatus, subscriptionExpiry } = req.body;
  if (!userId || !subscriptionStatus) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const updates: any = { 
      subscriptionStatus,
      updatedAt: new Date().toISOString()
    };
    if (subscriptionExpiry !== undefined) updates.subscriptionExpiry = subscriptionExpiry;

    await updateDoc(doc(db, "users", userId), updates);
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Admin update user subscription error:", error);
    return res.status(500).json({ error: error.message || "Failed to update user subscription" });
  }
});

// Approve user's Premium subscription by email ID directly
app.post("/api/admin/users/approve-by-email", async (req: Request, res: Response): Promise<any> => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Missing email address" });
  }

  try {
    const emailLower = email.toLowerCase().trim();
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", emailLower));
    const snap = await getDocs(q);

    if (snap.empty) {
      return res.status(404).json({ error: "No user found with this email address. Please make sure they have signed up first." });
    }

    let userId = "";
    snap.forEach((docSnap) => {
      userId = docSnap.id;
    });

    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const subscriptionExpiry = thirtyDays.toISOString().split("T")[0];

    const updates = {
      subscriptionStatus: "Active",
      subscriptionExpiry,
      updatedAt: new Date().toISOString()
    };

    await updateDoc(doc(db, "users", userId), updates);
    return res.json({ success: true, email: emailLower, expiry: subscriptionExpiry });
  } catch (error: any) {
    console.error("Approve by email error:", error);
    return res.status(500).json({ error: error.message || "Failed to approve subscription" });
  }
});

// Get System Prompt Settings
app.get("/api/admin/settings/prompt", async (req: Request, res: Response): Promise<any> => {
  try {
    const promptDoc = await getDoc(doc(db, "settings", "ai_prompt"));
    if (promptDoc.exists()) {
      return res.json({ systemPrompt: promptDoc.data().systemPrompt });
    } else {
      const defaultPrompt = "You are a professional DJ voice artist. Convert normal text into a powerful DJ announcement style with energy, bass feeling and stage performance.";
      return res.json({ systemPrompt: defaultPrompt });
    }
  } catch (error: any) {
    console.error("Get prompt settings error:", error);
    return res.status(500).json({ error: error.message || "Failed to load prompt settings" });
  }
});

// Update System Prompt Settings
app.post("/api/admin/settings/prompt", async (req: Request, res: Response): Promise<any> => {
  const { systemPrompt } = req.body;
  if (!systemPrompt) {
    return res.status(400).json({ error: "Missing systemPrompt" });
  }

  try {
    await setDoc(doc(db, "settings", "ai_prompt"), { systemPrompt });
    return res.json({ success: true });
  } catch (error: any) {
    console.error("Update prompt settings error:", error);
    return res.status(500).json({ error: error.message || "Failed to update prompt settings" });
  }
});

// API endpoint to generate the DJ vocal
app.post("/api/generate-voice", async (req: Request, res: Response): Promise<any> => {
  const { requestId } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: "Missing requestId" });
  }

  try {
    // 1. Fetch request details from Firestore
    const reqDocRef = doc(db, "requests", requestId);
    const reqDocSnap = await getDoc(reqDocRef);

    if (!reqDocSnap.exists()) {
      return res.status(404).json({ error: "Request not found" });
    }

    const requestData = reqDocSnap.data();
    const { djName, userText, voiceType } = requestData;

    // Update status to Processing
    await updateDoc(reqDocRef, { status: "Processing" });

    // Enhance text using Gemini
    const enhancedText = await getEnhancedTextUsingGemini(userText, djName, voiceType);
    console.log(`Generating vocal with enhanced text: "${enhancedText}"`);

    // 4. Call robust Text-To-Speech API helper
    console.log(`Calling robust TTS API for voice type ${voiceType}`);
    const buffer = await generateTTSBuffer(enhancedText, voiceType);

    // 5. Convert buffer to base64 for persistent Firestore storage
    console.log(`Saving vocal locally and in Firestore for request ${requestId}`);
    const audioDataBase64 = buffer.toString("base64");
    const audioUrl = `/api/vocals/${requestId}.mp3`;

    // Cache locally
    const localPath = path.join(VOCALS_CACHE_DIR, `${requestId}.mp3`);
    fs.writeFileSync(localPath, buffer);

    // 6. Update request doc with completed status and base64 audio data
    await updateDoc(reqDocRef, {
      enhancedText,
      audioUrl,
      audioData: audioDataBase64,
      status: "Completed",
      updatedAt: new Date().toISOString()
    });

    return res.json({
      success: true,
      enhancedText,
      audioUrl
    });

  } catch (error: any) {
    console.error("Error generating DJ vocal:", error);
    // Attempt to revert request status on failure
    try {
      const reqDocRef = doc(db, "requests", requestId);
      await updateDoc(reqDocRef, { 
        status: "Pending",
        error: error.message || "Unknown voice generation error" 
      });
    } catch (dbErr) {
      console.error("Could not revert status in Firestore:", dbErr);
    }
    return res.status(500).json({ error: error.message || "Failed to generate DJ vocal" });
  }
});

// Setup development or production server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
