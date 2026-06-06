import { Detector } from "@sonnetics/js";

// Detector can be created with a public model ID, a presigned/private URL, or a local .tar.gz file path (Node only).
const detector = await Detector.create({
    modelId: "sonnetics-model-efea8354-3f81-4c61-9d50-7452cb901620",
});
detector.onDetect(async (ev) => {
    console.log("Wake word detected!", ev.phrase);
    for await (const audio_after_wakeword of ev.audio.read(0.5)) {
        // process audio after wakeword (e.g. send to speech-to-text)
        break;
    }
});

document.getElementById("start-btn")!.addEventListener("click", async () => {
    await detector.start();
    await new Promise((r) => setTimeout(r, 60_000)); // listen for 60s
    detector.stop();
});
