"use client";

import { useEffect, useRef, useState } from "react";
import { Detector } from "@sonnetics/js";
import type { WakeWordDetector } from "@sonnetics/js";

type UiState = "loading" | "idle" | "starting" | "listening" | "detected";

export default function WakeWordButton() {
    const [state, setState] = useState<UiState>("loading");
    const [phrase, setPhrase] = useState("");
    const [error, setError] = useState<string | null>(null);
    const detectorRef = useRef<WakeWordDetector | null>(null);

    useEffect(() => {
        Detector.create({
            modelId: "sonnetics-model-a770c126-a4ff-4be4-b95e-7e104a01da73",
        })
            .then((d) => {
                detectorRef.current = d;
                setPhrase(d.phrase);
                d.onDetect(() => {
                    d.stop();
                    setState("detected");
                });
                setState("idle");
            })
            .catch((err: unknown) => {
                console.error("Detector init failed:", err);
                setError(
                    err instanceof Error ? err.message : "Failed to load model",
                );
            });
        return () => {
            detectorRef.current?.stop();
        };
    }, []);

    const toggle = async () => {
        const d = detectorRef.current;
        if (!d) return;

        if (state === "idle" || state === "detected") {
            setState("starting");
            try {
                await d.start();
                setState("listening");
            } catch (err: unknown) {
                console.error("Failed to start mic:", err);
                setState("idle");
            }
        } else {
            d.stop();
            setState("idle");
        }
    };

    if (error) {
        return <p style={{ color: "#dc2626" }}>Error: {error}</p>;
    }

    const labels: Record<UiState, string> = {
        loading: "Loading model...",
        idle: phrase ? `Ready — say "${phrase}"` : "Ready",
        starting: "Starting mic...",
        listening: "Listening...",
        detected: `Detected "${phrase}" — click to try again`,
    };

    return (
        <div>
            <p style={{ marginBottom: "1rem", color: "#333" }}>
                {labels[state]}
            </p>
            <button
                onClick={toggle}
                disabled={state === "loading" || state === "starting"}
                style={{
                    fontSize: "1rem",
                    padding: "0.6rem 2rem",
                    border: "none",
                    borderRadius: 8,
                    background: "#2563eb",
                    color: "white",
                    cursor:
                        state === "loading" || state === "starting"
                            ? "wait"
                            : "pointer",
                    opacity:
                        state === "loading" || state === "starting" ? 0.5 : 1,
                }}
            >
                {state === "listening" ? "Stop" : "Start"}
            </button>
        </div>
    );
}
