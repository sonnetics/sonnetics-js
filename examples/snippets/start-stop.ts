import { Detector } from "@sonnetics/js";

// Detector can be created with a public model ID, a presigned/private URL, or a local .tar.gz file path (Node only).
const detector = await Detector.create({
    modelId: "sonnetics-model-a770c126-a4ff-4be4-b95e-7e104a01da73",
});
detector.onDetect(() => console.log("Wake word detected!"));

// Call start() on button click — a user gesture is required for mic access
document.getElementById("start-btn")!.addEventListener("click", async () => {
    await detector.start();
});

// detector.stop(); when done
