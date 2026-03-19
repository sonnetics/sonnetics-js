import { Wakeword } from "@sonnetics/js";

const detector = await Wakeword.create({ modelId: "your-model-id" });
detector.onDetect(() => console.log("Wake word detected!"));

await detector.start();
// detector.stop(); // call when you want to stop listening

