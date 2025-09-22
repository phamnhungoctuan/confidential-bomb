/* eslint-disable no-undef */

importScripts("/fhevm-worker.js");

let fhevm = null;

self.onmessage = async (e) => {
  const { packedValue, contractAddress, userAddress, sdkConfig } = e.data;

  try {
    // Detect SDK global object
    const PossibleSDK =
      self.RelayerSDK ||
      self.relayerSDK ||
      self.fhevm ||
      self.FHE ||
      self.Zama ||
      null;

    if (!PossibleSDK) {
      throw new Error("FHE SDK global not found in worker");
    }

    // Init instance 
    if (!fhevm) {
      let instanceCreator = null;
      if (typeof PossibleSDK === "function") {
        const maybeNeedsInit = new PossibleSDK();
        if (typeof maybeNeedsInit.initSDK === "function") {
          await maybeNeedsInit.initSDK();
        }
        instanceCreator = maybeNeedsInit;
      } else {
        instanceCreator = PossibleSDK;
        if (typeof instanceCreator.initSDK === "function") {
          await instanceCreator.initSDK();
        }
      }

      if (
        !instanceCreator ||
        typeof instanceCreator.createInstance !== "function"
      ) {
        throw new Error("createInstance() not found in SDK");
      }

      fhevm = await instanceCreator.createInstance(sdkConfig);
    }

    // Create encrypted buffer
    const buf = fhevm.createEncryptedInput(contractAddress, userAddress);

    console.time("⏱ add64");
    buf.add64(BigInt(packedValue));
    console.timeEnd("⏱ add64");

    console.time("⏱ buf.encrypt()");
    const result = await buf.encrypt();
    console.timeEnd("⏱ buf.encrypt()");

    self.postMessage({
      encryptedBoard: result.handles[0],
      inputProof: result.inputProof,
    });
  } catch (err) {
    console.error("Worker encrypt error:", err);
    self.postMessage({ error: err?.message || String(err) });
  }
};