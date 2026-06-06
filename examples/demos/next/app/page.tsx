"use client";

import dynamic from "next/dynamic";

const WakeWordButton = dynamic(
    () => import("./wake-word-button"),
    { ssr: false, loading: () => <p>Loading...</p> },
);

export default function Home() {
    return (
        <main
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                background: "#f5f5f5",
                fontFamily: "system-ui, sans-serif",
            }}
        >
            <div
                style={{
                    background: "white",
                    borderRadius: 12,
                    padding: "2rem 2.5rem",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                    textAlign: "center",
                    maxWidth: 400,
                    width: "100%",
                }}
            >
                <h1 style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>
                    Sonnetics Wake Word
                </h1>
                <WakeWordButton />
            </div>
        </main>
    );
}
