import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase.js'; // Import our Firestore database instance
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import Spinner from './Spinner.jsx';

// This is the component that displays a single journal entry
const JournalEntry = ({ entry }) => {
    // Format the date to be more readable
    const date = entry.createdAt?.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-md animate-fade-in">
            <p className="text-sm text-gray-400 mb-2">{date || 'Just now'}</p>
            {/* whitespace-pre-wrap preserves line breaks from the textarea */}
            <p className="text-gray-200 whitespace-pre-wrap">{entry.text}</p>
        </div>
    );
};


export default function JournalScreen({ userId }) {
    const [entries, setEntries] = useState([]);
    const [newEntry, setNewEntry] = useState('');
    const [isLoading, setIsLoading] = useState(true); // To show a spinner while initial data loads
    const [isSaving, setIsSaving] = useState(false); // To show a spinner on the save button
    const [error, setError] = useState('');
    const bottomOfList = useRef(null); // Used to auto-scroll to the bottom

    // This useEffect hook is the core of our real-time functionality.
    useEffect(() => {
        // Guard clause: If we don't have a userId yet, don't try to fetch data.
        if (!userId) {
            setIsLoading(false);
            return;
        }

        setError('');
        setIsLoading(true);

        // 1. Define the path to the user's journal entries in Firestore.
        // This creates a unique "folder" for each user's data.
        const collectionPath = `users/${userId}/journalEntries`;
        const collectionRef = collection(db, collectionPath);

        // 2. Create a query to get the documents, ordered by their creation time.
        // 'desc' means newest entries will be at the bottom of the list.
        const q = query(collectionRef, orderBy('createdAt', 'asc'));

        // 3. Set up the real-time listener with onSnapshot.
        // This function will be called immediately with the current data,
        // and then again every time the data changes in the database.
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const entriesData = [];
            querySnapshot.forEach((doc) => {
                // Combine the document ID with its data
                entriesData.push({ id: doc.id, ...doc.data() });
            });
            setEntries(entriesData);
            setIsLoading(false);
        }, (err) => {
            // Handle any errors during data fetching
            console.error("Error fetching journal entries:", err);
            setError("Could not load journal entries. Please try refreshing the page.");
            setIsLoading(false);
        });

        // 4. Cleanup function: This is crucial!
        // When the component unmounts (e.g., user logs out), we must detach the listener
        // to prevent memory leaks.
        return () => unsubscribe();

    }, [userId]); // The hook re-runs only if the userId changes.


    // This function handles saving a new journal entry
    const handleSaveEntry = async (e) => {
        e.preventDefault();
        // Prevent saving empty entries
        if (newEntry.trim() === '' || isSaving) {
            return;
        }

        setIsSaving(true);
        setError('');

        try {
            // Get the reference to the user's collection again
            const collectionPath = `users/${userId}/journalEntries`;
            const collectionRef = collection(db, collectionPath);

            // Use addDoc to create a new document in the collection.
            // Firestore will automatically generate a unique ID for it.
            await addDoc(collectionRef, {
                text: newEntry,
                createdAt: serverTimestamp() // Use the server's timestamp for accuracy
            });

            // Clear the textarea after successful save
            setNewEntry('');
        } catch (err) {
            console.error("Error saving entry:", err);
            setError("Failed to save your entry. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

     // Auto-scroll to the newest entry when the list updates
    useEffect(() => {
        bottomOfList.current?.scrollIntoView({ behavior: 'smooth' });
    }, [entries]);

    return (
        <div className="flex flex-col h-full bg-gray-800">
            {/* Journal Entries List */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                {isLoading && (
                    <div className="flex justify-center items-center h-full">
                        <Spinner />
                    </div>
                )}
                {!isLoading && entries.length === 0 && (
                    <div className="text-center text-gray-400">
                        <p>Your journal is empty.</p>
                        <p>Write your first entry below to begin your journey.</p>
                    </div>
                )}
                 {error && <p className="text-red-400 text-center">{error}</p>}
                {entries.map(entry => (
                    <JournalEntry key={entry.id} entry={entry} />
                ))}
                <div ref={bottomOfList} /> {/* Invisible element to scroll to */}
            </div>

            {/* New Entry Form */}
            <div className="p-4 border-t border-gray-700 bg-gray-800">
                <form onSubmit={handleSaveEntry}>
                    <textarea
                        value={newEntry}
                        onChange={(e) => setNewEntry(e.target.value)}
                        placeholder="What's on your mind?"
                        className="w-full h-24 bg-gray-700 text-white p-3 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                        disabled={isSaving}
                    />
                    <button
                        type="submit"
                        disabled={isSaving || newEntry.trim() === ''}
                        className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-md transition duration-300 flex justify-center items-center disabled:bg-purple-800 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Spinner /> : 'Save Entry'}
                    </button>
                </form>
            </div>
        </div>
    );
}

