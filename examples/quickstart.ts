import { Detector } from "@sonnetics/js";

const detector = await Detector.create({
    modelId: "sonnetics-model-efea8354-3f81-4c61-9d50-7452cb901620",
});

detector.onDetect(() => {
    console.log("wake word detected");
});

await detector.start();
