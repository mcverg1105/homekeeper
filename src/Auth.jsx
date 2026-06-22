import { useState } from "react";
import { supabase } from "./supabase";

export default function Auth() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    async function handleSubmit() {
        setLoading(true);
        setError("");
        setMessage("");

        const trimmedEmail = email.trim();
        if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            setError("Please enter a valid email address.");
            setLoading(false);
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            setLoading(false);
            return;
        }

        if (mode === "signup") {
            const { error } = await supabase.auth.signUp({ email: trimmedEmail, password });
            if (error) setError(error.message);
            else setMessage("Check your email for a confirmation link.");
        } else {
            const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
            if (error) setError(error.message);
        }

        setLoading(false);
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#F7F4EF",
                fontFamily: "Inter, system-ui, sans-serif",
            }}
        >
            <div
                style={{
                    background: "#FFFFFF",
                    border: "1px solid #E4DFD3",
                    borderRadius: 16,
                    padding: "40px 36px",
                    width: "100%",
                    maxWidth: 400,
                }}
            >
                <h1
                    style={{
                        fontFamily: "'Source Serif 4', serif",
                        fontSize: 28,
                        fontWeight: 600,
                        margin: "0 0 6px",
                    }}
                >
                    HomeKeeper
                </h1>
                <p style={{ fontSize: 14, color: "#888780", margin: "0 0 28px" }}>
                    {mode === "signin" ? "Sign in to your account" : "Create a new account"}
                </p>

                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                    Email
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1px solid #E4DFD3",
                        fontSize: 14,
                        marginBottom: 14,
                        boxSizing: "border-box",
                    }}
                />

                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 6 }}>
                    Password
                </label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 8,
                        border: "1px solid #E4DFD3",
                        fontSize: 14,
                        marginBottom: 20,
                        boxSizing: "border-box",
                    }}
                />

                {error && (
                    <p style={{ fontSize: 13, color: "#A32D2D", marginBottom: 14 }}>{error}</p>
                )}
                {message && (
                    <p style={{ fontSize: 13, color: "#2F4A3E", marginBottom: 14 }}>{message}</p>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                        width: "100%",
                        padding: "11px",
                        borderRadius: 8,
                        border: "none",
                        background: "#2F4A3E",
                        color: "#FFFFFF",
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: loading ? "not-allowed" : "pointer",
                        marginBottom: 16,
                    }}
                >
                    {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
                </button>

                <button
                    onClick={() => {
                        setMode(mode === "signin" ? "signup" : "signin");
                        setError("");
                        setMessage("");
                    }}
                    style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: 8,
                        border: "1px solid #E4DFD3",
                        background: "none",
                        fontSize: 13,
                        color: "#5F5E5A",
                        cursor: "pointer",
                    }}
                >
                    {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
            </div>
        </div>
    );
}