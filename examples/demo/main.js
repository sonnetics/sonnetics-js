import { Detector } from "@sonnetics/js";

// ─── Sonnetics ────────────────────────────────────────────────────────────────

const detector = await Detector.create({
    modelId: "sonnetics-model-efea8354-3f81-4c61-9d50-7452cb901620",
});

detector.onDetect(() => {
    detector.stop();
    setStatus("🎉 Wake word detected!");
    setListening(false);
});

// ─── UI ───────────────────────────────────────────────────────────────────────

const statusEl = document.getElementById("status");
const btnEl = document.getElementById("btn");
let listening = false;

function setStatus(text) {
    statusEl.textContent = text;
}
function setListening(on) {
    listening = on;
    btnEl.textContent = on ? "Stop" : "Start";
    btnEl.disabled = false;
}

setStatus("Ready — click Start to listen");

btnEl.addEventListener("click", async () => {
    if (listening) {
        detector.stop();
        setStatus("Stopped");
        setListening(false);
        return;
    }

    btnEl.disabled = true;
    setStatus("Requesting microphone…");
    try {
        await detector.start();
        setStatus("Listening…");
        setListening(true);
    } catch (err) {
        setStatus(`Mic error: ${err}`);
        btnEl.disabled = false;
    }
});
