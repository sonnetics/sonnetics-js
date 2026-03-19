import { Wakeword } from "@sonnetics/js";

const detector = await Wakeword.create({ modelId: "your-model-id" });
detector.onDetect(async (ev) => {
  console.log("Wake word detected!", ev.phrase);
  for await (const audio_after_wakeword of ev.audio.read(0.5)) {
    // process audio after wakeword (e.g. send to a speech-to-text service)
    // When utterance is complete, break
    break
  }
});

await detector.start();
await new Promise((r) => setTimeout(r, 60_000)); // listen for 60s
detector.stop();
