import { Detector } from "@sonnetics/js";

// Detector can be created with a public model ID, a presigned/private URL, or a local .tar.gz file path (Node only).
const detector = await Detector.create({
    modelId: "sonnetics-model-efea8354-3f81-4c61-9d50-7452cb901620",
});

// Assume you have audio from somewhere
const chunks: Float32Array[] = [];

// Feed the audio chunks to the detector
for (const chunk of chunks) {
    const phrase = detector.feed(chunk, 16000, 1);
    if (phrase) console.log("Wake word detected!", phrase);
}
