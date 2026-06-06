import { Detector } from "@sonnetics/js";

// Detector can be created with a public model ID, a presigned/private URL, or a local .tar.gz file path (Node only).
const detector = await Detector.create({
    modelId: "sonnetics-model-a770c126-a4ff-4be4-b95e-7e104a01da73",
});

// Assume you have audio from somewhere
const chunks: Float32Array[] = [];

// Feed the audio chunks to the detector
for (const chunk of chunks) {
    const phrase = detector.feed(chunk, 16000, 1);
    if (phrase) console.log("Wake word detected!", phrase);
}
