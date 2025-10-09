import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCKwqKClC158emMaxbXno63vQesYiKQbds",
  authDomain: "ai-life-partner-project.firebaseapp.com",
  projectId: "ai-life-partner-project",
  storageBucket: "ai-life-partner-project.appspot.com",
  messagingSenderId: "710280368627",
  appId: "1:710280368627:web:757d73557a72c758ab8286"
};
const GEMINI_API_KEY = "AIzaSyB2HcRUoyNUuAuwcKuXRm79zPEX8n52mm4";

// --- Initialize and Export Services ---
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

// --- AI Logic Functions ---
// (You will add your AI functions like analyzeJournalEntries and askPastSelf here later)