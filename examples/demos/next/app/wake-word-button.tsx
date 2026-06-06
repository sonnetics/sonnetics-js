"use client";

import { useEffect, useRef, useState } from "react";
import { Detector } from "@sonnetics/js";
import type { WakeWordDetector } from "@sonnetics/js";

type UiState = "idle" | "loading" | "listening" | "detected";

export default function WakeWordButton() {
    const [state, setState] = useState<UiState>("idle");
    const [phrase, setPhrase] = useState("");
    const detectorRef = useRef<WakeWordDetector | null>(null);

    useEffect(() => {
        Detector.create({
            modelId: "sonnetics-model-a770c126-a4ff-4be4-b95e-7e104a01da73",
        }).then((d) => {
            detectorRef.current = d;
            setPhrase(d.phrase);
            d.onDetect(() => {
                d.stop();
                setState("detected");
            });
            setState("idle");
        });
        return () => {
            detectorRef.current?.stop();
        };
    }, []);

    const toggle = async () => {
        const d = detectorRef.current;
        if (!d) return;

        if (state === "idle") {
            setState("loading");
            try {
                await d.start();
                setState("listening");
            } catch {
                setState("idle");
            }
        } else {
            d.stop();
            setState("idle");
        }
    };

    const labels: Record<UiState, string> = {
        idle: phrase
            ? 'Listening for "' + phrase + '" - click to start'
            : "Loading...",
        loading: "Loading model...",
        listening: "Listening...",
        detected: "Wake word detected!",
    };

    return (
        <div>
            <p style={{ marginBottom: "1rem", color: "#333" }}>
                {labels[state]}
            </p>
            <button
                onClick={toggle}
                disabled={state === "loading" || !phrase}
                style={{
                    fontSize: "1rem",
                    padding: "0.6rem 2rem",
                    border: "none",
                    borderRadius: 8,
                    background: "#2563eb",
                    color: "white",
                    cursor: state === "loading" ? "wait" : "pointer",
                    opacity: state === "loading" || !phrase ? 0.5 : 1,
                }}
            >
                {state === "idle"
                    ? "Start"
                    : state === "loading"
                      ? "Loading..."
                      : "Stop"}
            </button>
        </div>
    );
}
