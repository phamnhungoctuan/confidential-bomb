/* eslint-disable no-undef */

// importScripts() loads the FHEVM SDK script from the server.
importScripts("/fhevm-worker.js");

// Global variable to keep the FHEVM instance
let fhevm = null;

// Listen for messages coming from the main thread
self.onmessage = async (e) => {
  // Destructure data sent from the main thread
  const { board, contractAddress, userAddress, sdkConfig } = e.data;

  try {
    // 🔍 Try to detect the SDK global object attached by fhevm-worker.js
    // Different SDK versions may expose different names → check in order
    const PossibleSDK =
      self.RelayerSDK ||
      self.relayerSDK ||
      self.fhevm ||
      self.FHE ||
      self.Zama ||
      null;

    if (!PossibleSDK) {
      throw new Error("FHE SDK global not found");
    }

    // If we don’t have an initialized instance yet, create one
    if (!fhevm) {
      let instanceCreator = null;

      // Case 1: SDK is exposed as a class/function
      if (typeof PossibleSDK === "function") {
        const maybeNeedsInit = new PossibleSDK();

        // Some SDKs require calling initSDK() before using them
        if (typeof maybeNeedsInit.initSDK === "function") {
          await maybeNeedsInit.initSDK();
        }

        instanceCreator = maybeNeedsInit;
      } else {
        // Case 2: SDK is exposed as a ready-to-use global object
        instanceCreator = PossibleSDK;

        if (typeof instanceCreator.initSDK === "function") {
          await instanceCreator.initSDK();
        }
      }

      // If no createInstance method exists, throw an error
      if (
        !instanceCreator ||
        typeof instanceCreator.createInstance !== "function"
      ) {
        throw new Error("createInstance() not found in SDK");
      }

      // Create a real FHEVM instance with the chain configuration
      fhevm = await instanceCreator.createInstance(sdkConfig);
    }

    // Create a buffer to hold encrypted inputs (encryptedInput)
    const buf = fhevm.createEncryptedInput(contractAddress, userAddress);

    // Add values (the board array) to the buffer
    console.time("⏱ add32");
    board.forEach((v) => buf.add32(BigInt(v))); // use BigInt for safety
    console.timeEnd("⏱ add32");

    // Encrypt the entire buffer
    console.time("⏱ buf.encrypt()");
    const result = await buf.encrypt();
    console.timeEnd("⏱ buf.encrypt()");

    // Send encrypted results back to the main thread
    self.postMessage({
      encryptedTiles: result.handles, // Array of ciphertexts (externalEuint32[])
      inputProof: result.inputProof, // Proof bundle for all inputs
    });
  } catch (err) {
    // If something fails, log it and send the error back
    console.error("Worker encrypt error:", err);
    self.postMessage({ error: err?.message || String(err) });
  }
};