import { Detector } from "@sonnetics/js";

const detector = await Detector.create({
    modelId: "sonnetics-model-a770c126-a4ff-4be4-b95e-7e104a01da73",
});

detector.onDetect(() => {
    detector.stop();
    setStatus("Wake word detected!");
    setListening(false);
});

// --- UI ---

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

setStatus('Listening for "' + detector.phrase + '" - click Start');
setListening(false);

btnEl.addEventListener("click", async () => {
    if (listening) {
        detector.stop();
        setStatus("Stopped");
        setListening(false);
        return;
    }

    btnEl.disabled = true;
    setStatus("Requesting microphone...");
    try {
        await detector.start();
        setStatus("Listening...");
        setListening(true);
    } catch (err) {
        setStatus("Mic error: " + err);
        btnEl.disabled = false;
    }
});
