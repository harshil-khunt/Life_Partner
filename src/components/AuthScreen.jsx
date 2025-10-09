import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase.js'; // Import our auth object
import Spinner from './Spinner.jsx';

export default function AuthScreen() {
    const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');
        const [isLogin, setIsLogin] = useState(true); // Toggles between Login and Sign Up mode
        const [error, setError] = useState('');
        const [loading, setLoading] = useState(false);

        const handleSubmit = async (e) => {
            e.preventDefault(); // Prevent form from reloading the page
            setError('');
            setLoading(true);

            // Basic validation
            if (!email || !password) {
                setError("Please enter both email and password.");
                setLoading(false);
                return;
            }

            try {
                if (isLogin) {
                    // Firebase function to sign in an existing user
                    await signInWithEmailAndPassword(auth, email, password);
                } else {
                    // Firebase function to create a new user
                    await createUserWithEmailAndPassword(auth, email, password);
                }
                // The onAuthStateChanged listener in App.jsx will automatically handle the redirect
            } catch (err) {
                // Display a user-friendly error message
                setError(err.message.replace('Firebase: ', ''));
            } finally {
                setLoading(false);
            }
        };

        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center p-4">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold">AI Life Partner</h1>
                        <p className="text-gray-400 mt-2">Your personal journal for self-discovery.</p>
                    </div>
                    <div className="bg-gray-800 p-8 rounded-lg shadow-2xl">
                        <h2 className="text-2xl font-bold text-center mb-6">{isLogin ? 'Log In' : 'Sign Up'}</h2>
                        {error && <p className="bg-red-500/20 text-red-300 p-3 rounded-md mb-4 text-center">{error}</p>}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                required
                                className="w-full bg-gray-700 text-white px-4 py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                                minLength="6"
                                className="w-full bg-gray-700 text-white px-4 py-3 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-md transition duration-300 flex justify-center items-center disabled:bg-purple-800"
                            >
                                {loading ? <Spinner /> : (isLogin ? 'Log In' : 'Create Account')}
                            </button>
                        </form>
                        <button
                            onClick={() => { setIsLogin(!isLogin); setError(''); }}
                            className="w-full text-center mt-6 text-purple-400 hover:text-purple-300"
                        >
                            {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Log In'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }


