import { Wakeword } from "@sonnetics/js";

// Detector can be created with a public model ID, a presigned/private URL, or a local .tar.gz file path (Node only).
const detector = await Wakeword.create({ modelId: "sonnetics-model-efea8354-3f81-4c61-9d50-7452cb901620" });
detector.onDetect(() => console.log("Wake word detected!"));

// Call start() on button click — a user gesture is required for mic access
document.getElementById("start-btn")!.addEventListener("click", async () => {
  await detector.start();
});

// detector.stop(); when done
