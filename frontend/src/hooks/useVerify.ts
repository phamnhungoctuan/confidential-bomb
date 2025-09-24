// hooks/useVerify.ts
import { useState } from "react";
import { ethers } from "ethers";
import { getRelayerInstance, buildEIP712, decryptBoard } from "../services/relayer";
import { verifyGame } from "../services/verify";
import { useAppKitProvider } from "@reown/appkit/react";
import type { Provider } from "@reown/appkit/react";

// Short address helper
function shortAddr(addr: string) {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

// Hook to verify the board decryption via Zama Relayer
export function useVerify(
  unpackBoard: (encoded: bigint, size: number) => number[]
) {
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyHtml, setVerifyHtml] = useState<string | null>(null);
  const [verifyStep, setVerifyStep] = useState<
    "" | "fetch" | "sign" | "decrypt" | "done"
  >("");

  const { walletProvider } = useAppKitProvider<Provider>("eip155");

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
      // 1) Fetch ciphertext + contract address directly from blockchain
      const { ciphertexts, contractAddress } = await verifyGame(gameId);
      if (!ciphertexts || ciphertexts.length === 0) {
        throw new Error("No ciphertext found for this game");
      }

      // 2) Init SDK & sign
      const instance = await getRelayerInstance();
      const keypair = instance.generateKeypair();
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "10";

      const eip712 = buildEIP712(
        instance,
        keypair.publicKey,
        [contractAddress],
        startTimeStamp,
        durationDays
      );

      setVerifyStep("sign");

      if (!walletProvider) throw new Error("No wallet provider found");

      const browserProvider = new ethers.BrowserProvider(walletProvider as any);
      const signer = await browserProvider.getSigner();
      const signerAddress = await signer.getAddress();

      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );

      // 3) Decrypt
      setVerifyStep("decrypt");

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

      // Assume board is packed into one ciphertext
      const raw = results[ciphertexts[0]];
      const decoded = typeof raw === "bigint" ? raw : BigInt(raw);
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
