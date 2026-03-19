import { Wakeword } from "@sonnetics/js";

const detector = await Wakeword.create({ modelId: "your-model-id" });

// Assume you have audio from somewhere
const chunks: Float32Array[] = [];

// Feed the audio chunks to the detector
for (const chunk of chunks) {
  const phrase = detector.feed(chunk, 16000, 1);
  if (phrase) console.log("Wake word detected!", phrase);
}
