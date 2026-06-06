import { Detector } from "@sonnetics/js";

const status = document.getElementById("status")!;
const btn = document.getElementById("btn") as HTMLButtonElement;

const detector = await Detector.create({
    modelId: "sonnetics-model-a770c126-a4ff-4be4-b95e-7e104a01da73",
});

status.textContent = `Ready — wake word: "${detector.phrase}"`;
btn.disabled = false;

detector.onDetect((event) => {
    status.textContent = `Detected "${event.phrase}"`;
    setTimeout(() => {
        status.textContent = "Listening...";
    }, 2000);
});

btn.addEventListener("click", async () => {
    if (btn.textContent === "Start") {
        await detector.start();
        btn.textContent = "Stop";
        status.textContent = "Listening...";
    } else {
        detector.stop();
        btn.textContent = "Start";
        status.textContent = "Stopped";
    }
});
