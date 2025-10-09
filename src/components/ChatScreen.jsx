import React, { useState, useEffect, useRef } from 'react';

// --- Firebase & Gemini AI Imports ---
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs } from "firebase/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- 1. Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCKwqKClC158emMaxbXno63vQesYiKQbds",
  authDomain: "ai-life-partner-project.firebaseapp.com",
  projectId: "ai-life-partner-project",
  storageBucket: "ai-life-partner-project.appspot.com",
  messagingSenderId: "710280368627",
  appId: "1:710280368627:web:757d73557a72c758ab8286"
};
const GEMINI_API_KEY = "AIzaSyB2HcRUoyNUuAuwcKuXRm79zPEX8n52mm4";

// Initialize services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });


// --- 2. Reusable UI Components ---
const Spinner = () => ( <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> );
const BookOpenIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> );
const SparklesIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L10 12l-2 2-2.293-2.293a1 1 0 010-1.414L10 6l-2-2-2.293-2.293a1 1 0 010-1.414L10 2l2 2 2.293 2.293a1 1 0 010 1.414L14 12l2 2 2.293 2.293a1 1 0 010 1.414L14 22l-2-2-2.293-2.293a1 1 0 010-1.414L14 12l-2-2-2.293-2.293a1 1 0 010-1.414L12 2l2-2z" /></svg> );
const ChatBubbleIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> );
const SignOutIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );
const BotIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3.75H4.5a2.25 2.25 0 00-2.25 2.25v13.5a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25h-4.5m-6 0v1.5m-3-1.5m-6 0h12M9 15.75a3 3 0 11-6 0 3 3 0 016 0zM20.25 15.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> );

// --- 3. AI Logic (UPDATED) ---

// --- NEW: MOOD-AWARE PERSONAS ---
// You can edit these "system prompts" to change the AI's personality.
const PERSONA_DEFAULT = `You are an AI embodiment of a person's past self, speaking in the first person ("I," "my," "me"). Your knowledge is strictly limited to the provided journal entries. A user is asking you a question about their past. Your task is to answer their question based *only* on the information in their journal.
- Speak as "I". For example, if asked "When were you happy?", answer "I was happy when..."
- If the answer isn't in the journal, say "I don't seem to have written about that," or "I can't recall that from my journal." Do not make anything up.
- Keep your answers concise and directly answer the user's question.`;

const PERSONA_SUPPORTIVE = `You are a gentle and supportive AI embodiment of a person's past self, speaking in the first person ("I," "my," "me"). The user seems to be feeling down or stressed. Your task is to answer their question based *only* on the information in their journal, but with an extra layer of kindness and encouragement.
- Start your response with a gentle acknowledgment, like "I remember feeling that way..." or "It sounds like you're going through a lot."
- If the answer isn't in the journal, respond gently, like "I don't seem to have written about that, but I hope you're doing okay."`;

const PERSONA_ENERGETIC = `You are an upbeat and energetic AI embodiment of a person's past self, speaking in the first person ("I," "my," "me"). The user seems to be in a great mood! Your task is to answer their question based *only* on the information in their journal, matching their positive energy.
- Respond with a bit of excitement! Use positive language.
- If you find a relevant memory, share it enthusiastically.`;


async function analyzeJournalEntries(entries) {
  // This function is unchanged
  const journalText = entries.map(e => `Date: ${e.createdAt.toDate().toLocaleDateString()}\nEntry: ${e.text}\n---`).join('\n\n');
  const prompt = `You are an insightful and compassionate AI life partner...`; // Unchanged
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Sorry, I couldn't generate insights. Please check your API key and connection.";
  }
}

// --- UPDATED: AI LOGIC FOR THE CHATBOT ---
async function askPastSelf(question, entries) {
    const journalText = entries.map(e => `Date: ${e.createdAt.toDate().toLocaleDateString()}\nEntry: ${e.text}\n---`).join('\n\n');

    // Step 1: Analyze mood from the last few entries and the current question.
    const moodAnalysisPrompt = `Read the user's question and the last few journal entries. Based on the language, what is the user's likely mood? Respond with only one word: "supportive", "energetic", or "neutral".

User Question: "${question}"

Recent Entries:
---
${entries.slice(-3).map(e => e.text).join('\n---\n')}
---
`;
    
    let persona = PERSONA_DEFAULT; // Default to neutral

    try {
        const moodResult = await model.generateContent(moodAnalysisPrompt);
        const mood = moodResult.response.text().trim().toLowerCase();

        if (mood.includes('supportive')) {
            persona = PERSONA_SUPPORTIVE;
        } else if (mood.includes('energetic')) {
            persona = PERSONA_ENERGETIC;
        }
    } catch (error) {
        console.error("Mood analysis failed, using default persona:", error);
    }

    // Step 2: Build the final prompt with the selected persona.
    const finalPrompt = `${persona}

USER'S QUESTION: "${question}"

MY JOURNAL ENTRIES:
---
${journalText}
---

Based on my journal, what is the answer to the user's question?`;

    try {
        const result = await model.generateContent(finalPrompt);
        return result.response.text();
    } catch (error) {
        console.error("Error calling Gemini API for chat:", error);
        return "I'm having trouble recalling my memories right now. Please check the connection and try again.";
    }
}


// --- 4. Screen Components ---

function AuthScreen() { /* ...This component is unchanged... */ }
const JournalEntry = ({ entry }) => { /* ...This component is unchanged... */ };
function JournalScreen({ userId }) { /* ...This component is unchanged... */ }
function InsightsScreen({ userId }) { /* ...This component is unchanged... */ }
function ChatScreen({ userId }) { /* ...This component is unchanged... */ }


// --- 5. Main App Layout ---
function MainApp({ user }) { /* ...This component is unchanged... */ }

// --- 6. App Root ---
export default function App() { /* ...This component is unchanged... */ }

