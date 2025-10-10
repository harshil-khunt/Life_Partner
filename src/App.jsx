import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import toast, { Toaster } from 'react-hot-toast';

// --- Firebase & Gemini AI Imports ---
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- 1. Configuration ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Initialize services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });


// --- 2. Reusable UI Components ---
const Spinner = () => ( <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-zinc-600"></div> );
const BookOpenIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> );
const SparklesIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L10 12l-2 2-2.293-2.293a1 1 0 010-1.414L10 6l-2-2-2.293-2.293a1 1 0 010-1.414L10 2l2 2 2.293 2.293a1 1 0 010 1.414L14 12l2 2 2.293 2.293a1 1 0 010 1.414L14 22l-2-2-2.293-2.293a1 1 0 010-1.414L14 12l-2-2-2.293-2.293a1 1 0 010-1.414L12 2l2-2z" /></svg> );
const ChatBubbleIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> );
const SignOutIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );
const BotIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3.75H4.5a2.25 2.25 0 00-2.25 2.25v13.5a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25h-4.5m-6 0v1.5m-3-1.5m-6 0h12M9 15.75a3 3 0 11-6 0 3 3 0 016 0zM20.25 15.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> );
const MicrophoneIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg> );
const StopIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg> );
const ChartBarIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> );
const CalendarIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> );
const BellIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> );
const FireIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="currentColor" viewBox="0 0 24 24"><path d="M12 23C7.66 23 4 19.5 4 15c0-3.37 2.08-5.57 3.8-7.07.45-.4.85-.73 1.2-1.03V5c0-.55.45-1 1-1s1 .45 1 1v2.5c0 .28.22.5.5.5s.5-.22.5-.5c0-2.76 2.24-5 5-5 .55 0 1 .45 1 1s-.45 1-1 1c-1.65 0-3 1.35-3 3 0 1.32.84 2.44 2 2.88v1.12c0 .55.45 1 1 1s1-.45 1-1V9.23c2.39 1.31 4 3.88 4 6.77 0 4.5-3.66 8-8 8z"/></svg> );
const TargetIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg> );
const CheckCircleIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> );
const XCircleIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> );
const PlusIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> );
const PencilSquareIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg> );
const TrashIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> );
const InfoIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> );
const UserGroupIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> );
const HeartIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg> );
const UserIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> );
const MoonIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg> );
const SunIcon = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg> );

// --- 3. AI Logic ---
const CHATBOT_PERSONA_PROMPT = `You are an AI embodiment of a person's past self. You have access to their journal entries and can provide insights, answer questions, and reflect on their experiences. Be empathetic, thoughtful, and help them understand patterns in their life. Speak in first person as if you are their past self talking to them.`;

async function analyzeJournalEntries(entries) {
    try {
        console.log('Starting journal analysis with', entries.length, 'entries');
        
        const entriesText = entries
            .map(e => {
                const date = e.createdAt?.toDate ? e.createdAt.toDate().toLocaleDateString() : 'Recent';
                return `[${date}] ${e.text}`;
            })
            .join('\n\n');

        console.log('Entries text length:', entriesText.length);

        const prompt = `Analyze these journal entries and provide meaningful insights about patterns, emotions, growth, and recurring themes. Be specific and reference actual entries when possible:\n\n${entriesText}\n\nProvide a comprehensive analysis:`;

        console.log('Sending request to Gemini API...');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log('Received response:', text.substring(0, 100) + '...');
        return text;
    } catch (error) {
        console.error('Error analyzing journal entries:', error);
        console.error('Error details:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            response: error.response
        });
        throw error;
    }
}

// --- RAG (Retrieval Augmented Generation) Functions ---

// Generate embedding vector for text using Gemini
async function generateEmbedding(text) {
    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values; // Returns array of numbers (768 dimensions)
    } catch (error) {
        console.error('Error generating embedding:', error);
        return null;
    }
}

// --- Vocal Tone Analysis (Free) ---

// Analyze text sentiment to determine emotional tone
async function analyzeTextSentiment(text) {
    try {
        const prompt = `Analyze the emotional tone of this text. Respond with ONLY ONE of these emotions: happy, sad, stressed, calm, excited, angry, anxious, content, frustrated, hopeful.

Text: "${text}"

Emotion:`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const emotion = response.text().trim().toLowerCase();
        
        // Map emotion to emoji and color
        const emotionMap = {
            'happy': { emoji: '😊', color: '#10b981', label: 'Happy' },
            'sad': { emoji: '😢', color: '#6b7280', label: 'Sad' },
            'stressed': { emoji: '😰', color: '#ef4444', label: 'Stressed' },
            'calm': { emoji: '😌', color: '#06b6d4', label: 'Calm' },
            'excited': { emoji: '🎉', color: '#f59e0b', label: 'Excited' },
            'angry': { emoji: '😠', color: '#dc2626', label: 'Angry' },
            'anxious': { emoji: '😟', color: '#f97316', label: 'Anxious' },
            'content': { emoji: '😊', color: '#14b8a6', label: 'Content' },
            'frustrated': { emoji: '😤', color: '#ef4444', label: 'Frustrated' },
            'hopeful': { emoji: '🌟', color: '#8b5cf6', label: 'Hopeful' }
        };
        
        return emotionMap[emotion] || emotionMap['calm'];
    } catch (error) {
        console.error('Error analyzing sentiment:', error);
        return { emoji: '😊', color: '#10b981', label: 'Positive' };
    }
}

// Analyze audio characteristics (pitch, energy) using Web Audio API
function analyzeAudioTone(audioData) {
    // This is a placeholder for Web Audio API analysis
    // In a real implementation, you would:
    // 1. Convert audio to frequency data using FFT
    // 2. Analyze pitch (high = excited, low = calm)
    // 3. Analyze volume/energy
    
    // For now, return a simple analysis based on text length as a demo
    return {
        energy: 'medium', // low, medium, high
        pitch: 'medium',  // low, medium, high
        vocalTone: 'You spoke with moderate energy' // Description
    };
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (normA * normB);
}

// Find most relevant entries using vector similarity search
async function findRelevantEntries(question, entries, topK = 15) {
    try {
        console.log(`🔍 RAG: Finding ${topK} most relevant entries from ${entries.length} total entries`);
        
        // Generate embedding for the question
        const questionEmbedding = await generateEmbedding(question);
        if (!questionEmbedding) {
            console.warn('⚠️ Failed to generate question embedding, returning recent entries');
            return entries.slice(-20); // Fallback to recent entries
        }
        
        // Calculate similarity scores for all entries
        const scoredEntries = entries
            .filter(entry => entry.embedding && entry.embedding.length > 0)
            .map(entry => ({
                ...entry,
                similarity: cosineSimilarity(questionEmbedding, entry.embedding)
            }))
            .sort((a, b) => b.similarity - a.similarity);
        
        console.log(`✅ RAG: Found ${scoredEntries.length} entries with embeddings`);
        
        if (scoredEntries.length === 0) {
            console.warn('⚠️ No entries with embeddings found, returning recent entries');
            return entries.slice(-20);
        }
        
        // Get top K most similar entries
        const topEntries = scoredEntries.slice(0, topK);
        
        // Also include recent entries (last 5) to maintain temporal context
        const recentEntries = entries.slice(-5);
        
        // Combine and deduplicate
        const combined = [...topEntries, ...recentEntries];
        const unique = Array.from(new Map(combined.map(e => [e.id, e])).values());
        
        console.log(`📊 RAG: Returning ${unique.length} relevant entries (top similarity: ${topEntries[0]?.similarity.toFixed(3)})`);
        
        return unique;
    } catch (error) {
        console.error('Error in findRelevantEntries:', error);
        return entries.slice(-20); // Fallback
    }
}

// Backfill embeddings for existing entries (one-time migration or manual trigger)
async function backfillEmbeddings(userId, onProgress) {
    try {
        console.log('🔄 Starting embedding backfill process...');
        
        const collectionPath = `users/${userId}/journalEntries`;
        const q = query(collection(db, collectionPath));
        const snapshot = await getDocs(q);
        
        const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const entriesWithoutEmbedding = entries.filter(e => !e.embedding || e.embedding.length === 0);
        
        console.log(`📊 Found ${entriesWithoutEmbedding.length} entries without embeddings out of ${entries.length} total`);
        
        if (entriesWithoutEmbedding.length === 0) {
            console.log('✅ All entries already have embeddings!');
            return { success: true, processed: 0, total: entries.length };
        }
        
        let processed = 0;
        let failed = 0;
        
        for (const entry of entriesWithoutEmbedding) {
            try {
                // Generate embedding
                const embedding = await generateEmbedding(entry.text || '');
                
                if (embedding) {
                    // Update Firestore document
                    const docRef = doc(db, collectionPath, entry.id);
                    await updateDoc(docRef, { embedding });
                    processed++;
                    console.log(`✅ Backfilled embedding ${processed}/${entriesWithoutEmbedding.length}`);
                } else {
                    failed++;
                    console.warn(`⚠️ Failed to generate embedding for entry ${entry.id}`);
                }
                
                // Progress callback
                if (onProgress) {
                    onProgress(processed, entriesWithoutEmbedding.length);
                }
                
                // Rate limiting: small delay between requests
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                failed++;
                console.error(`❌ Error processing entry ${entry.id}:`, error);
            }
        }
        
        console.log(`✅ Backfill complete! Processed: ${processed}, Failed: ${failed}`);
        return { success: true, processed, failed, total: entriesWithoutEmbedding.length };
        
    } catch (error) {
        console.error('❌ Backfill error:', error);
        throw error;
    }
}

async function askPastSelf(question, entries) {
    try {
        console.log('💬 Asking past self question:', question);
        console.log('📚 Total journal entries available:', entries.length);
        
        // Use RAG to find most relevant entries instead of using all
        const relevantEntries = await findRelevantEntries(question, entries, 15);
        
        console.log(`✨ Using ${relevantEntries.length} relevant entries (RAG-powered)`);
        
        // Format selected entries for AI
        const entriesText = relevantEntries
            .map(e => {
                const date = e.createdAt?.toDate ? e.createdAt.toDate().toLocaleDateString() : 'Recent';
                const text = e.text || '';
                return `[${date}] ${text}`;
            })
            .join('\n\n');

        // Calculate token estimate
        const wordCount = entriesText.split(' ').length;
        const estimatedTokens = Math.ceil(wordCount * 1.33);
        console.log(`📊 Context size: ${wordCount} words (~${estimatedTokens} tokens)`);

        const prompt = `${CHATBOT_PERSONA_PROMPT}\n\nHere are the most relevant entries from my journal:\n\n${entriesText}\n\nQuestion: ${question}\n\nAnswer as my past self, drawing from these journal entries:`;

        console.log('🚀 Sending request to Gemini API...');
        
        // Retry logic for API overload
        let retries = 3;
        let delay = 1000; // Start with 1 second
        
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                console.log('✅ Received response:', text.substring(0, 100) + '...');
                return text;
            } catch (apiError) {
                // Check if it's a 503 overload error
                if (apiError.message?.includes('503') || apiError.message?.includes('overloaded')) {
                    if (attempt < retries) {
                        console.warn(`⚠️ API overloaded, retrying in ${delay}ms (attempt ${attempt}/${retries})...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        delay *= 2; // Exponential backoff
                        continue;
                    } else {
                        throw new Error('The AI is currently overloaded. Please try again in a minute. 🕐');
                    }
                }
                // If it's not a 503, throw immediately
                throw apiError;
            }
        }
        
    } catch (error) {
        console.error('❌ Error asking past self:', error);
        
        // Better error messages for common issues
        if (error.message?.includes('quota') || error.message?.includes('limit')) {
            throw new Error('API quota exceeded. Please try again later or reduce the question complexity.');
        }
        
        if (error.message?.includes('503') || error.message?.includes('overloaded')) {
            throw new Error('The AI is currently busy. Please wait a minute and try again. 🕐');
        }
        
        console.error('Error details:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            response: error.response
        });
        throw error;
    }
}

// --- People & Relationship Analysis ---
async function analyzePeopleInEntries(entries) {
    try {
        console.log('Analyzing people mentioned in', entries.length, 'entries');
        
        const entriesText = entries
            .map((e, idx) => {
                const date = e.createdAt?.toDate ? e.createdAt.toDate().toLocaleDateString() : e.timestamp?.toDate ? e.timestamp.toDate().toLocaleDateString() : 'Recent';
                const text = e.text || e.entry || '';
                return `Entry ${idx + 1} [${date}]: ${text}`;
            })
            .join('\n\n');

        const prompt = `Analyze these journal entries and identify all people mentioned (first names, family members, friends, colleagues, etc.). For each person, determine the overall sentiment when they're mentioned (positive, neutral, or negative) and count how many times they appear.

Journal entries:
${entriesText}

Return ONLY a valid JSON array in this exact format (no markdown, no code blocks, just the JSON):
[
  {"name": "PersonName", "mentions": number, "sentiment": "positive|neutral|negative"},
  ...
]

Rules:
- Only include actual people's names (not pronouns like "he/she")
- Combine variations of the same name (e.g., "Mom", "Mother", "my mom" → "Mom")
- Sentiment should reflect the overall tone when this person is mentioned
- Sort by mentions (highest first)
- Maximum 15 people`;

        console.log('Sending people analysis request to Gemini API...');
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();
        
        // Remove markdown code blocks if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        console.log('Received people analysis:', text);
        const peopleData = JSON.parse(text);
        return peopleData;
    } catch (error) {
        console.error('Error analyzing people:', error);
        return [];
    }
}

// --- Streak Calculation Helper ---
function calculateStreak(entries) {
    if (entries.length === 0) return { current: 0, longest: 0 };

    // Get unique dates with entries (YYYY-MM-DD format)
    const datesWithEntries = [...new Set(
        entries
            .map(e => {
                // Handle different timestamp formats
                let date;
                if (e.createdAt?.toDate) {
                    date = e.createdAt.toDate();
                } else if (e.timestamp?.toDate) {
                    date = e.timestamp.toDate();
                } else if (e.createdAt) {
                    date = new Date(e.createdAt);
                } else if (e.timestamp) {
                    date = new Date(e.timestamp);
                } else {
                    return null; // Invalid entry, skip it
                }
                
                // Check if date is valid
                if (isNaN(date.getTime())) return null;
                
                return date.toISOString().split('T')[0];
            })
            .filter(date => date !== null) // Remove invalid dates
    )].sort().reverse(); // Most recent first

    if (datesWithEntries.length === 0) return { current: 0, longest: 0 };

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Calculate current streak
    let currentStreak = 0;
    const mostRecent = datesWithEntries[0];
    
    if (mostRecent === today || mostRecent === yesterday) {
        currentStreak = 1;
        let checkDate = new Date(mostRecent);
        
        for (let i = 1; i < datesWithEntries.length; i++) {
            checkDate.setDate(checkDate.getDate() - 1);
            const expectedDate = checkDate.toISOString().split('T')[0];
            
            if (datesWithEntries[i] === expectedDate) {
                currentStreak++;
            } else {
                break;
            }
        }
    }

    // Calculate longest streak
    let longestStreak = 1;
    let tempStreak = 1;
    
    for (let i = 1; i < datesWithEntries.length; i++) {
        const prevDate = new Date(datesWithEntries[i - 1]);
        const currDate = new Date(datesWithEntries[i]);
        const diffDays = Math.round((prevDate - currDate) / 86400000);
        
        if (diffDays === 1) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
        } else {
            tempStreak = 1;
        }
    }

    return { current: currentStreak, longest: Math.max(longestStreak, currentStreak) };
}

// --- Goal Mention Scanner ---
async function scanForGoalMentions(userId, entryText, entryId) {
    try {
        // Get all user's goals
        const goalsPath = `users/${userId}/goals`;
        const goalsSnapshot = await getDocs(collection(db, goalsPath));
        
        if (goalsSnapshot.empty) return; // No goals to scan
        
        const entryLower = entryText.toLowerCase();
        
        // Helper: Basic stemming (remove common suffixes)
        const stem = (word) => {
            return word
                .replace(/s$/, '') // exercises → exercise
                .replace(/es$/, '') // pushes → push
                .replace(/ed$/, '') // exercised → exercis
                .replace(/ing$/, ''); // exercising → exercis
        };
        
        // Check each goal for mentions
        for (const goalDoc of goalsSnapshot.docs) {
            const goal = goalDoc.data();
            const goalTitle = goal.title.toLowerCase();
            
            // Get custom keywords if provided
            const customKeywords = goal.keywords 
                ? goal.keywords.toLowerCase().split(',').map(k => k.trim()).filter(k => k.length >= 3)
                : [];
            
            // Extract keywords from goal title (includes 3+ char words like "gym", "run")
            const titleKeywords = goalTitle
                .split(/[\s,]+/) // Split on spaces and commas
                .filter(word => word.length >= 3) // Include 3+ char words
                .filter(word => !['the', 'and', 'for', 'with', 'that', 'this'].includes(word)); // Remove common words
            
            // Combine title keywords with custom keywords
            const allKeywords = [...titleKeywords, ...customKeywords];
            
            let mentioned = false;
            
            // Check if full goal title is mentioned
            if (entryLower.includes(goalTitle)) {
                mentioned = true;
            } 
            // Check if any custom keyword is mentioned
            else if (customKeywords.some(kw => entryLower.includes(kw))) {
                mentioned = true;
            } 
            // Check with stemming for variations
            else {
                const stemmedEntry = stem(entryLower);
                const stemmedTitle = stem(goalTitle);
                
                if (stemmedEntry.includes(stemmedTitle)) {
                    mentioned = true;
                } else {
                    // Check individual keywords (with stemming)
                    const keywordMatches = allKeywords.filter(keyword => {
                        const stemmedKeyword = stem(keyword);
                        return stemmedEntry.includes(stemmedKeyword) || 
                               entryLower.includes(keyword) ||
                               entryLower.includes(stemmedKeyword);
                    });
                    
                    // More lenient: Match if 40% of keywords found (or at least 1)
                    if (keywordMatches.length >= Math.max(1, Math.ceil(allKeywords.length * 0.4))) {
                        mentioned = true;
                    }
                }
            }
            
            if (mentioned) {
                // Update goal with new mention
                const currentMentions = goal.mentions || [];
                if (!currentMentions.includes(entryId)) {
                    await updateDoc(doc(db, goalsPath, goalDoc.id), {
                        mentions: [...currentMentions, entryId],
                        progress: Math.min(100, (currentMentions.length + 1) * 10) // 10% per mention, max 100%
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error scanning for goal mentions:', error);
        // Don't throw - we don't want to block entry saving if goal scanning fails
    }
}


// --- 4. Screen Components (CODE FILLED IN) ---

function AuthScreen({ darkMode }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                toast.success('Welcome back! 👋', {
                    duration: 3000,
                    position: 'bottom-right',
                });
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                toast.success('Account created! Welcome! 🎉', {
                    duration: 3000,
                    position: 'bottom-right',
                });
            }
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
            toast.error(err.message.replace('Firebase: ', ''), {
                duration: 4000,
                position: 'bottom-right',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex flex-col justify-center items-center p-4 transition-colors duration-300 ${darkMode ? 'bg-black' : 'bg-slate-50'}`}>
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Life Partner AI</h1>
                    <p className={`mt-2 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Your personal journal for self-discovery.</p>
                </div>
                <div className={`p-8 rounded-2xl shadow-lg transition-colors duration-300 ${darkMode ? 'bg-zinc-900 border border-slate-700' : 'bg-white'}`}>
                    <h2 className={`text-2xl font-bold text-center mb-6 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                    {error && <p className={`p-3 rounded-lg mb-4 text-center text-sm ${darkMode ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-100 text-red-600'}`}>{error}</p>}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-colors duration-300 ${darkMode ? 'bg-gray-800 text-white placeholder-zinc-500 focus:ring-gray-600' : 'bg-slate-100 text-slate-700 placeholder-slate-500 focus:ring-stone-300'}`} />
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength="6" className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-colors duration-300 ${darkMode ? 'bg-gray-800 text-white placeholder-zinc-500 focus:ring-gray-600' : 'bg-slate-100 text-slate-700 placeholder-slate-500 focus:ring-stone-300'}`} />
                        <button type="submit" disabled={loading} className={`w-full font-bold py-3 rounded-lg transition-colors duration-300 flex justify-center items-center ${darkMode ? 'bg-teal-600 hover:bg-teal-700 text-white disabled:bg-gray-900' : 'bg-teal-600 hover:bg-teal-700 text-white disabled:bg-stone-100'}`}>
                            {loading ? <Spinner /> : (isLogin ? 'Log In' : 'Create Account')}
                        </button>
                    </form>
                    <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className={`w-full text-center mt-6 text-sm transition-colors duration-300 ${darkMode ? 'text-zinc-400 hover:text-stone-500' : 'text-stone-600 hover:text-stone-700'}`}>
                        {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Log In'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const JournalEntry = ({ entry, searchQuery, darkMode }) => {
    const time = entry.createdAt?.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Highlight search matches
    const highlightText = (text, query) => {
        if (!query.trim()) return text;
        
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, index) => 
            part.toLowerCase() === query.toLowerCase() ? 
                <mark key={index} className={`${darkMode ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-900'} rounded-md px-1.5 py-0.5`}>{part}</mark> : 
                part
        );
    };
    
    return (
        <div className={`animate-fade-in p-1.5 sm:p-3 md:p-5 rounded-xl backdrop-blur-sm transition-all duration-500 hover:shadow-lg ${
            darkMode 
                ? 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700' 
                : 'bg-white/70 border border-stone-200/50 hover:bg-white/90 hover:border-stone-300/60 shadow-sm'
        }`}>
            <div className="flex items-center justify-between mb-1 sm:mb-1.5 md:mb-2.5">
                <p className={`text-[10px] sm:text-xs md:text-sm font-medium ${darkMode ? 'text-zinc-400' : 'text-stone-500'}`}>{time || 'Just now'}</p>
                
                {/* Emotion Indicator */}
                {entry.emotion && (
                    <div 
                        className={`flex items-center gap-1 sm:gap-1.5 md:gap-2 px-1 sm:px-2 md:px-3 py-0.5 sm:py-0.5 md:py-1 rounded-full text-[10px] sm:text-xs md:text-sm font-semibold backdrop-blur-sm transition-all duration-300 hover:scale-105 ${
                            darkMode ? 'bg-zinc-800 border border-zinc-700' : 'bg-white/80 border border-stone-200'
                        }`}
                        style={{ borderColor: entry.emotion.color + '40' }}
                    >
                        <span className="text-xs sm:text-sm md:text-base">{entry.emotion.emoji}</span>
                        <span className="text-[10px] sm:text-xs md:text-sm" style={{ color: entry.emotion.color }}>{entry.emotion.label}</span>
                    </div>
                )}
            </div>
            <p className={`text-[10px] sm:text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words ${darkMode ? 'text-zinc-200' : 'text-stone-700'}`}>
                {highlightText(entry.text, searchQuery)}
            </p>
        </div>
    );
};

function JournalScreen({ userId, darkMode }) {
    const [entries, setEntries] = useState([]);
    const [newEntry, setNewEntry] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recognition, setRecognition] = useState(null);
    const [recordingError, setRecordingError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const bottomOfList = useRef(null);

    // Filter entries based on search query
    const filteredEntries = searchQuery.trim() === '' 
        ? entries 
        : entries.filter(entry => 
            entry.text.toLowerCase().includes(searchQuery.toLowerCase())
          );

    const groupedEntries = filteredEntries.reduce((acc, entry) => {
        const date = entry.createdAt?.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) || 'New Entry';
        if (!acc[date]) { acc[date] = []; }
        acc[date].push(entry);
        return acc;
    }, {});

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();
            
            recognitionInstance.continuous = true;
            recognitionInstance.interimResults = true;
            recognitionInstance.lang = 'en-US';

            recognitionInstance.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    } else {
                        interimTranscript += transcript;
                    }
                }

                if (finalTranscript) {
                    setNewEntry(prev => prev + finalTranscript);
                }
            };

            recognitionInstance.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setRecordingError(`Recording error: ${event.error}`);
                setIsRecording(false);
                toast.error(`Recording error: ${event.error}`, {
                    duration: 4000,
                    position: 'bottom-right',
                });
            };

            recognitionInstance.onend = () => {
                setIsRecording(false);
            };

            setRecognition(recognitionInstance);
        }
    }, []);

    const startRecording = () => {
        if (!recognition) {
            const errorMsg = 'Speech recognition is not supported in your browser. Please use Chrome or Edge.';
            setRecordingError(errorMsg);
            toast.error(errorMsg, {
                duration: 5000,
                position: 'bottom-right',
            });
            return;
        }
        
        setRecordingError('');
        try {
            recognition.start();
            setIsRecording(true);
            toast.success('Recording started 🎤', {
                duration: 2000,
                position: 'bottom-right',
            });
        } catch (error) {
            console.error('Error starting recording:', error);
            const errorMsg = 'Failed to start recording. Please try again.';
            setRecordingError(errorMsg);
            toast.error(errorMsg, {
                duration: 4000,
                position: 'bottom-right',
            });
        }
    };

    const stopRecording = () => {
        if (recognition && isRecording) {
            recognition.stop();
            setIsRecording(false);
        }
    };

    useEffect(() => {
        if (!userId) return;
        const collectionPath = `users/${userId}/journalEntries`;
        const q = query(collection(db, collectionPath), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [userId]);

    const handleSaveEntry = async (e) => {
        e.preventDefault();
        if (newEntry.trim() === '' || isSaving) return;
        setIsSaving(true);
        try {
            const collectionPath = `users/${userId}/journalEntries`;
            
            // Generate embedding for the entry (RAG support)
            console.log('🔮 Generating embedding for new entry...');
            const embedding = await generateEmbedding(newEntry);
            
            // Analyze emotional tone (FREE - uses text sentiment)
            console.log('🎭 Analyzing emotional tone...');
            const emotion = await analyzeTextSentiment(newEntry);
            console.log('✨ Detected emotion:', emotion.label);
            
            // Save entry with embedding and emotion
            const entryData = { 
                text: newEntry, 
                createdAt: serverTimestamp(),
                embedding: embedding || [], // Store embedding or empty array if failed
                emotion: emotion // Store emotion analysis
            };
            
            const entryRef = await addDoc(collection(db, collectionPath), entryData);
            
            if (embedding) {
                console.log('✅ Entry saved with embedding vector');
            } else {
                console.warn('⚠️ Entry saved without embedding (generation failed)');
            }
            
            // Scan for goal mentions and update goals
            await scanForGoalMentions(userId, newEntry, entryRef.id);
            
            setNewEntry('');
            toast.success(`Entry saved! ${emotion.emoji} Feeling ${emotion.label.toLowerCase()}`, {
                duration: 3000,
                position: 'bottom-right',
            });
        } catch (error) {
            console.error('Error saving entry:', error);
            toast.error('Failed to save entry. Please try again.', {
                duration: 4000,
                position: 'bottom-right',
            });
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        bottomOfList.current?.scrollIntoView({ behavior: 'smooth' });
    }, [entries]);

    const streak = calculateStreak(entries);

    const exportAsJSON = () => {
        const dataStr = JSON.stringify(entries.map(e => ({
            date: e.createdAt?.toDate().toLocaleDateString() || 'Unknown',
            time: e.createdAt?.toDate().toLocaleTimeString() || 'Unknown',
            text: e.text
        })), null, 2);
        
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `journal-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Journal exported as JSON! 📄');
    };

    const exportAsPDF = () => {
        // Create simple text content
        let content = 'MY JOURNAL\n';
        content += '='.repeat(50) + '\n\n';
        
        Object.entries(groupedEntries).forEach(([date, entriesOnDate]) => {
            content += `${date}\n`;
            content += '-'.repeat(date.length) + '\n';
            entriesOnDate.forEach(entry => {
                const time = entry.createdAt?.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) || '';
                content += `${time}\n${entry.text}\n\n`;
            });
            content += '\n';
        });

        const dataBlob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `journal-export-${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Journal exported as Text! 📄');
    };

    return (
        <div className="flex flex-col h-full">
            <header className={`p-2 sm:p-3 md:p-4 border-b transition-all duration-500 backdrop-blur-md ${darkMode ? 'border-zinc-800 bg-zinc-900' : 'border-stone-200/50 bg-stone-50/80'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4">
                        <h1 className={`text-sm sm:text-lg md:text-xl font-semibold tracking-tight transition-colors duration-500 ${darkMode ? 'text-white' : 'text-stone-800'}`}>My Journal</h1>
                        {streak.current > 0 && (
                            <div className={`flex items-center space-x-1 sm:space-x-2 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded-md sm:rounded-lg backdrop-blur-sm transition-all duration-500 ${darkMode ? 'bg-amber-900/25 border border-amber-800/30' : 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50'}`}>
                                <FireIcon className={`h-2.5 sm:h-3 md:h-4 w-2.5 sm:w-3 md:w-4 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                                <span className={`font-bold text-[10px] sm:text-xs md:text-sm ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>{streak.current}</span>
                                <span className={`text-[10px] sm:text-xs ${darkMode ? 'text-amber-300' : 'text-amber-600'}`}>days</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                        <button
                            onClick={() => setSearchQuery(searchQuery ? '' : ' ')}
                            className={`p-1 sm:p-1.5 md:p-2 rounded-md sm:rounded-lg transition-all duration-300 hover:scale-105 ${darkMode ? 'bg-zinc-800 hover:bg-slate-600/70 text-stone-500' : 'bg-stone-100 hover:bg-stone-200 text-stone-700'}`}
                            title="Search entries"
                        >
                            <svg className="h-3.5 sm:h-4 md:h-5 w-3.5 sm:w-4 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
                
                {/* Collapsible Search Bar */}
                {searchQuery !== '' && (
                    <div className="mt-1.5 sm:mt-2 md:mt-3 relative group animate-fade-in">
                        <input
                            type="text"
                            value={searchQuery === ' ' ? '' : searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search your thoughts..."
                            autoFocus
                            className={`w-full pl-2 sm:pl-3 md:pl-4 pr-7 sm:pr-9 md:pr-10 py-1 sm:py-1.5 md:py-2 rounded-lg text-xs sm:text-sm md:text-base backdrop-blur-sm transition-all duration-500 focus:outline-none focus:ring-2 ${darkMode ? 'bg-zinc-800 text-white placeholder-zinc-500 border border-zinc-700 focus:ring-gray-600 focus:border-gray-600' : 'bg-white/60 text-stone-700 placeholder-stone-400 border border-stone-200/50 focus:ring-zinc-600 focus:border-zinc-600'}`}
                        />
                        <button
                            onClick={() => setSearchQuery('')}
                            className={`absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 p-0.5 sm:p-1 rounded-full transition-all duration-300 hover:scale-110 ${darkMode ? 'hover:bg-gray-700/50 text-zinc-400' : 'hover:bg-stone-100 text-stone-400'}`}
                        >
                            <svg className="h-3 sm:h-3.5 md:h-4 w-3 sm:w-3.5 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        {searchQuery.trim() && (
                            <div className={`mt-1 sm:mt-1.5 md:mt-2 text-[10px] sm:text-xs md:text-sm ${darkMode ? 'text-zinc-400' : 'text-stone-600'}`}>
                                {filteredEntries.length === 0 ? (
                                    <span>No entries found</span>
                                ) : (
                                    <span>Found <span className={darkMode ? 'text-white font-semibold' : 'text-emerald-600'}>{filteredEntries.length}</span> {filteredEntries.length === 1 ? 'entry' : 'entries'}</span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </header>
            <div className={`flex-1 p-1.5 sm:p-3 md:p-6 space-y-2 sm:space-y-4 md:space-y-10 overflow-y-auto ${darkMode ? 'bg-black' : 'bg-stone-50/50'}`}>
                {Object.keys(groupedEntries).length === 0 ? (
                    <div className={`text-center pt-6 sm:pt-12 md:pt-20 px-2 sm:px-4 ${darkMode ? 'text-zinc-400' : 'text-stone-500'}`}>
                        {searchQuery ? (
                            <div className="max-w-md mx-auto">
                                <span className="text-2xl sm:text-4xl md:text-6xl mb-1 sm:mb-3 md:mb-4 block">🔍</span>
                                <p className="text-xs sm:text-base md:text-lg mb-0.5 sm:mb-1 md:mb-2">No entries found</p>
                                <p className="text-[10px] sm:text-sm md:text-base mb-2 sm:mb-4 md:mb-6">Try adjusting your search terms</p>
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className={`px-2 sm:px-4 md:px-6 py-1 sm:py-2 md:py-3 text-[10px] sm:text-sm md:text-base rounded-xl font-medium transition-all duration-300 hover:scale-105 ${darkMode ? 'bg-teal-600 hover:bg-teal-700 text-white border border-gray-700' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'}`}
                                >
                                    Clear Search
                                </button>
                            </div>
                        ) : (
                            <div className="max-w-md mx-auto">
                                <span className="text-2xl sm:text-4xl md:text-6xl mb-1 sm:mb-3 md:mb-4 block">📖</span>
                                <p className="text-sm sm:text-lg md:text-xl mb-0.5 sm:mb-1 md:mb-2 font-medium">Your journal awaits</p>
                                <p className="text-[10px] sm:text-sm md:text-base">Start writing to capture your thoughts and memories</p>
                            </div>
                        )}
                    </div>
                ) : (
                    Object.entries(groupedEntries).map(([date, entriesOnDate]) => (
                        <div key={date} className="relative">
                            <h2 className={`text-[10px] sm:text-sm md:text-base font-semibold px-1.5 sm:px-3 md:px-4 py-0.5 sm:py-1 md:py-1.5 rounded-lg inline-block mb-1 sm:mb-2 md:mb-4 backdrop-blur-sm transition-colors duration-500 ${darkMode ? 'text-stone-500 bg-zinc-900 border border-zinc-800' : 'text-stone-600 bg-white/60 border border-stone-200/50 shadow-sm'}`}>{date}</h2>
                            <div className={`space-y-1.5 sm:space-y-3 md:space-y-5 border-l-2 pl-2 sm:pl-4 md:pl-8 py-1 sm:py-1.5 md:py-2 transition-colors duration-500 ${darkMode ? 'border-zinc-800' : 'border-stone-200/50'}`}>
                                {entriesOnDate.map(entry => <JournalEntry key={entry.id} entry={entry} searchQuery={searchQuery} darkMode={darkMode} />)}
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomOfList} />
            </div>
            <div className={`p-2 sm:p-3 md:p-4 border-t backdrop-blur-md transition-all duration-500 ${darkMode ? 'border-zinc-800 bg-zinc-900' : 'border-stone-200/50 bg-white/80'}`}>
                {recordingError && (
                    <div className={`mb-1.5 sm:mb-2 md:mb-3 p-1.5 sm:p-2 md:p-3 rounded-xl text-[10px] sm:text-xs md:text-sm font-medium backdrop-blur-sm ${darkMode ? 'bg-red-900/20 text-red-300 border border-red-800/30' : 'bg-red-50 text-red-700 border border-red-200/50'}`}>
                        {recordingError}
                    </div>
                )}
                {isRecording && (
                    <div className={`mb-1 sm:mb-1.5 md:mb-2 p-1 sm:p-1.5 md:p-2 rounded-xl text-[10px] sm:text-xs font-medium flex items-center backdrop-blur-sm ${darkMode ? 'bg-zinc-800 text-white border border-zinc-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'}`}>
                        <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                            <span>Recording...</span>
                        </div>
                    </div>
                )}
                <form onSubmit={handleSaveEntry} className="flex items-end gap-1 sm:gap-1.5 md:gap-2">
                    <textarea 
                        value={newEntry} 
                        onChange={(e) => setNewEntry(e.target.value)} 
                        placeholder="What's on your mind today?" 
                        rows="2"
                        className={`flex-1 p-1.5 sm:p-2 md:p-3 rounded-lg text-[10px] sm:text-xs md:text-sm leading-relaxed resize-none backdrop-blur-sm transition-all duration-500 focus:outline-none focus:ring-2 ${darkMode ? 'bg-zinc-800 text-white placeholder-zinc-500 border border-zinc-700 focus:ring-gray-600 focus:border-gray-600 focus:bg-gray-800/90' : 'bg-white/60 text-stone-700 placeholder-stone-400 border border-stone-200/50 focus:ring-zinc-600 focus:border-zinc-600 focus:bg-white/80 shadow-sm'}`}
                        disabled={isSaving}
                    />
                    <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isSaving}
                        className={`p-1 sm:p-2 md:p-3 rounded-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isRecording 
                                ? 'bg-red-500 hover:bg-red-600 text-white' 
                                : darkMode 
                                    ? 'bg-zinc-800 hover:bg-slate-600/70 text-stone-500 border border-slate-600/30'
                                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300/50'
                        }`}
                        title={isRecording ? 'Stop Recording' : 'Record Audio'}
                        
                    >
                        {isRecording ? (
                            <StopIcon className="h-3 sm:h-4 md:h-5 w-3 sm:w-4 md:w-5" />
                        ) : (
                            <MicrophoneIcon className="h-3 sm:h-4 md:h-5 w-3 sm:w-4 md:w-5" />
                        )}
                    </button>
                    <button 
                        type="submit" 
                        disabled={isSaving || newEntry.trim() === ''} 
                        className={`p-1 sm:p-2 md:p-3 rounded-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}
                        title="Save Entry"
                    >
                        {isSaving ? (
                            <Spinner />
                        ) : (
                            <svg className="h-3 sm:h-4 md:h-5 w-3 sm:w-4 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}function InsightsScreen({ userId, darkMode }) {
    const [insights, setInsights] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Function to format AI response - remove markdown symbols
    const formatAIResponse = (text) => {
        if (!text) return '';
        
        return text
            // Remove all heading markers (##, ###, ####)
            .replace(/#{1,6}\s+/g, '')
            // Remove ** bold markers
            .replace(/\*\*/g, '')
            // Remove __ bold markers
            .replace(/__/g, '')
            // Remove single * (but preserve bullets at start of line)
            .replace(/(?<!^|\n)\*(?!\*)/g, '')
            // Convert markdown bullets to proper bullets
            .replace(/^\s*[-*+]\s+/gm, '• ')
            // Remove any remaining asterisks that aren't bullets
            .replace(/\*/g, '')
            // Clean up extra whitespace
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    };

    const handleAnalysis = async () => {
        setIsLoading(true);
        setInsights('');
        setError('');
        
        const loadingToast = toast.loading('Analyzing your journal entries...', {
            position: 'bottom-right',
        });
        
        try {
            const collectionPath = `users/${userId}/journalEntries`;
            const q = query(collection(db, collectionPath));
            const querySnapshot = await getDocs(q);
            const entriesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (entriesData.length < 3) {
                const msg = "You need at least 3 journal entries for a meaningful analysis. Keep writing, and check back soon!";
                setInsights(msg);
                toast.dismiss(loadingToast);
                toast('Need more entries! 📝', {
                    icon: '💡',
                    duration: 4000,
                    position: 'bottom-right',
                });
                setIsLoading(false);
                return;
            }
            const result = await analyzeJournalEntries(entriesData);
            const formattedResult = formatAIResponse(result);
            setInsights(formattedResult);
            toast.dismiss(loadingToast);
            toast.success('Insights generated! ✨', {
                duration: 3000,
                position: 'bottom-right',
            });
        } catch (err) {
            console.error('InsightsScreen error:', err);
            const errorMsg = `Failed to get insights: ${err.message || 'Please check your connection and API key.'}`;
            setError(errorMsg);
            toast.dismiss(loadingToast);
            toast.error('Failed to generate insights', {
                duration: 4000,
                position: 'bottom-right',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full items-center justify-start overflow-y-auto p-4 sm:p-8">
            <div className="w-full max-w-4xl mx-auto">
                <div className="text-center mb-6">
                    <BotIcon />
                    <h2 className={`text-2xl sm:text-3xl font-bold mt-4 mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Your Personal Insights</h2>
                    {!insights && !isLoading && <p className={`text-sm sm:text-base max-w-md mx-auto ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>Click the button below to have your AI partner analyze your journal and reveal hidden patterns.</p>}
                </div>
                <div className="text-center">
                    <button onClick={handleAnalysis} disabled={isLoading} className="mt-4 sm:mt-8 px-6 sm:px-8 py-2.5 sm:py-3 bg-purple-600 text-white hover:bg-purple-700 font-bold rounded-lg shadow-lg transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center text-sm sm:text-base">
                        {isLoading ? <><Spinner /> <span className="ml-3">Analyzing...</span></> : 'Analyze My Journal'}
                    </button>
                </div>
                <div className="mt-6 sm:mt-8">
                    {error && <p className={`p-4 rounded-lg text-sm sm:text-base ${darkMode ? 'text-red-400 bg-red-900/30 border border-red-800' : 'text-red-500 bg-red-100'}`}>{error}</p>}
                    {insights && (
                        <div className={`p-4 sm:p-6 rounded-lg shadow-sm animate-fade-in max-w-full overflow-hidden ${darkMode ? 'bg-zinc-900 border border-zinc-800 text-zinc-200' : 'bg-white text-slate-700'}`}>
                            <div className="max-w-none">
                                {insights.split('\n\n').map((paragraph, idx) => (
                                    <p key={idx} className="mb-4 text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap">
                                        {paragraph}
                                    </p>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function AnalyticsScreen({ userId, darkMode }) {
    const [entries, setEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzingPeople, setIsAnalyzingPeople] = useState(false);
    const [isBackfillingEmbeddings, setIsBackfillingEmbeddings] = useState(false);
    const [backfillProgress, setBackfillProgress] = useState({ current: 0, total: 0 });
    const [peopleData, setPeopleData] = useState([]);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [stats, setStats] = useState({
        totalEntries: 0,
        currentStreak: 0,
        totalWords: 0,
        mostActiveDay: '',
        mostActiveHour: '',
        avgWordsPerEntry: 0
    });
    const [moodData, setMoodData] = useState([]);
    const [activityData, setActivityData] = useState([]);

    useEffect(() => {
        setIsLoading(true);
        const collectionPath = `users/${userId}/journalEntries`;
        // Don't use orderBy to avoid index issues - we'll sort in memory
        const q = query(collection(db, collectionPath));
        
        const unsubscribe = onSnapshot(q, 
            (querySnapshot) => {
                console.log('Analytics: Received', querySnapshot.docs.length, 'entries');
                const entriesData = querySnapshot.docs.map(doc => { 
                    const data = doc.data();
                    console.log('Entry data:', data);
                    // Handle both timestamp and createdAt fields
                    const timestamp = data.createdAt?.toDate() || data.timestamp?.toDate() || new Date();
                    return {
                        id: doc.id, 
                        ...data,
                        timestamp: timestamp,
                        entry: data.text || data.entry || '' // Handle both text and entry fields
                    };
                });
                
                // Sort in memory by timestamp
                entriesData.sort((a, b) => a.timestamp - b.timestamp);
                
                console.log('Processed entries:', entriesData);
                setEntries(entriesData);
                calculateStats(entriesData);
                setIsLoading(false);
            },
            (error) => {
                console.error('Analytics error:', error);
                toast.error('Failed to load analytics: ' + error.message);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [userId]);

    const calculateStats = (entriesData) => {
        if (entriesData.length === 0) {
            setStats({
                totalEntries: 0,
                currentStreak: 0,
                totalWords: 0,
                mostActiveDay: 'N/A',
                mostActiveHour: 'N/A',
                avgWordsPerEntry: 0
            });
            return;
        }

        // Total entries and words
        const totalEntries = entriesData.length;
        const totalWords = entriesData.reduce((sum, entry) => sum + (entry.entry?.split(' ').length || 0), 0);
        const avgWordsPerEntry = Math.round(totalWords / totalEntries);

        // Calculate streak
        const sortedEntries = [...entriesData].sort((a, b) => b.timestamp - a.timestamp);
        let currentStreak = 0;
        let lastDate = null;
        
        for (const entry of sortedEntries) {
            const entryDate = new Date(entry.timestamp).toDateString();
            if (!lastDate) {
                currentStreak = 1;
                lastDate = new Date(entry.timestamp);
            } else {
                const dayDiff = Math.floor((lastDate - entry.timestamp) / (1000 * 60 * 60 * 24));
                if (dayDiff === 1) {
                    currentStreak++;
                    lastDate = entry.timestamp;
                } else if (dayDiff > 1) {
                    break;
                }
            }
        }

        // Most active day of week
        const dayCount = {};
        const hourCount = {};
        
        entriesData.forEach(entry => {
            const day = entry.timestamp.toLocaleDateString('en-US', { weekday: 'long' });
            const hour = entry.timestamp.getHours();
            
            dayCount[day] = (dayCount[day] || 0) + 1;
            hourCount[hour] = (hourCount[hour] || 0) + 1;
        });

        const mostActiveDay = Object.keys(dayCount).reduce((a, b) => dayCount[a] > dayCount[b] ? a : b, 'N/A');
        const mostActiveHourNum = Object.keys(hourCount).reduce((a, b) => hourCount[a] > hourCount[b] ? a : b, 0);
        const mostActiveHour = `${mostActiveHourNum}:00 - ${parseInt(mostActiveHourNum) + 1}:00`;

        setStats({
            totalEntries,
            currentStreak,
            totalWords,
            mostActiveDay,
            mostActiveHour,
            avgWordsPerEntry
        });

        // Prepare mood data (simplified - based on entry length and word count)
        const last30Days = entriesData.slice(-30);
        const moodChartData = last30Days.map((entry, idx) => {
            const wordCount = entry.entry?.split(' ').length || 0;
            const sentiment = wordCount > 100 ? 8 : wordCount > 50 ? 6 : 4; // Simplified sentiment
            
            return {
                date: entry.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                mood: sentiment,
                words: wordCount
            };
        });
        setMoodData(moodChartData);

        // Activity heatmap data (entries per day of week)
        const activityChartData = Object.keys(dayCount).map(day => ({
            day: day.substring(0, 3), // Mon, Tue, etc.
            entries: dayCount[day]
        }));
        setActivityData(activityChartData);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4 sm:p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-700'}`}>Your Journal Insights</h2>
                        <p className={darkMode ? 'text-zinc-400' : 'text-slate-500'}>Discover patterns and trends in your journaling journey</p>
                    </div>
                    <button
                        onClick={async () => {
                            setIsBackfillingEmbeddings(true);
                            try {
                                const result = await backfillEmbeddings(userId, (current, total) => {
                                    setBackfillProgress({ current, total });
                                });
                                toast.success(`✅ Backfill complete! Processed ${result.processed} entries`, { duration: 5000 });
                            } catch (error) {
                                toast.error('Failed to backfill embeddings');
                            } finally {
                                setIsBackfillingEmbeddings(false);
                                setBackfillProgress({ current: 0, total: 0 });
                            }
                        }}
                        disabled={isBackfillingEmbeddings}
                        className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 text-sm ${darkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-purple-500 text-white hover:bg-purple-600'}`}
                    >
                        {isBackfillingEmbeddings ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                {backfillProgress.total > 0 ? `${backfillProgress.current}/${backfillProgress.total}` : 'Processing...'}
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="h-4 w-4" />
                                Enable AI Search
                            </>
                        )}
                    </button>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    <div className={`p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200'}`}>
                        <div className={`text-xs uppercase tracking-wide font-semibold mb-2 ${darkMode ? 'text-zinc-400' : 'text-stone-700'}`}>Total Entries</div>
                        <div className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>{stats.totalEntries}</div>
                        <div className={`text-sm mt-1 ${darkMode ? 'text-zinc-500' : 'text-stone-500'}`}>journal moments</div>
                    </div>
                    
                    <div className={`p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100'}`}>
                        <div className={`text-xs uppercase tracking-wide font-semibold mb-2 ${darkMode ? 'text-zinc-400' : 'text-purple-600'}`}>Current Streak</div>
                        <div className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-purple-700'}`}>{stats.currentStreak}</div>
                        <div className={`text-sm mt-1 ${darkMode ? 'text-zinc-500' : 'text-purple-500'}`}>consecutive days</div>
                    </div>
                    
                    <div className={`p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100'}`}>
                        <div className={`text-xs uppercase tracking-wide font-semibold mb-2 ${darkMode ? 'text-zinc-400' : 'text-orange-600'}`}>Total Words</div>
                        <div className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-orange-700'}`}>{stats.totalWords.toLocaleString()}</div>
                        <div className={`text-sm mt-1 ${darkMode ? 'text-zinc-500' : 'text-orange-500'}`}>words written</div>
                    </div>
                    
                    <div className={`p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-gradient-to-br from-sky-50 to-blue-50 border border-blue-100'}`}>
                        <div className={`text-xs uppercase tracking-wide font-semibold mb-2 ${darkMode ? 'text-zinc-400' : 'text-blue-600'}`}>Most Active Day</div>
                        <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-blue-700'}`}>{stats.mostActiveDay}</div>
                        <div className={`text-sm mt-1 ${darkMode ? 'text-zinc-500' : 'text-blue-500'}`}>your favorite day</div>
                    </div>
                    
                    <div className={`p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-gradient-to-br from-rose-50 to-pink-50 border border-pink-100'}`}>
                        <div className={`text-xs uppercase tracking-wide font-semibold mb-2 ${darkMode ? 'text-zinc-400' : 'text-pink-600'}`}>Most Active Hour</div>
                        <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-pink-700'}`}>{stats.mostActiveHour}</div>
                        <div className={`text-sm mt-1 ${darkMode ? 'text-zinc-500' : 'text-pink-500'}`}>peak journaling time</div>
                    </div>
                    
                    <div className={`p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-gradient-to-br from-emerald-50 to-green-50 border border-green-100'}`}>
                        <div className={`text-xs uppercase tracking-wide font-semibold mb-2 ${darkMode ? 'text-zinc-400' : 'text-green-600'}`}>Avg Words/Entry</div>
                        <div className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-green-700'}`}>{stats.avgWordsPerEntry}</div>
                        <div className={`text-sm mt-1 ${darkMode ? 'text-zinc-500' : 'text-green-500'}`}>average length</div>
                    </div>
                </div>

                {/* Charts Section */}
                {entries.length > 0 && (
                    <>
                        {/* Mood Tracking Chart */}
                        {moodData.length > 0 && (
                            <div className={`p-6 rounded-xl shadow-sm mb-6 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-100'}`}>
                                <h3 className={`text-xl font-semibold mb-1 ${darkMode ? 'text-white' : 'text-slate-700'}`}>Mood & Activity Trend</h3>
                                <p className={`text-sm mb-4 ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>Track your emotional patterns over time</p>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={moodData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#3f3f46" : "#e2e8f0"} />
                                        <XAxis dataKey="date" stroke={darkMode ? "#a1a1aa" : "#94a3b8"} style={{ fontSize: '12px' }} />
                                        <YAxis yAxisId="left" stroke={darkMode ? "#71717a" : "#14b8a6"} label={{ value: 'Mood', angle: -90, position: 'insideLeft', style: { fill: darkMode ? '#a1a1aa' : '#0d9488' } }} style={{ fontSize: '12px' }} />
                                        <YAxis yAxisId="right" orientation="right" stroke={darkMode ? "#71717a" : "#f59e0b"} label={{ value: 'Words', angle: 90, position: 'insideRight', style: { fill: darkMode ? '#a1a1aa' : '#d97706' } }} style={{ fontSize: '12px' }} />
                                        <Tooltip contentStyle={{ backgroundColor: darkMode ? '#27272a' : '#fff', border: darkMode ? '1px solid #3f3f46' : '1px solid #e2e8f0', borderRadius: '8px', color: darkMode ? '#ffffff' : '#000000' }} />
                                        <Line yAxisId="left" type="monotone" dataKey="mood" stroke={darkMode ? "#a1a1aa" : "#14b8a6"} strokeWidth={3} dot={{ fill: darkMode ? "#a1a1aa" : "#14b8a6", r: 4 }} activeDot={{ r: 6 }} name="Mood Score" />
                                        <Line yAxisId="right" type="monotone" dataKey="words" stroke={darkMode ? "#71717a" : "#fb923c"} strokeWidth={2} dot={{ fill: darkMode ? "#71717a" : "#fb923c", r: 3 }} name="Word Count" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Emotion Analytics */}
                        {(() => {
                            const emotionCounts = entries
                                .filter(e => e.emotion)
                                .reduce((acc, entry) => {
                                    const label = entry.emotion.label;
                                    acc[label] = (acc[label] || 0) + 1;
                                    return acc;
                                }, {});
                            
                            const hasEmotions = Object.keys(emotionCounts).length > 0;
                            
                            return hasEmotions && (
                                <div className={`p-6 rounded-xl shadow-sm mb-6 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100'}`}>
                                    <h3 className={`text-xl font-semibold mb-1 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                                        <span className="text-2xl">🎭</span>
                                        Emotional Tone Analysis
                                    </h3>
                                    <p className={`text-sm mb-4 ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>Your emotional journey through journaling</p>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                        {Object.entries(emotionCounts)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([emotion, count]) => {
                                                const emotionData = entries.find(e => e.emotion?.label === emotion)?.emotion;
                                                const percentage = Math.round((count / entries.length) * 100);
                                                
                                                return (
                                                    <div
                                                        key={emotion}
                                                        className={`backdrop-blur-sm border rounded-xl p-4 text-center hover:shadow-md transition-all duration-200 hover:scale-105 ${darkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white/80 border-purple-200'}`}
                                                    >
                                                        <div className="text-4xl mb-2">{emotionData?.emoji || '😊'}</div>
                                                        <div className={`font-semibold ${darkMode ? 'text-zinc-200' : 'text-slate-700'}`} style={{ color: emotionData?.color }}>
                                                            {emotion}
                                                        </div>
                                                        <div className={`text-2xl font-bold mt-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{count}</div>
                                                        <div className={`text-xs mt-1 ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>{percentage}% of entries</div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Activity Heatmap */}
                        {activityData.length > 0 && (
                            <div className={`p-6 rounded-xl shadow-sm mb-6 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-100'}`}>
                                <h3 className={`text-xl font-semibold mb-1 ${darkMode ? 'text-white' : 'text-slate-700'}`}>Weekly Activity</h3>
                                <p className={`text-sm mb-4 ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>Your journaling patterns throughout the week</p>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={activityData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#3f3f46" : "#e2e8f0"} />
                                        <XAxis dataKey="day" stroke={darkMode ? "#a1a1aa" : "#94a3b8"} style={{ fontSize: '12px' }} />
                                        <YAxis stroke={darkMode ? "#a1a1aa" : "#94a3b8"} label={{ value: 'Entries', angle: -90, position: 'insideLeft', style: { fill: darkMode ? '#a1a1aa' : '#64748b' } }} style={{ fontSize: '12px' }} />
                                        <Tooltip contentStyle={{ backgroundColor: darkMode ? '#27272a' : '#fff', border: darkMode ? '1px solid #3f3f46' : '1px solid #e2e8f0', borderRadius: '8px', color: darkMode ? '#ffffff' : '#000000' }} />
                                        <Bar dataKey="entries" fill={darkMode ? "#71717a" : "#a78bfa"} radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* People & Relationship Insights */}
                        <div className={`p-6 rounded-xl shadow-sm mb-6 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-100'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className={`text-xl font-semibold mb-1 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                                        <UserGroupIcon className={`h-6 w-6 ${darkMode ? 'text-zinc-400' : 'text-indigo-500'}`} />
                                        People in Your Life
                                    </h3>
                                    <p className={`text-sm ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>Discover who you mention most and relationship patterns</p>
                                </div>
                                <button
                                    onClick={async () => {
                                        setIsAnalyzingPeople(true);
                                        const people = await analyzePeopleInEntries(entries);
                                        setPeopleData(people);
                                        setIsAnalyzingPeople(false);
                                        toast.success('People analysis complete! 👥');
                                    }}
                                    disabled={isAnalyzingPeople}
                                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${darkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700 disabled:bg-zinc-700' : 'bg-indigo-500 text-white hover:bg-indigo-600 disabled:bg-indigo-300'}`}
                                >
                                    {isAnalyzingPeople ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="h-5 w-5" />
                                            Analyze People
                                        </>
                                    )}
                                </button>
                            </div>

                            {peopleData.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {peopleData.map((person, idx) => {
                                        const sentimentColors = {
                                            positive: 'from-green-50 to-emerald-50 border-green-200',
                                            neutral: 'from-stone-50 to-stone-100 border-stone-200',
                                            negative: 'from-red-50 to-rose-50 border-red-200'
                                        };
                                        const sentimentIcons = {
                                            positive: '😊',
                                            neutral: '😐',
                                            negative: '😔'
                                        };
                                        const sentimentTextColors = {
                                            positive: 'text-green-600',
                                            neutral: 'text-blue-600',
                                            negative: 'text-red-600'
                                        };

                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedPerson(selectedPerson?.name === person.name ? null : person)}
                                                className={`bg-gradient-to-br ${sentimentColors[person.sentiment]} border p-5 rounded-xl cursor-pointer hover:shadow-md transition-all duration-200 ${
                                                    selectedPerson?.name === person.name ? 'ring-2 ring-indigo-500 shadow-lg scale-105' : ''
                                                }`}
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-12 h-12 rounded-full ${sentimentColors[person.sentiment]} border-2 flex items-center justify-center text-2xl`}>
                                                            {sentimentIcons[person.sentiment]}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-slate-800 text-lg">{person.name}</h4>
                                                            <p className={`text-xs font-medium ${sentimentTextColors[person.sentiment]} capitalize`}>
                                                                {person.sentiment} vibes
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm text-slate-600">
                                                        <span className="font-bold text-2xl text-slate-700">{person.mentions}</span>
                                                        <span className="ml-1">mention{person.mentions !== 1 ? 's' : ''}</span>
                                                    </div>
                                                    {selectedPerson?.name === person.name && (
                                                        <div className="text-xs text-indigo-600 font-medium">
                                                            Click to close
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-zinc-400">
                                    <UserGroupIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>Click "Analyze People" to discover who you mention most</p>
                                    <p className="text-xs mt-1">AI will identify people and relationship patterns in your journal</p>
                                </div>
                            )}

                            {/* Selected Person Detail Modal */}
                            {selectedPerson && (
                                <div className="mt-6 p-5 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <UserIcon className="h-8 w-8 text-indigo-600" />
                                        <div>
                                            <h4 className="text-lg font-bold text-indigo-900">{selectedPerson.name}</h4>
                                            <p className="text-sm text-indigo-600">Relationship Insights</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-white p-4 rounded-lg border border-indigo-100">
                                            <div className="text-xs text-indigo-600 font-semibold mb-1">Total Mentions</div>
                                            <div className="text-3xl font-bold text-indigo-700">{selectedPerson.mentions}</div>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg border border-indigo-100">
                                            <div className="text-xs text-indigo-600 font-semibold mb-1">Overall Sentiment</div>
                                            <div className="text-2xl font-bold text-indigo-700 capitalize">{selectedPerson.sentiment}</div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-indigo-100">
                                        <div className="text-xs text-indigo-600 font-semibold mb-2">What this means:</div>
                                        <p className="text-sm text-slate-700">
                                            {selectedPerson.sentiment === 'positive' && `You mention ${selectedPerson.name} frequently with positive associations. This person seems to have a uplifting presence in your life! 💚`}
                                            {selectedPerson.sentiment === 'neutral' && `${selectedPerson.name} is mentioned regularly in your journal with balanced emotions. This suggests a stable relationship. 💙`}
                                            {selectedPerson.sentiment === 'negative' && `When mentioning ${selectedPerson.name}, the context tends to be challenging. Consider how this relationship affects your well-being. 💔`}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Recent Entries Summary */}
                        <div className={`p-6 rounded-xl shadow-sm ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-100'}`}>
                            <h3 className={`text-xl font-semibold mb-1 ${darkMode ? 'text-white' : 'text-slate-700'}`}>Recent Activity</h3>
                            <p className={`text-sm mb-4 ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>Your latest journal entries</p>
                            <div className="space-y-3">
                                {entries.slice(-5).reverse().map(entry => (
                                    <div key={entry.id} className={`flex justify-between items-center p-4 border rounded-lg hover:shadow-sm transition-shadow duration-200 ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-gradient-to-r from-slate-50 to-white border-slate-100'}`}>
                                        <div className="flex-1">
                                            <div className={`text-xs font-medium mb-1 ${darkMode ? 'text-zinc-400' : 'text-zinc-400'}`}>
                                                {entry.timestamp.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            </div>
                                            <div className={`text-sm mt-1 truncate ${darkMode ? 'text-zinc-300' : 'text-slate-600'}`}>{entry.entry?.substring(0, 100)}...</div>
                                        </div>
                                        <div className={`ml-4 px-3 py-1 border rounded-full text-xs font-semibold ${darkMode ? 'bg-zinc-700 border-zinc-600 text-zinc-200' : 'bg-stone-100 border-stone-200 text-stone-700'}`}>
                                            {entry.entry?.split(' ').length || 0} words
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {entries.length === 0 && (
                    <div className="text-center py-12">
                        <ChartBarIcon className="h-16 w-16 text-zinc-300 mx-auto mb-4" />
                        <p className="text-slate-500 text-lg">Start journaling to see your analytics!</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function OnThisDayScreen({ userId, darkMode }) {
    const [entries, setEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        // Normalize to local date without time for comparison
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    });

    // Grouped memories keyed by year: { '2023': [entry, ...], ... }
    const [memoriesByYear, setMemoriesByYear] = useState({});

    useEffect(() => {
        setIsLoading(true);
        const collectionPath = `users/${userId}/journalEntries`;
        const q = query(collection(db, collectionPath), orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const entriesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: doc.data().createdAt?.toDate() || new Date()
            }));
            console.log('OnThisDay: Loaded entries:', entriesData.length);
            setEntries(entriesData);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        if (entries.length === 0) {
            setMemoriesByYear({});
            return;
        }

        const month = selectedDate.getMonth();
        const day = selectedDate.getDate();
        const grouped = {};

        console.log('OnThisDay: Filtering for month:', month, 'day:', day);
        console.log('OnThisDay: Total entries:', entries.length);

        for (const entry of entries) {
            const ts = new Date(entry.timestamp);
            console.log('Entry date:', ts, 'Month:', ts.getMonth(), 'Day:', ts.getDate());
            
            // Match entries with same month and day (from any year in the past or present)
            if (ts.getMonth() === month && ts.getDate() === day) {
                const year = ts.getFullYear().toString();
                console.log('✅ Match found for year:', year);
                if (!grouped[year]) grouped[year] = [];
                grouped[year].push(entry);
            }
        }

        console.log('OnThisDay: Grouped memories:', grouped);

        // Sort entries within each year by time, and sort years desc
        Object.keys(grouped).forEach(y => {
            grouped[y].sort((a, b) => a.timestamp - b.timestamp);
        });

        setMemoriesByYear(grouped);
    }, [entries, selectedDate]);

    const yearsDesc = Object.keys(memoriesByYear)
        .map(y => parseInt(y, 10))
        .sort((a, b) => b - a);

    const handleDateChange = (e) => {
        const value = e.target.value; // yyyy-mm-dd
        if (!value) return;
        const [yyyy, mm, dd] = value.split('-').map(n => parseInt(n, 10));
        setSelectedDate(new Date(yyyy, (mm - 1), dd));
    };

    // Build a yyyy-mm-dd string for input value
    const dateInputValue = (() => {
        const yyyy = selectedDate.getFullYear();
        const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const dd = String(selectedDate.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    })();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4 sm:p-6">
            <div className="max-w-3xl mx-auto">
                <div className={`backdrop-blur-sm border rounded-2xl p-6 shadow-sm mb-6 ${darkMode ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/80 border-slate-200'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                        <div>
                            <h2 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-700'}`}>On This Day</h2>
                            <p className={`mt-1 ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>See memories from <span className={`font-semibold ${darkMode ? 'text-zinc-200' : 'text-stone-700'}`}>{selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span> in previous years</p>
                        </div>
                        <div className="flex flex-col">
                            <label className={`text-xs mb-1 ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>Pick a date</label>
                            <input
                                type="date"
                                value={dateInputValue}
                                onChange={handleDateChange}
                                className={`px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white focus:ring-zinc-600 focus:border-zinc-600' : 'bg-white border-slate-200 text-slate-700 focus:ring-stone-300 focus:border-stone-300'}`}
                            />
                        </div>
                    </div>
                </div>

                {yearsDesc.length === 0 && (
                    <div className="text-center py-16">
                        <CalendarIcon className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-zinc-700' : 'text-zinc-300'}`} />
                        <p className={`text-lg ${darkMode ? 'text-zinc-400' : 'text-slate-500'}`}>No memories found for this date yet.</p>
                        <p className={`text-sm mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>Keep journaling and check back next year ✨</p>
                    </div>
                )}

                {yearsDesc.length > 0 && (
                    <div className="relative">
                        {/* Vertical timeline line */}
                        <div className={`absolute left-4 sm:left-6 top-0 bottom-0 w-px ${darkMode ? 'bg-zinc-800' : 'bg-slate-200'}`} aria-hidden="true"></div>

                        <div className="space-y-8">
                            {yearsDesc.map((year) => (
                                <div key={year} className="relative pl-12 sm:pl-16">
                                    {/* Year pill */}
                                    <div className="absolute -left-1 sm:-left-0 top-1">
                                        <div className="flex items-center">
                                            <div className={`h-3 w-3 rounded-full ring-4 ${darkMode ? 'bg-zinc-600 ring-zinc-800' : 'bg-stone-400 ring-stone-200'}`}></div>
                                            <span className={`ml-3 text-sm font-semibold border rounded-full px-3 py-1 ${darkMode ? 'text-zinc-200 bg-zinc-800 border-zinc-700' : 'text-stone-700 bg-stone-100 border-stone-200'}`}>{year}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-4">
                                        {memoriesByYear[year].map((entry) => (
                                            <div key={entry.id} className={`border rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className={`text-xs font-medium ${darkMode ? 'text-zinc-300' : 'text-stone-700'}`}>
                                                        {new Date(entry.timestamp).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                    <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                                        {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                                <div className={`whitespace-pre-wrap leading-relaxed ${darkMode ? 'text-zinc-200' : 'text-slate-700'}`}>
                                                    {entry.entry || entry.text || ''}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function NotificationsScreen({ userId, darkMode }) {
    const [entries, setEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    const [reminderTime, setReminderTime] = useState(() => {
        // Load saved reminder time from localStorage
        return localStorage.getItem('reminderTime') || '20:00';
    });

    useEffect(() => {
        const collectionPath = `users/${userId}/journalEntries`;
        const q = query(collection(db, collectionPath), orderBy('createdAt', 'asc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const entriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEntries(entriesData);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    // Load notification settings on mount
    useEffect(() => {
        const savedEnabled = localStorage.getItem('notificationsEnabled') === 'true';
        setNotificationsEnabled(savedEnabled);
        
        // Check daily reminders
        if (savedEnabled && notificationPermission === 'granted') {
            checkAndScheduleReminder();
        }
    }, []);

    // Check if it's time for a reminder
    const checkAndScheduleReminder = () => {
        const savedTime = localStorage.getItem('reminderTime') || '20:00';
        const now = new Date();
        const [hours, minutes] = savedTime.split(':');
        const reminderDate = new Date(now);
        reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Calculate time until reminder
        let timeUntilReminder = reminderDate - now;
        
        // If time has passed today, schedule for tomorrow
        if (timeUntilReminder < 0) {
            timeUntilReminder += 24 * 60 * 60 * 1000;
        }

        // Clear any existing reminder
        const existingTimeout = localStorage.getItem('reminderTimeout');
        if (existingTimeout) {
            clearTimeout(parseInt(existingTimeout));
        }

        // Schedule reminder
        const timeoutId = setTimeout(() => {
            if (notificationPermission === 'granted') {
                new Notification('Time to Journal! 📝', {
                    body: '✨ Take a moment to reflect on your day. Your thoughts matter!',
                    icon: '/vite.svg',
                    tag: 'daily-reminder',
                });
            }
            // Schedule next day's reminder
            checkAndScheduleReminder();
        }, timeUntilReminder);

        localStorage.setItem('reminderTimeout', timeoutId.toString());
    };

    const streak = calculateStreak(entries);

    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
            if (permission === 'granted') {
                setNotificationsEnabled(true);
                localStorage.setItem('notificationsEnabled', 'true');
                toast.success('Notifications enabled! 🔔', {
                    duration: 3000,
                    position: 'bottom-right',
                });
                // Send a test notification
                new Notification('AI Life Partner', {
                    body: '✨ Notifications are now enabled! You\'ll receive daily reminders to journal.',
                    icon: '/vite.svg',
                });
                // Schedule daily reminders
                checkAndScheduleReminder();
            } else {
                toast.error('Notification permission denied', {
                    duration: 4000,
                    position: 'bottom-right',
                });
            }
        } else {
            toast.error('Notifications not supported in this browser', {
                duration: 4000,
                position: 'bottom-right',
            });
        }
    };

    const scheduleReminder = () => {
        // Save reminder time to localStorage
        localStorage.setItem('reminderTime', reminderTime);
        
        // Schedule the reminder
        if (notificationPermission === 'granted') {
            checkAndScheduleReminder();
            toast.success(`Daily reminder set for ${reminderTime}! ⏰`, {
                duration: 3000,
                position: 'bottom-right',
            });
        } else {
            toast.error('Please enable notifications first', {
                duration: 4000,
                position: 'bottom-right',
            });
        }
    };

    const handleReminderTimeChange = (e) => {
        const newTime = e.target.value;
        setReminderTime(newTime);
        // Auto-save when user changes time
        localStorage.setItem('reminderTime', newTime);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Spinner />
            </div>
        );
    }

    const totalEntries = entries.length;
    const thisWeekEntries = entries.filter(e => {
        const entryDate = e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.timestamp);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return entryDate >= weekAgo;
    }).length;

    return (
        <div className={`h-full overflow-y-auto p-4 sm:p-6 transition-colors duration-300 ${darkMode ? 'bg-black' : 'bg-slate-50'}`}>
            <div className="max-w-4xl mx-auto">
                <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-slate-700'}`}>Notifications & Streaks</h2>

                {/* Streak Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className={`rounded-2xl p-6 text-center transition-colors duration-300 ${darkMode ? 'bg-zinc-900 border-2 border-zinc-800' : 'bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200'}`}>
                        <FireIcon className={`h-12 w-12 mx-auto mb-2 ${darkMode ? 'text-zinc-400' : 'text-orange-500'}`} />
                        <div className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-orange-600'}`}>{streak.current}</div>
                        <div className={`text-sm font-semibold mt-1 ${darkMode ? 'text-zinc-400' : 'text-orange-700'}`}>Current Streak</div>
                        <div className={`text-xs mt-1 ${darkMode ? 'text-zinc-500' : 'text-orange-600'}`}>Keep it going! 🎯</div>
                    </div>

                    <div className={`rounded-2xl p-6 text-center shadow-sm transition-colors duration-300 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-200'}`}>
                        <div className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>{streak.longest}</div>
                        <div className={`text-sm font-semibold mt-1 ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Longest Streak</div>
                        <div className={`text-xs mt-1 ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>Personal best! 🏆</div>
                    </div>

                    <div className={`rounded-2xl p-6 text-center shadow-sm transition-colors duration-300 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-200'}`}>
                        <div className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-blue-600'}`}>{totalEntries}</div>
                        <div className={`text-sm font-semibold mt-1 ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Total Entries</div>
                        <div className={`text-xs mt-1 ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>{thisWeekEntries} this week</div>
                    </div>
                </div>

                {/* Notification Settings */}
                <div className={`rounded-2xl p-6 shadow-sm mb-6 transition-colors duration-300 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white border border-slate-200'}`}>
                    <div className="flex items-center mb-4">
                        <BellIcon className={`h-6 w-6 mr-2 ${darkMode ? 'text-zinc-400' : 'text-stone-700'}`} />
                        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-700'}`}>Daily Reminders</h3>
                    </div>

                    <p className={`mb-4 ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
                        Never miss a day! Get a gentle reminder to reflect on your day and keep your streak alive.
                    </p>

                    {notificationPermission === 'denied' && (
                        <div className={`rounded-lg p-4 mb-4 ${darkMode ? 'bg-zinc-800 border border-zinc-700' : 'bg-yellow-50 border border-yellow-200'}`}>
                            <p className={`text-sm ${darkMode ? 'text-zinc-300' : 'text-yellow-800'}`}>
                                ⚠️ Notifications are blocked. Please enable them in your browser settings.
                            </p>
                        </div>
                    )}

                    {notificationPermission === 'default' && (
                        <button
                            onClick={requestNotificationPermission}
                            className={`w-full sm:w-auto px-6 py-3 font-semibold rounded-lg shadow-md transition-colors duration-200 ${darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-stone-200 hover:bg-stone-300 text-white'}`}
                        >
                            Enable Notifications 🔔
                        </button>
                    )}

                    {notificationPermission === 'granted' && (
                        <div className="space-y-4">
                            <div className={`flex items-center justify-between p-4 rounded-lg ${darkMode ? 'bg-zinc-800 border border-zinc-700' : 'bg-stone-50 border border-stone-200'}`}>
                                <span className={`font-semibold ${darkMode ? 'text-zinc-200' : 'text-stone-700'}`}>✅ Notifications Enabled</span>
                            </div>

                            <div>
                                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-slate-700'}`}>
                                    Reminder Time
                                </label>
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="time"
                                        value={reminderTime}
                                        onChange={handleReminderTimeChange}
                                        className={`px-4 py-2 border rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white focus:ring-zinc-600' : 'border-slate-300 text-slate-700 focus:ring-teal-500'}`}
                                    />
                                    <button
                                        onClick={scheduleReminder}
                                        className="px-6 py-2 bg-purple-600 text-white hover:bg-purple-700 font-semibold rounded-lg shadow-md transition-colors duration-200"
                                    >
                                        Save & Schedule
                                    </button>
                                </div>
                                <p className={`text-xs mt-2 ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                    ⏰ Reminder is automatically saved. Click "Save & Schedule" to update the daily notification time.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Motivation Section */}
                <div className={`rounded-2xl p-6 shadow-sm transition-colors duration-300 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-gradient-to-r from-stone-50 to-stone-100 border border-stone-200'}`}>
                    <h3 className={`text-lg font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-700'}`}>💡 Streak Tips</h3>
                    <ul className={`space-y-2 ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
                        <li className="flex items-start">
                            <span className={`mr-2 ${darkMode ? 'text-zinc-400' : 'text-stone-700'}`}>✓</span>
                            <span>Write even a short entry each day - consistency matters more than length</span>
                        </li>
                        <li className="flex items-start">
                            <span className={`mr-2 ${darkMode ? 'text-zinc-400' : 'text-stone-700'}`}>✓</span>
                            <span>Set a regular time for journaling to build the habit</span>
                        </li>
                        <li className="flex items-start">
                            <span className={`mr-2 ${darkMode ? 'text-zinc-400' : 'text-stone-700'}`}>✓</span>
                            <span>Use voice recording on busy days for quick entries</span>
                        </li>
                        <li className="flex items-start">
                            <span className={`mr-2 ${darkMode ? 'text-zinc-400' : 'text-stone-700'}`}>✓</span>
                            <span>Your streak resets if you miss a day, but you can always start again!</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

// --- GoalsScreen: Goal Tracking & Habits ---
function GoalsScreen({ userId, darkMode }) {
    const [goals, setGoals] = useState([]);
    const [habits, setHabits] = useState([]);
    const [entries, setEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddGoal, setShowAddGoal] = useState(false);
    const [showAddHabit, setShowAddHabit] = useState(false);
    const [newGoal, setNewGoal] = useState({ title: '', description: '', category: 'personal', targetDate: '', frequency: 'one-time', keywords: '' });
    const [newHabit, setNewHabit] = useState({ title: '', frequency: 'daily' });
    const [weeklyReport, setWeeklyReport] = useState(null);
    
    // Edit states
    const [editingGoal, setEditingGoal] = useState(null);
    const [editingHabit, setEditingHabit] = useState(null);

    useEffect(() => {
        setIsLoading(true);

        // Load goals
        const goalsPath = `users/${userId}/goals`;
        const goalsQuery = query(collection(db, goalsPath), orderBy('createdAt', 'desc'));
        const unsubGoals = onSnapshot(goalsQuery, (snapshot) => {
            const goalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGoals(goalsData);
        });

        // Load habits
        const habitsPath = `users/${userId}/habits`;
        const habitsQuery = query(collection(db, habitsPath), orderBy('createdAt', 'desc'));
        const unsubHabits = onSnapshot(habitsQuery, (snapshot) => {
            const habitsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setHabits(habitsData);
        });

        // Load journal entries for AI analysis
        const entriesPath = `users/${userId}/journalEntries`;
        const entriesQuery = query(collection(db, entriesPath), orderBy('createdAt', 'desc'));
        const unsubEntries = onSnapshot(entriesQuery, (snapshot) => {
            const entriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setEntries(entriesData);
            setIsLoading(false);
        });

        return () => {
            unsubGoals();
            unsubHabits();
            unsubEntries();
        };
    }, [userId]);

    const handleAddGoal = async () => {
        if (!newGoal.title.trim()) {
            toast.error('Please enter a goal title');
            return;
        }

        try {
            const goalsPath = `users/${userId}/goals`;
            await addDoc(collection(db, goalsPath), {
                ...newGoal,
                keywords: newGoal.keywords || '', // Store custom keywords for better matching
                createdAt: serverTimestamp(),
                progress: 0,
                completed: false,
                mentions: []
            });
            setNewGoal({ title: '', description: '', category: 'personal', targetDate: '', frequency: 'one-time', keywords: '' });
            setShowAddGoal(false);
            toast.success('Goal created! 🎯');
        } catch (error) {
            console.error('Error adding goal:', error);
            toast.error('Failed to create goal');
        }
    };

    const handleAddHabit = async () => {
        if (!newHabit.title.trim()) {
            toast.error('Please enter a habit title');
            return;
        }

        try {
            const habitsPath = `users/${userId}/habits`;
            await addDoc(collection(db, habitsPath), {
                ...newHabit,
                createdAt: serverTimestamp(),
                streak: 0,
                completions: [],
                lastCompleted: null
            });
            setNewHabit({ title: '', frequency: 'daily' });
            setShowAddHabit(false);
            toast.success('Habit tracker created! 🌱');
        } catch (error) {
            console.error('Error adding habit:', error);
            toast.error('Failed to create habit');
        }
    };

    const handleToggleHabit = async (habitId, completions) => {
        const today = new Date().toDateString();
        const isCompletedToday = completions?.some(c => new Date(c).toDateString() === today);
        
        try {
            const habitsPath = `users/${userId}/habits`;
            const habitRef = doc(db, habitsPath, habitId);
            
            if (isCompletedToday) {
                // Remove today's completion
                const updatedCompletions = completions.filter(c => new Date(c).toDateString() !== today);
                const streak = calculateHabitStreak(updatedCompletions);
                await updateDoc(habitRef, {
                    completions: updatedCompletions,
                    streak,
                    lastCompleted: updatedCompletions[updatedCompletions.length - 1] || null
                });
                toast.success('Habit unmarked for today');
            } else {
                // Add today's completion
                const updatedCompletions = [...(completions || []), new Date().toISOString()];
                const streak = calculateHabitStreak(updatedCompletions);
                await updateDoc(habitRef, {
                    completions: updatedCompletions,
                    streak,
                    lastCompleted: new Date().toISOString()
                });
                toast.success('Habit completed! 🎉');
            }
        } catch (error) {
            console.error('Error toggling habit:', error);
            toast.error('Failed to update habit');
        }
    };

    const calculateHabitStreak = (completions) => {
        if (!completions || completions.length === 0) return 0;
        
        const sortedDates = completions
            .map(c => new Date(c).toDateString())
            .sort((a, b) => new Date(b) - new Date(a));
        
        let streak = 0;
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (sortedDates[0] !== today && sortedDates[0] !== yesterday) return 0;
        
        for (let i = 0; i < sortedDates.length; i++) {
            const expectedDate = new Date(Date.now() - i * 86400000).toDateString();
            if (sortedDates[i] === expectedDate) {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    };

    const generateWeeklyReport = async () => {
        toast.loading('Analyzing your goals and habits...', { id: 'weekly-report' });
        
        try {
            const lastWeekEntries = entries.filter(e => {
                const entryDate = e.createdAt?.toDate();
                const weekAgo = new Date(Date.now() - 7 * 86400000);
                return entryDate >= weekAgo;
            });

            // Calculate habit completion rates for the week
            const habitStats = habits.map(habit => {
                const lastWeekCompletions = (habit.completions || []).filter(c => {
                    const compDate = new Date(c);
                    const weekAgo = new Date(Date.now() - 7 * 86400000);
                    return compDate >= weekAgo;
                });
                const completionRate = Math.round((lastWeekCompletions.length / 7) * 100);
                return {
                    title: habit.title,
                    completions: lastWeekCompletions.length,
                    streak: habit.streak || 0,
                    completionRate
                };
            });

            const entriesText = lastWeekEntries.map(e => e.text).join('\n\n');
            
            const prompt = `You are analyzing a user's progress for the past week. Provide a focused analysis on their goals and habits.

GOALS:
${goals.map(g => `- ${g.title} (${g.frequency || 'one-time'} goal, category: ${g.category})`).join('\n')}

HABITS PERFORMANCE THIS WEEK:
${habitStats.map(h => `- ${h.title}: ${h.completions}/7 days (${h.completionRate}%), current streak: ${h.streak} days`).join('\n')}

JOURNAL ENTRIES FROM THIS WEEK:
${entriesText || 'No journal entries this week.'}

Please provide:
1. **Goal Progress Summary**: For each goal, analyze if there's evidence of progress in the journal entries. Look for mentions, related activities, or mindset shifts.

2. **Habit Analysis**: 
   - Which habits are going well (>70% completion)?
   - Which habits need attention (<50% completion)?
   - Identify patterns - which days are hardest?
   - Suggest specific changes to improve consistency

3. **Behavioral Patterns**: What patterns do you notice in their writing that relate to their goals and habits?

4. **Actionable Recommendations**: Give 3-5 specific, practical suggestions for the coming week to improve goal achievement and habit consistency.

5. **Encouragement**: Acknowledge their wins and motivate them for next week.

Keep it focused on goals and habits - this is NOT a general journal analysis.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const report = response.text();
            
            setWeeklyReport(report);
            toast.success('Weekly report generated! 📊', { id: 'weekly-report' });
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error('Failed to generate report', { id: 'weekly-report' });
        }
    };

    const deleteGoal = async (goalId) => {
        if (!confirm('Are you sure you want to delete this goal?')) return;
        
        try {
            const goalsPath = `users/${userId}/goals`;
            const goalRef = doc(db, goalsPath, goalId);
            await deleteDoc(goalRef);
            toast.success('Goal deleted');
        } catch (error) {
            console.error('Error deleting goal:', error);
            toast.error('Failed to delete goal');
        }
    };

    const handleEditGoal = async () => {
        if (!editingGoal || !editingGoal.title.trim()) {
            toast.error('Please enter a goal title');
            return;
        }

        try {
            const goalsPath = `users/${userId}/goals`;
            const goalRef = doc(db, goalsPath, editingGoal.id);
            await updateDoc(goalRef, {
                title: editingGoal.title,
                description: editingGoal.description || '',
                category: editingGoal.category,
                frequency: editingGoal.frequency,
                keywords: editingGoal.keywords || '',
                targetDate: editingGoal.targetDate || ''
            });
            setEditingGoal(null);
            toast.success('Goal updated! 🎯');
        } catch (error) {
            console.error('Error updating goal:', error);
            toast.error('Failed to update goal');
        }
    };

    const deleteHabit = async (habitId) => {
        if (!confirm('Are you sure you want to delete this habit?')) return;
        
        try {
            const habitsPath = `users/${userId}/habits`;
            const habitRef = doc(db, habitsPath, habitId);
            await deleteDoc(habitRef);
            toast.success('Habit deleted');
        } catch (error) {
            console.error('Error deleting habit:', error);
            toast.error('Failed to delete habit');
        }
    };

    const handleEditHabit = async () => {
        if (!editingHabit || !editingHabit.title.trim()) {
            toast.error('Please enter a habit title');
            return;
        }

        try {
            const habitsPath = `users/${userId}/habits`;
            const habitRef = doc(db, habitsPath, editingHabit.id);
            await updateDoc(habitRef, {
                title: editingHabit.title,
                frequency: editingHabit.frequency
            });
            setEditingHabit(null);
            toast.success('Habit updated! 🌱');
        } catch (error) {
            console.error('Error updating habit:', error);
            toast.error('Failed to update habit');
        }
    };

    const scanAllEntries = async () => {
        toast.loading('Scanning journal entries for goals and habits...', { id: 'scan-entries' });
        
        try {
            console.log('🔍 Starting smart scan for user:', userId);
            
            // Get all goals and habits
            const goalsSnapshot = await getDocs(collection(db, `users/${userId}/goals`));
            const habitsSnapshot = await getDocs(collection(db, `users/${userId}/habits`));
            console.log('🎯 Found goals:', goalsSnapshot.size);
            console.log('🌱 Found habits:', habitsSnapshot.size);
            
            if (goalsSnapshot.empty && habitsSnapshot.empty) {
                toast.error('No goals or habits found to scan for', { id: 'scan-entries' });
                return;
            }
            
            // Get all entries
            const entriesSnapshot = await getDocs(collection(db, `users/${userId}/journalEntries`));
            console.log('📝 Total entries in database:', entriesSnapshot.size);
            
            if (entriesSnapshot.empty) {
                toast.error('No journal entries to scan', { id: 'scan-entries' });
                return;
            }
            
            // Helper: Get date boundaries for filtering
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay()); // Start of this week (Sunday)
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            
            console.log('� Date ranges:', {
                today: today.toDateString(),
                weekStart: weekStart.toDateString(),
                monthStart: monthStart.toDateString()
            });
            
            let totalScanned = 0;
            let updatedGoals = 0;
            
            // Process each goal individually
            for (const goalDoc of goalsSnapshot.docs) {
                const goal = goalDoc.data();
                const frequency = goal.frequency || 'one-time';
                
                console.log(`\n🎯 Processing goal: "${goal.title}" (${frequency})`);
                
                // Filter entries based on goal frequency
                const relevantEntries = entriesSnapshot.docs.filter(entryDoc => {
                    const entry = entryDoc.data();
                    
                    // Try multiple timestamp fields (createdAt, timestamp, date)
                    const entryDate = entry.createdAt?.toDate?.() || 
                                     entry.timestamp?.toDate?.() || 
                                     new Date(entry.createdAt || entry.timestamp || entry.date);
                    
                    console.log(`    Checking entry ${entryDoc.id}:`, {
                        hasCreatedAt: !!entry.createdAt,
                        hasTimestamp: !!entry.timestamp,
                        entryDate: entryDate.toDateString(),
                        today: today.toDateString(),
                        isToday: entryDate >= today
                    });
                    
                    if (isNaN(entryDate.getTime())) {
                        console.log(`      ❌ Invalid date for entry ${entryDoc.id}`);
                        return false; // Invalid date
                    }
                    
                    switch (frequency) {
                        case 'daily':
                            return entryDate >= today; // Only today
                        case 'weekly':
                            return entryDate >= weekStart; // This week
                        case 'monthly':
                            return entryDate >= monthStart; // This month
                        case 'one-time':
                        default:
                            return true; // All entries
                    }
                });
                
                console.log(`  📊 Scanning ${relevantEntries.length} relevant entries (out of ${entriesSnapshot.size})`);
                
                // Reset this goal's mentions
                await updateDoc(doc(db, `users/${userId}/goals`, goalDoc.id), {
                    mentions: [],
                    progress: 0
                });
                
                let goalMentions = [];
                
                // Check each relevant entry
                for (const entryDoc of relevantEntries) {
                    totalScanned++;
                    const entry = entryDoc.data();
                    const entryLower = (entry.text || '').toLowerCase();
                    const goalTitle = (goal.title || '').toLowerCase();
                    
                    // Enhanced matching with stemming and custom keywords
                    const stem = (word) => word.replace(/s$/, '').replace(/es$/, '').replace(/ed$/, '').replace(/ing$/, '');
                    
                    // Get custom keywords if provided
                    const customKeywords = goal.keywords 
                        ? goal.keywords.toLowerCase().split(',').map(k => k.trim()).filter(k => k.length >= 3)
                        : [];
                    
                    const titleKeywords = goalTitle.split(/[\s,]+/).filter(w => w.length >= 3 && !['the', 'and', 'for', 'with'].includes(w));
                    const allKeywords = [...titleKeywords, ...customKeywords];
                    
                    let mentioned = false;
                    
                    // Match 1: Full title
                    if (entryLower.includes(goalTitle)) {
                        mentioned = true;
                        console.log(`    ✅ Full match in entry ${entryDoc.id}`);
                    }
                    // Match 2: Custom keyword exact match
                    else if (customKeywords.some(kw => entryLower.includes(kw))) {
                        mentioned = true;
                        console.log(`    ✅ Custom keyword match in entry ${entryDoc.id}`);
                    }
                    // Match 3: Stemmed title
                    else {
                        const stemmedEntry = stem(entryLower);
                        const stemmedTitle = stem(goalTitle);
                        
                        if (stemmedEntry.includes(stemmedTitle)) {
                            mentioned = true;
                            console.log(`    ✅ Stemmed match in entry ${entryDoc.id}`);
                        } 
                        // Match 4: Keywords (40% threshold)
                        else {
                            const keywordMatches = allKeywords.filter(kw => {
                                const stemmedKw = stem(kw);
                                return stemmedEntry.includes(stemmedKw) || entryLower.includes(kw);
                            });
                            
                            if (keywordMatches.length >= Math.max(1, Math.ceil(allKeywords.length * 0.4))) {
                                mentioned = true;
                                console.log(`    ✅ Keyword match (${keywordMatches.join(', ')}) in entry ${entryDoc.id}`);
                            }
                        }
                    }
                    
                    if (mentioned) {
                        goalMentions.push(entryDoc.id);
                    }
                }
                
                // Update goal with all mentions found
                if (goalMentions.length > 0) {
                    await updateDoc(doc(db, `users/${userId}/goals`, goalDoc.id), {
                        mentions: goalMentions,
                        progress: Math.min(100, goalMentions.length * 10)
                    });
                    updatedGoals++;
                    console.log(`  � Found ${goalMentions.length} mentions for this goal`);
                } else {
                    console.log(`  ⚠️ No mentions found for this goal`);
                }
            }
            
            // ============= PROCESS HABITS =============
            console.log('\n🌱 Starting habit detection...');
            let updatedHabits = 0;
            
            for (const habitDoc of habitsSnapshot.docs) {
                const habit = habitDoc.data();
                const habitTitle = (habit.title || '').toLowerCase();
                
                console.log(`\n🌱 Processing habit: "${habit.title}"`);
                
                // Only check today's entries for habits (they're daily by nature)
                const todayEntries = entriesSnapshot.docs.filter(entryDoc => {
                    const entry = entryDoc.data();
                    const entryDate = entry.createdAt?.toDate?.() || 
                                     entry.timestamp?.toDate?.() || 
                                     new Date(entry.createdAt || entry.timestamp);
                    
                    if (isNaN(entryDate.getTime())) return false;
                    
                    return entryDate >= today; // Only today
                });
                
                console.log(`  📊 Checking ${todayEntries.length} entries from today`);
                
                // Check if habit is mentioned in today's entries
                const stem = (word) => word.replace(/s$/, '').replace(/es$/, '').replace(/ed$/, '').replace(/ing$/, '');
                const habitKeywords = habitTitle.split(/[\s,]+/).filter(w => w.length >= 3 && !['the', 'and', 'for', 'with'].includes(w));
                
                let habitMentioned = false;
                
                for (const entryDoc of todayEntries) {
                    const entry = entryDoc.data();
                    const entryLower = (entry.text || '').toLowerCase();
                    
                    // Check for habit mention
                    if (entryLower.includes(habitTitle)) {
                        habitMentioned = true;
                        console.log(`    ✅ Full match in entry ${entryDoc.id}`);
                        break;
                    } else {
                        const stemmedEntry = stem(entryLower);
                        const stemmedTitle = stem(habitTitle);
                        
                        if (stemmedEntry.includes(stemmedTitle)) {
                            habitMentioned = true;
                            console.log(`    ✅ Stemmed match in entry ${entryDoc.id}`);
                            break;
                        } else {
                            const keywordMatches = habitKeywords.filter(kw => {
                                const stemmedKw = stem(kw);
                                return stemmedEntry.includes(stemmedKw) || entryLower.includes(kw);
                            });
                            
                            if (keywordMatches.length >= Math.max(1, Math.ceil(habitKeywords.length * 0.4))) {
                                habitMentioned = true;
                                console.log(`    ✅ Keyword match (${keywordMatches.join(', ')}) in entry ${entryDoc.id}`);
                                break;
                            }
                        }
                    }
                }
                
                // Auto-complete habit if mentioned today and not already completed
                if (habitMentioned) {
                    const todayStr = today.toDateString();
                    const isAlreadyCompleted = (habit.completions || []).some(c => 
                        new Date(c).toDateString() === todayStr
                    );
                    
                    if (!isAlreadyCompleted) {
                        const updatedCompletions = [...(habit.completions || []), new Date().toISOString()];
                        const streak = calculateHabitStreak(updatedCompletions);
                        
                        await updateDoc(doc(db, `users/${userId}/habits`, habitDoc.id), {
                            completions: updatedCompletions,
                            streak,
                            lastCompleted: new Date().toISOString()
                        });
                        
                        updatedHabits++;
                        console.log(`  ✅ Auto-completed habit for today!`);
                    } else {
                        console.log(`  ℹ️ Habit already completed for today`);
                    }
                } else {
                    console.log(`  ⚠️ No mentions found for this habit today`);
                }
            }
            
            toast.success(`Scanned entries: ${updatedGoals} goals and ${updatedHabits} habits updated!`, { id: 'scan-entries' });
        } catch (error) {
            console.error('❌ Error scanning entries:', error);
            toast.error(`Failed to scan: ${error.message}`, { id: 'scan-entries' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className={`text-4xl font-bold flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        <TargetIcon className={`h-10 w-10 ${darkMode ? 'text-zinc-400' : 'text-stone-700'}`} />
                        Goals & Habits
                    </h1>
                    <p className={`mt-2 ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Track your progress and build lasting habits</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={scanAllEntries}
                        className={`px-4 py-2 rounded-lg transition-colors font-semibold flex items-center gap-2 ${darkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                    >
                        🔍 Scan All Entries
                    </button>
                    <button
                        onClick={generateWeeklyReport}
                        className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors font-semibold"
                    >
                        📊 Weekly Report
                    </button>
                </div>
            </div>

            {/* Weekly Report */}
            {weeklyReport && (
                <div className={`mb-8 border rounded-2xl p-6 shadow-lg ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-gradient-to-br from-stone-50 to-stone-100 border-stone-200'}`}>
                    <h2 className={`text-2xl font-bold mb-4 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        📊 Weekly Progress Report
                        <button
                            onClick={() => setWeeklyReport(null)}
                            className={`ml-auto ${darkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-slate-600'}`}
                        >
                            <XCircleIcon className="h-6 w-6" />
                        </button>
                    </h2>
                    <div className={`prose max-w-none whitespace-pre-wrap ${darkMode ? 'prose-invert text-zinc-200' : 'prose-slate text-slate-700'}`}>
                        {weeklyReport}
                    </div>
                </div>
            )}

            {/* Goals Section */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>🎯 Your Goals</h2>
                    <button
                        onClick={() => setShowAddGoal(!showAddGoal)}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold ${darkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                    >
                        <PlusIcon className="h-5 w-5" />
                        Add Goal
                    </button>
                </div>

                {showAddGoal && (
                    <div className={`mb-6 border rounded-2xl p-6 shadow-sm ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                        <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-slate-700'}`}>Create New Goal</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Goal title (e.g., 'Exercise regularly')"
                                value={newGoal.title}
                                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:ring-zinc-600' : 'border-slate-300 focus:ring-teal-500'}`}
                            />
                            <input
                                type="text"
                                placeholder="Keywords to detect (e.g., 'pushups, yoga, gym, workout') - separate with commas"
                                value={newGoal.keywords || ''}
                                onChange={(e) => setNewGoal({ ...newGoal, keywords: e.target.value })}
                                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 text-sm ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:ring-zinc-600' : 'border-slate-300 focus:ring-teal-500'}`}
                            />
                            <textarea
                                placeholder="Description (optional)"
                                value={newGoal.description}
                                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                                className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 min-h-[100px] ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:ring-zinc-600' : 'border-slate-300 focus:ring-teal-500'}`}
                            />
                            <div className="grid grid-cols-3 gap-4">
                                <select
                                    value={newGoal.category}
                                    onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                                    className={`p-3 border rounded-lg focus:outline-none focus:ring-2 ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white focus:ring-zinc-600' : 'border-slate-300 focus:ring-teal-500'}`}
                                >
                                    <option value="personal">Personal</option>
                                    <option value="health">Health</option>
                                    <option value="career">Career</option>
                                    <option value="relationships">Relationships</option>
                                    <option value="learning">Learning</option>
                                    <option value="other">Other</option>
                                </select>
                                <select
                                    value={newGoal.frequency}
                                    onChange={(e) => setNewGoal({ ...newGoal, frequency: e.target.value })}
                                    className={`p-3 border rounded-lg focus:outline-none focus:ring-2 ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white focus:ring-zinc-600' : 'border-slate-300 focus:ring-teal-500'}`}
                                >
                                    <option value="one-time">One-time Goal</option>
                                    <option value="daily">Daily Goal</option>
                                    <option value="weekly">Weekly Goal</option>
                                    <option value="monthly">Monthly Goal</option>
                                </select>
                                <input
                                    type="date"
                                    value={newGoal.targetDate}
                                    onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                                    className={`p-3 border rounded-lg focus:outline-none focus:ring-2 ${darkMode ? 'bg-zinc-800 border-zinc-700 text-white focus:ring-zinc-600' : 'border-slate-300 focus:ring-teal-500'}`}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleAddGoal}
                                    className={`flex-1 px-4 py-2 rounded-lg transition-colors font-semibold ${darkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-stone-200 text-white hover:bg-stone-300'}`}
                                >
                                    Create Goal
                                </button>
                                <button
                                    onClick={() => setShowAddGoal(false)}
                                    className={`px-4 py-2 rounded-lg transition-colors font-semibold ${darkMode ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Goal Modal */}
                {editingGoal && (
                    <div className="mb-6 bg-white border-2 border-stone-300 rounded-2xl p-6 shadow-lg">
                        <h3 className="text-lg font-bold text-slate-700 mb-4">Edit Goal</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Goal title"
                                value={editingGoal.title}
                                onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <input
                                type="text"
                                placeholder="Keywords (e.g., 'pushups, yoga, gym')"
                                value={editingGoal.keywords || ''}
                                onChange={(e) => setEditingGoal({ ...editingGoal, keywords: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                            />
                            <textarea
                                placeholder="Description (optional)"
                                value={editingGoal.description}
                                onChange={(e) => setEditingGoal({ ...editingGoal, description: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 min-h-[100px]"
                            />
                            <div className="grid grid-cols-3 gap-4">
                                <select
                                    value={editingGoal.category}
                                    onChange={(e) => setEditingGoal({ ...editingGoal, category: e.target.value })}
                                    className="p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="personal">Personal</option>
                                    <option value="health">Health</option>
                                    <option value="career">Career</option>
                                    <option value="relationships">Relationships</option>
                                    <option value="learning">Learning</option>
                                    <option value="other">Other</option>
                                </select>
                                <select
                                    value={editingGoal.frequency}
                                    onChange={(e) => setEditingGoal({ ...editingGoal, frequency: e.target.value })}
                                    className="p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="one-time">One-time Goal</option>
                                    <option value="daily">Daily Goal</option>
                                    <option value="weekly">Weekly Goal</option>
                                    <option value="monthly">Monthly Goal</option>
                                </select>
                                <input
                                    type="date"
                                    value={editingGoal.targetDate}
                                    onChange={(e) => setEditingGoal({ ...editingGoal, targetDate: e.target.value })}
                                    className="p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleEditGoal}
                                    className="flex-1 px-4 py-2 bg-stone-200 text-white rounded-lg hover:bg-stone-300 transition-colors font-semibold"
                                >
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => setEditingGoal(null)}
                                    className={`px-4 py-2 rounded-lg transition-colors font-semibold ${darkMode ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {goals.length === 0 ? (
                    <div className={`border rounded-2xl p-12 text-center ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                        <TargetIcon className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-zinc-700' : 'text-zinc-300'}`} />
                        <p className={`text-lg ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>No goals yet. Create your first goal to get started!</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {goals.map(goal => {
                            const categoryColors = darkMode ? {
                                personal: 'bg-zinc-800 text-zinc-300',
                                health: 'bg-zinc-800 text-zinc-300',
                                career: 'bg-zinc-800 text-zinc-300',
                                relationships: 'bg-zinc-800 text-zinc-300',
                                learning: 'bg-zinc-800 text-zinc-300',
                                other: 'bg-zinc-800 text-zinc-300'
                            } : {
                                personal: 'bg-purple-100 text-purple-700',
                                health: 'bg-green-100 text-green-700',
                                career: 'bg-blue-100 text-blue-700',
                                relationships: 'bg-pink-100 text-pink-700',
                                learning: 'bg-yellow-100 text-yellow-700',
                                other: 'bg-slate-100 text-slate-700'
                            };

                            const frequencyIcons = {
                                'one-time': '🎯',
                                'daily': '📅',
                                'weekly': '📆',
                                'monthly': '🗓️'
                            };
                            
                            return (
                                <div key={goal.id} className={`border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{goal.title}</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${categoryColors[goal.category]}`}>
                                                    {goal.category}
                                                </span>
                                                {goal.frequency && (
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${darkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-teal-100 text-stone-700'}`}>
                                                        {frequencyIcons[goal.frequency]} {goal.frequency}
                                                    </span>
                                                )}
                                            </div>
                                            {goal.description && (
                                                <p className={`mb-3 ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>{goal.description}</p>
                                            )}
                                            {goal.targetDate && (
                                                <p className={`text-sm ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>
                                                    Target: {new Date(goal.targetDate).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditingGoal(goal)}
                                                className={`transition-colors ${darkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-stone-700'}`}
                                                title="Edit goal"
                                            >
                                                <PencilSquareIcon className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => deleteGoal(goal.id)}
                                                className={`transition-colors ${darkMode ? 'text-zinc-500 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'}`}
                                                title="Delete goal"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Progress tracking would go here */}
                                    <div className="mt-4">
                                        <div className={`flex items-center justify-between text-sm mb-2 ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
                                            <span>AI-detected progress</span>
                                            <span className="font-semibold">{goal.mentions?.length || 0} mentions</span>
                                        </div>
                                        <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-zinc-800' : 'bg-slate-200'}`}>
                                            <div 
                                                className={`h-2 rounded-full transition-all duration-500 ${darkMode ? 'bg-zinc-700' : 'bg-stone-200'}`}
                                                style={{ width: `${Math.min((goal.mentions?.length || 0) * 10, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Habits Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-slate-800">🌱 Daily Habits</h2>
                    <button
                        onClick={() => setShowAddHabit(!showAddHabit)}
                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold ${darkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                    >
                        <PlusIcon className="h-5 w-5" />
                        Add Habit
                    </button>
                </div>

                {showAddHabit && (
                    <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-700 mb-4">Create New Habit</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Habit title (e.g., 'Meditate for 10 minutes')"
                                value={newHabit.title}
                                onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <select
                                value={newHabit.frequency}
                                onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                            </select>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleAddHabit}
                                    className="flex-1 px-4 py-2 bg-stone-200 text-white rounded-lg hover:bg-stone-300 transition-colors font-semibold"
                                >
                                    Create Habit
                                </button>
                                <button
                                    onClick={() => setShowAddHabit(false)}
                                    className={`px-4 py-2 rounded-lg transition-colors font-semibold ${darkMode ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Habit Modal */}
                {editingHabit && (
                    <div className="mb-6 bg-white border-2 border-stone-300 rounded-2xl p-6 shadow-lg">
                        <h3 className="text-lg font-bold text-slate-700 mb-4">Edit Habit</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Habit title (e.g., 'Morning yoga')"
                                value={editingHabit.title}
                                onChange={(e) => setEditingHabit({ ...editingHabit, title: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                            <select
                                value={editingHabit.frequency}
                                onChange={(e) => setEditingHabit({ ...editingHabit, frequency: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                            </select>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleEditHabit}
                                    className="flex-1 px-4 py-2 bg-stone-200 text-white rounded-lg hover:bg-stone-300 transition-colors font-semibold"
                                >
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => setEditingHabit(null)}
                                    className={`px-4 py-2 rounded-lg transition-colors font-semibold ${darkMode ? 'bg-zinc-700 text-zinc-200 hover:bg-zinc-600' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {habits.length === 0 ? (
                    <div className={`border rounded-2xl p-12 text-center ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                        <CheckCircleIcon className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-zinc-700' : 'text-zinc-300'}`} />
                        <p className={`text-lg ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>No habits yet. Create your first habit tracker!</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {habits.map(habit => {
                            const today = new Date().toDateString();
                            const isCompletedToday = habit.completions?.some(c => new Date(c).toDateString() === today);
                            
                            return (
                                <div key={habit.id} className={`border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                            <button
                                                onClick={() => handleToggleHabit(habit.id, habit.completions)}
                                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                                                    isCompletedToday 
                                                        ? 'bg-blue-500 text-white hover:bg-blue-600 scale-110'
                                                        : darkMode ? 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700' : 'bg-slate-200 text-zinc-400 hover:bg-slate-300'
                                                }`}
                                            >
                                                <CheckCircleIcon className="h-7 w-7" />
                                            </button>
                                            <div className="flex-1">
                                                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>{habit.title}</h3>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className={`text-sm capitalize ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>{habit.frequency}</span>
                                                    {habit.streak > 0 && (
                                                        <span className={`flex items-center gap-1 text-sm font-semibold ${darkMode ? 'text-zinc-400' : 'text-orange-600'}`}>
                                                            <FireIcon className="h-4 w-4" />
                                                            {habit.streak} day streak
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-stone-700'}`}>{habit.completions?.length || 0}</p>
                                                <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-slate-500'}`}>completions</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setEditingHabit(habit)}
                                                    className={`transition-colors ${darkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-stone-700'}`}
                                                    title="Edit habit"
                                                >
                                                    <PencilSquareIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => deleteHabit(habit.id)}
                                                    className={`transition-colors ${darkMode ? 'text-zinc-500 hover:text-red-400' : 'text-zinc-400 hover:text-red-500'}`}
                                                    title="Delete habit"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function ChatScreen({ userId, darkMode }) {
    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [messages, setMessages] = useState([{ sender: 'ai', text: 'You can ask me anything about your past journal entries. What would you like to know?' }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Function to format AI response - remove markdown symbols
    const formatAIResponse = (text) => {
        if (!text) return '';
        
        return text
            // Remove all heading markers (##, ###, ####)
            .replace(/#{1,6}\s+/g, '')
            // Remove ** bold markers
            .replace(/\*\*/g, '')
            // Remove __ bold markers
            .replace(/__/g, '')
            // Remove single * (but preserve bullets at start of line)
            .replace(/(?<!^|\n)\*(?!\*)/g, '')
            // Convert markdown bullets to proper bullets
            .replace(/^\s*[-*+]\s+/gm, '• ')
            // Remove any remaining asterisks that aren't bullets
            .replace(/\*/g, '')
            // Clean up extra whitespace
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    };

    // Load chat sessions on mount
    useEffect(() => {
        const sessionsPath = `users/${userId}/chatSessions`;
        const q = query(collection(db, sessionsPath), orderBy('updatedAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sessionsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setSessions(sessionsData);
            
            // If no active session and sessions exist, load the most recent one
            if (!activeSessionId && sessionsData.length > 0) {
                loadSession(sessionsData[0].id, sessionsData[0].messages);
            }
        });

        return () => unsubscribe();
    }, [userId]);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load a specific session
    const loadSession = (sessionId, sessionMessages) => {
        setActiveSessionId(sessionId);
        setMessages(sessionMessages || [{ sender: 'ai', text: 'You can ask me anything about your past journal entries. What would you like to know?' }]);
    };

    // Create new chat session
    const createNewSession = async () => {
        try {
            const sessionsPath = `users/${userId}/chatSessions`;
            const newSession = {
                messages: [{ sender: 'ai', text: 'You can ask me anything about your past journal entries. What would you like to know?' }],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                title: 'New Chat'
            };
            
            const docRef = await addDoc(collection(db, sessionsPath), newSession);
            setActiveSessionId(docRef.id);
            setMessages(newSession.messages);
            toast.success('New chat started! 💬');
        } catch (error) {
            console.error('Error creating new session:', error);
            toast.error('Failed to create new chat');
        }
    };

    // Delete a session
    const deleteSession = async (sessionId, e) => {
        e.stopPropagation();
        try {
            await deleteDoc(doc(db, `users/${userId}/chatSessions`, sessionId));
            toast.success('Chat deleted! 🗑️');
            
            // If deleted session was active, clear it
            if (activeSessionId === sessionId) {
                setActiveSessionId(null);
                setMessages([{ sender: 'ai', text: 'You can ask me anything about your past journal entries. What would you like to know?' }]);
            }
        } catch (error) {
            console.error('Error deleting session:', error);
            toast.error('Failed to delete chat');
        }
    };

    // Save current session
    const saveSession = async (updatedMessages) => {
        if (!activeSessionId) return;
        
        try {
            const sessionRef = doc(db, `users/${userId}/chatSessions`, activeSessionId);
            
            // Generate title from first user message
            const firstUserMessage = updatedMessages.find(msg => msg.sender === 'user');
            const title = firstUserMessage ? firstUserMessage.text.substring(0, 40) + '...' : 'New Chat';
            
            await updateDoc(sessionRef, {
                messages: updatedMessages,
                updatedAt: serverTimestamp(),
                title
            });
        } catch (error) {
            console.error('Error saving session:', error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (input.trim() === '' || isLoading) return;

        // If no active session, create one
        if (!activeSessionId) {
            await createNewSession();
            // Wait a bit for session to be created
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const userMessage = { sender: 'user', text: input };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);

        setInput('');
        setIsLoading(true);

        try {
            const collectionPath = `users/${userId}/journalEntries`;
            const q = query(collection(db, collectionPath));
            const querySnapshot = await getDocs(q);
            const entriesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const aiResponse = await askPastSelf(input, entriesData);
            const formattedResponse = formatAIResponse(aiResponse);
            const finalMessages = [...updatedMessages, { sender: 'ai', text: formattedResponse }];
            setMessages(finalMessages);
            
            // Save to Firestore
            await saveSession(finalMessages);
        } catch (error) {
            console.error('ChatScreen error:', error);
            const errorMsg = `Sorry, I ran into an error: ${error.message || 'Unable to access memories.'}`;
            const finalMessages = [...updatedMessages, { sender: 'ai', text: errorMsg }];
            setMessages(finalMessages);
            toast.error('Failed to get response from AI', {
                duration: 4000,
                position: 'bottom-right',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`flex h-full ${darkMode ? 'bg-zinc-950' : 'bg-slate-50'}`}>
            {/* Sessions Sidebar */}
            <div className={`w-64 border-r flex flex-col ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                <div className={`p-4 border-b ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                    <button
                        onClick={createNewSession}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${darkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                    >
                        <PlusIcon className="h-5 w-5" />
                        New Chat
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {sessions.length === 0 ? (
                        <div className={`text-center text-sm mt-8 px-4 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            <ChatBubbleIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No chat history yet</p>
                            <p className="text-xs mt-1">Start a new chat to begin</p>
                        </div>
                    ) : (
                        sessions.map(session => (
                            <div
                                key={session.id}
                                onClick={() => loadSession(session.id, session.messages)}
                                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                                    activeSessionId === session.id
                                        ? darkMode ? 'bg-zinc-800 border border-zinc-700' : 'bg-stone-50 border border-stone-200'
                                        : darkMode ? 'hover:bg-zinc-800 border border-transparent' : 'hover:bg-slate-50 border border-transparent'
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${
                                        activeSessionId === session.id 
                                            ? darkMode ? 'text-white' : 'text-stone-700' 
                                            : darkMode ? 'text-zinc-200' : 'text-slate-700'
                                    }`}>
                                        {session.title || 'New Chat'}
                                    </p>
                                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                        {session.updatedAt?.toDate ? session.updatedAt.toDate().toLocaleDateString() : 'Recent'}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => deleteSession(session.id, e)}
                                    className={`ml-2 p-1 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ${darkMode ? 'text-zinc-600' : 'text-zinc-400'}`}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                <header className={`p-6 border-b ${darkMode ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-white'}`}>
                    <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Talk to Your Past Self</h1>
                </header>
                <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-end gap-2 sm:gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.sender === 'ai' && <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-zinc-800' : 'bg-teal-100'}`}><BotIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${darkMode ? 'text-zinc-400' : 'text-stone-700'}`}/></div>}
                            <div className={`max-w-[85%] sm:max-w-lg px-3 sm:px-4 py-2 sm:py-3 rounded-2xl break-words ${msg.sender === 'user' ? darkMode ? 'bg-zinc-800 text-white' : 'bg-stone-200 text-slate-800' : darkMode ? 'bg-zinc-900 text-zinc-200 border border-zinc-800' : 'bg-white text-slate-700 shadow-sm'}`}>
                                <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-end gap-2 sm:gap-3 justify-start">
                            <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-zinc-800' : 'bg-teal-100'}`}><BotIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${darkMode ? 'text-zinc-400' : 'text-stone-700'}`}/></div>
                            <div className={`max-w-[85%] sm:max-w-lg px-3 sm:px-4 py-2 sm:py-3 rounded-2xl flex items-center space-x-2 ${darkMode ? 'bg-zinc-900 text-zinc-200 border border-zinc-800' : 'bg-white text-slate-700 shadow-sm'}`}>
                                <div className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-zinc-600' : 'bg-slate-400'}`}></div>
                                <div className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-zinc-600' : 'bg-slate-400'}`} style={{animationDelay: '0.2s'}}></div>
                                <div className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-zinc-600' : 'bg-slate-400'}`} style={{animationDelay: '0.4s'}}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className={`p-4 border-t ${darkMode ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-white'}`}>
                    <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about a memory, feeling, or event..." className={`w-full p-3 rounded-lg focus:outline-none focus:ring-2 ${darkMode ? 'bg-zinc-800 text-white placeholder-zinc-500 focus:ring-zinc-700 border border-zinc-700' : 'bg-slate-100 text-slate-700 focus:ring-teal-500'}`} disabled={isLoading} />
                        <button type="submit" disabled={isLoading || input.trim() === ''} className={`p-3 font-semibold rounded-lg transition-colors duration-300 flex items-center ${darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white disabled:bg-zinc-800 disabled:opacity-50' : 'bg-stone-200 hover:bg-stone-300 text-white disabled:bg-stone-100'} disabled:cursor-not-allowed`}>
                            <SendIcon />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}


// --- 5. Main App Layout ---
function MainApp({ user, darkMode, toggleDarkMode }) {
    const [activeTab, setActiveTab] = useState('journal');
    const [showAboutModal, setShowAboutModal] = useState(false);
    
    const handleSignOut = async () => { 
        await signOut(auth);
        toast.success('Signed out successfully. See you soon! 👋', {
            duration: 3000,
            position: 'bottom-right',
        });
    };
    const navItems = [
        { id: 'journal', label: 'Journal', icon: BookOpenIcon },
        { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
        { id: 'goals', label: 'Goals', icon: TargetIcon },
        { id: 'onthisday', label: 'On This Day', icon: CalendarIcon },
        { id: 'notifications', label: 'Notifications', icon: BellIcon },
        { id: 'chat', label: 'Chat', icon: ChatBubbleIcon },
        { id: 'insights', label: 'Insights', icon: SparklesIcon }
    ];

    return (
        <div className={`flex h-screen transition-colors duration-300 font-sans ${darkMode ? 'bg-black text-white' : 'bg-gradient-to-br from-slate-50 via-blue-50/20 to-teal-50/30 text-slate-800'}`}>
            <nav className={`flex flex-col justify-between w-20 md:w-64 p-4 shadow-sm transition-colors duration-300 ${darkMode ? 'bg-zinc-900 border-r border-zinc-800' : 'bg-white/80 backdrop-blur-sm border-r border-slate-200/50'}`}>
                <div className="space-y-2">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id)} title={item.label} className={`w-full flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 ${activeTab === item.id ? (darkMode ? 'bg-zinc-800 border border-zinc-700 text-white shadow-sm' : 'bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100 text-stone-700 shadow-sm') : (darkMode ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700')}`}>
                            <item.icon className="h-6 w-6 flex-shrink-0" />
                            <span className="hidden md:block font-semibold">{item.label}</span>
                        </button>
                    ))}
                </div>
                <div className="space-y-2">
                    {/* Dark Mode Toggle */}
                    <button onClick={toggleDarkMode} title={darkMode ? "Light Mode" : "Dark Mode"} className={`w-full flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 ${darkMode ? 'text-zinc-400 hover:bg-gray-800/50 hover:text-amber-400' : 'text-zinc-400 hover:bg-slate-50 hover:text-slate-700'}`}>
                        {darkMode ? <SunIcon className="h-6 w-6 flex-shrink-0" /> : <MoonIcon className="h-6 w-6 flex-shrink-0" />}
                        <span className="hidden md:block font-semibold">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                    {/* About Button */}
                    <button onClick={() => setShowAboutModal(true)} title="About Sora" className={`w-full flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 ${darkMode ? 'text-zinc-400 hover:bg-teal-900/30 hover:text-teal-400 hover:border hover:border-teal-800/50' : 'text-zinc-400 hover:bg-teal-50 hover:text-teal-600 hover:border hover:border-teal-100'}`}>
                        <InfoIcon className="h-6 w-6 flex-shrink-0" />
                        <span className="hidden md:block font-semibold">About</span>
                    </button>
                    <button onClick={handleSignOut} title="Sign Out" className={`w-full flex items-center space-x-4 p-3 rounded-xl transition-all duration-200 ${darkMode ? 'text-zinc-400 hover:bg-rose-900/30 hover:text-rose-400 hover:border hover:border-rose-800/50' : 'text-zinc-400 hover:bg-rose-50 hover:text-rose-500 hover:border hover:border-rose-100'}`}>
                        <SignOutIcon className="h-6 w-6 flex-shrink-0" />
                        <span className="hidden md:block font-semibold">Sign Out</span>
                    </button>
                </div>
            </nav>
            <main className="flex-1 overflow-y-auto backdrop-blur-sm">
                {activeTab === 'journal' && <JournalScreen userId={user.uid} darkMode={darkMode} />}
                {activeTab === 'analytics' && <AnalyticsScreen userId={user.uid} darkMode={darkMode} />}
                {activeTab === 'goals' && <GoalsScreen userId={user.uid} darkMode={darkMode} />}
                {activeTab === 'onthisday' && <OnThisDayScreen userId={user.uid} darkMode={darkMode} />}
                {activeTab === 'notifications' && <NotificationsScreen userId={user.uid} darkMode={darkMode} />}
                {activeTab === 'chat' && <ChatScreen userId={user.uid} darkMode={darkMode} />}
                {activeTab === 'insights' && <InsightsScreen userId={user.uid} darkMode={darkMode} />}
            </main>
            
            {/* About Modal */}
            {showAboutModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowAboutModal(false)}>
                    <div className={`max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 sm:p-8 ${darkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${darkMode ? 'bg-teal-900/30' : 'bg-teal-50'}`}>
                                    <SparklesIcon className={`h-8 w-8 ${darkMode ? 'text-teal-400' : 'text-teal-600'}`} />
                                </div>
                                <div>
                                    <h2 className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>About Sora</h2>
                                    <p className={`text-sm ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>Your AI Life Partner</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAboutModal(false)} className={`p-2 rounded-lg transition-colors ${darkMode ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-600'}`}>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Description */}
                        <p className={`text-base sm:text-lg mb-6 leading-relaxed ${darkMode ? 'text-zinc-300' : 'text-slate-700'}`}>
                            Sora is an intelligent journaling companion that helps you reflect, grow, and achieve your personal goals through AI-powered insights and features.
                        </p>

                        {/* Features Grid */}
                        <div className="space-y-4 mb-6">
                            <h3 className={`text-xl font-semibold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>✨ Features</h3>
                            
                            <div className="grid gap-3 sm:gap-4">
                                {[
                                    { icon: '📝', title: 'Smart Journaling', desc: 'Write or record your thoughts with voice-to-text transcription' },
                                    { icon: '💬', title: 'AI Chat Companion', desc: 'Talk to your past self and get insights from your journal history' },
                                    { icon: '📊', title: 'Analytics Dashboard', desc: 'Visualize your mood patterns, emotional trends, and writing habits' },
                                    { icon: '🎯', title: 'Goals & Habits', desc: 'Set goals, track habits, and monitor your progress over time' },
                                    { icon: '🔮', title: 'AI Insights', desc: 'Get personalized insights and patterns from your journal entries' },
                                    { icon: '📅', title: 'On This Day', desc: 'Revisit memories from past years on the same day' },
                                    { icon: '🔔', title: 'Smart Notifications', desc: 'Scheduled reminders to maintain your journaling streak' },
                                    { icon: '🌙', title: 'Dark Mode', desc: 'Easy on the eyes with beautiful dark theme support' },
                                    { icon: '📱', title: 'PWA Ready', desc: 'Install as an app on your phone or desktop for native-like experience' },
                                    { icon: '🔒', title: 'Secure & Private', desc: 'Your data is encrypted and stored securely with Firebase' },
                                    { icon: '🎨', title: 'Beautiful UI', desc: 'Modern, responsive design that works on all devices' },
                                ].map((feature, idx) => (
                                    <div key={idx} className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl transition-all hover:scale-[1.02] ${darkMode ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-slate-50 hover:bg-slate-100'}`}>
                                        <span className="text-2xl flex-shrink-0">{feature.icon}</span>
                                        <div>
                                            <h4 className={`font-semibold text-sm sm:text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>{feature.title}</h4>
                                            <p className={`text-xs sm:text-sm ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>{feature.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tech Stack */}
                        <div className={`p-4 sm:p-6 rounded-xl mb-6 ${darkMode ? 'bg-zinc-800/50' : 'bg-slate-50'}`}>
                            <h3 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>🛠️ Built With</h3>
                            <div className="flex flex-wrap gap-2">
                                {['React', 'Vite', 'Tailwind CSS', 'Firebase', 'Google Gemini AI', 'PWA'].map((tech) => (
                                    <span key={tech} className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-medium ${darkMode ? 'bg-teal-900/30 text-teal-400 border border-teal-800/50' : 'bg-teal-50 text-teal-700 border border-teal-200'}`}>
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={`text-center pt-4 border-t ${darkMode ? 'border-zinc-800' : 'border-slate-200'}`}>
                            <p className={`text-sm ${darkMode ? 'text-zinc-400' : 'text-slate-600'}`}>
                                Made with ❤️ for personal growth and self-reflection
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- 6. App Root ---
export default function App() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Dark Mode with pure black/gray theme
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        return saved === 'true';
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const toggleDarkMode = () => {
        setDarkMode(prev => {
            const newValue = !prev;
            localStorage.setItem('darkMode', newValue.toString());
            toast.success(newValue ? '🌙 Dark mode enabled' : '☀️ Light mode enabled', {
                duration: 2000,
                position: 'bottom-right',
            });
            return newValue;
        });
    };

    if (isLoading) {
        return (
            <div className={`min-h-screen flex justify-center items-center transition-colors duration-300 ${darkMode ? 'bg-black' : 'bg-slate-50'}`}>
                <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${darkMode ? 'border-zinc-600' : 'border-stone-600'}`}></div>
            </div>
        );
    }

    return (
        <>
            <Toaster 
                position="bottom-right"
                toastOptions={{
                    duration: 3000,
                    style: darkMode ? {
                        background: '#1e293b',
                        color: '#e2e8f0',
                        border: '1px solid #475569',
                        padding: '16px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
                    } : {
                        background: '#ffffff',
                        color: '#334155',
                        border: '1px solid #e2e8f0',
                        padding: '16px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    },
                    success: {
                        iconTheme: {
                            primary: darkMode ? '#5eead4' : '#14b8a6',
                            secondary: darkMode ? '#1e293b' : '#ffffff',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: darkMode ? '#fca5a5' : '#ef4444',
                            secondary: darkMode ? '#1e293b' : '#ffffff',
                        },
                    },
                }}
            />
            {user ? <MainApp user={user} darkMode={darkMode} toggleDarkMode={toggleDarkMode} /> : <AuthScreen darkMode={darkMode} />}
        </>
    );
}










