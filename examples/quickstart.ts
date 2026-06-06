import { Detector } from "@sonnetics/js";

const detector = await Detector.create({
    modelId: "sonnetics-model-a770c126-a4ff-4be4-b95e-7e104a01da73",
});

detector.onDetect(() => {
    console.log("wake word detected");
});

await detector.start();
