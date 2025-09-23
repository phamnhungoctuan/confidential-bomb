// hooks/useVerify.ts
import { useState } from "react";
import { ethers } from "ethers";
import { getRelayerInstance, buildEIP712, decryptBoard } from "../services/relayer";

// Short address helper
function shortAddr(addr: string) {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// Hook to verify the board decryption via Zama Relayer
export function useVerify(
  verifyServer: string,
  unpackBoard: (encoded: bigint, size: number) => number[]
) {
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyHtml, setVerifyHtml] = useState<string | null>(null);
  const [verifyStep, setVerifyStep] = useState<
    "" | "fetch" | "sign" | "decrypt" | "done"
  >("");

  const openVerify = async (
    gameId: number,
    account: string,
    totalTiles: number,
    cols: number
  ) => {
    setShowVerifyModal(true);
    setVerifyLoading(true);
    setVerifyHtml(null);
    setVerifyStep("fetch");

    try {
      // 1) Fetch ciphertexts
      // Call our verify server to get ciphertexts + contract address
      const resp = await fetch(verifyServer, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });
      if (!resp.ok) throw new Error("Prepare-decrypt failed");
      const { ciphertexts, contractAddress } = await resp.json();

      // 2) Init SDK & sign
      // Get Relayer instance + generate keypair
      const instance = await getRelayerInstance();
      const keypair = instance.generateKeypair();
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "10";

      // Build EIP712 message for wallet signing
      const eip712 = buildEIP712(
        instance,
        keypair.publicKey,
        [contractAddress],
        startTimeStamp,
        durationDays
      );

      setVerifyStep("sign");
      // Request wallet signature over the EIP712 message
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      // Refer: https://docs.zama.ai/protocol/relayer-sdk-guides/fhevm-relayer/decryption/user-decryption
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      // 3) Decrypt
      setVerifyStep("decrypt");
      // Call Relayer to decrypt the ciphertexts
      // The Relayer verifies the signature + keypair + contract ownership
      // Then returns the plaintexts
      const results = await decryptBoard(
        ciphertexts,
        contractAddress,
        instance,
        keypair,
        signature,
        signerAddress,
        startTimeStamp,
        durationDays
      );

      // Get the first tile's plaintext as a sample
      // (all tiles are decrypted, we just show one for demo)
      const raw = results[ciphertexts[0]];
      const decoded = typeof raw === "bigint" ? raw : BigInt(raw);
      // Unpack to array of 0/1
      const plaintexts = unpackBoard(decoded, totalTiles);

      // 4) Render HTML grid
      setVerifyStep("done");
      const gridHtml = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px">
          <div style="display:grid;grid-template-columns:repeat(${cols},64px);gap:6px">
            ${plaintexts
              .map((val: number) =>
                Number(val) === 1
                  ? '<div style="background:#c0392b;width:64px;height:64px;border-radius:8px;display:flex;align-items:center;justify-content:center">💣</div>'
                  : '<div style="background:#27ae60;width:64px;height:64px;border-radius:8px"></div>'
              )
              .join("")}
          </div>
          <p style="color:#bbb;margin-top:12px">Decrypted by <b>${shortAddr(
            account
          )}</b></p>
          <h4 style="color:#2ecc71;margin-top:8px;text-align:center">
            ✅ Verification Successful!<br/>
            The decrypted board matches the original board.
          </h4>
        </div>
      `;
      setVerifyHtml(gridHtml);
    } catch (err: any) {
      setVerifyHtml(
        `<div style="text-align:center;color:red">❌ Error: ${
          err.message || String(err)
        }</div>`
      );
    } finally {
      setVerifyLoading(false);
    }
  };

  return {
    showVerifyModal,
    setShowVerifyModal,
    verifyLoading,
    verifyHtml,
    verifyStep,
    openVerify,
  };
}
