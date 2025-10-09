import React, { useState } from 'react';
import JournalScreen from './JournalScreen.jsx';
// We will create InsightsScreen and ChatScreen later

// --- Icon Components ---
const BookOpenIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> );
const SparklesIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L10 12l-2 2-2.293-2.293a1 1 0 010-1.414L10 6l-2-2-2.293-2.293a1 1 0 010-1.414L10 2l2 2 2.293 2.293a1 1 0 010 1.414L14 12l2 2 2.293 2.293a1 1 0 010 1.414L14 22l-2-2-2.293-2.293a1 1 0 010-1.414L14 12l-2-2-2.293-2.293a1 1 0 010-1.414L12 2l2-2z" /></svg> );
const SignOutIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );

export default function MainApp({ user, handleSignOut }) {
    const [activeTab, setActiveTab] = useState('journal');

    return (
        <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
            <nav className="flex flex-col justify-between w-20 md:w-64 bg-white border-r border-slate-200 p-4">
                <div className="space-y-2">
                    <button onClick={() => setActiveTab('journal')} title="Journal" className={`w-full flex items-center space-x-4 p-3 rounded-lg transition-colors duration-200 ${activeTab === 'journal' ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
                        <BookOpenIcon />
                        <span className="hidden md:block font-semibold">Journal</span>
                    </button>
                    {/* We will add Chat and Insights buttons here later */}
                </div>
                <button onClick={handleSignOut} title="Sign Out" className="w-full flex items-center space-x-4 p-3 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors duration-200">
                    <SignOutIcon />
                    <span className="hidden md:block font-semibold">Sign Out</span>
                </button>
            </nav>
            <main className="flex-1 overflow-y-auto">
                {activeTab === 'journal' && <JournalScreen userId={user.uid} />}
            </main>
        </div>
    );
}