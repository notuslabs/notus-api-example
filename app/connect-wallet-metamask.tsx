"use client";

import { createWalletClient, custom } from "viem";
import { polygon } from "viem/chains";
import { useState } from "react";

type SwapQuote = {
  quotes: {
    quoteId?: string;
    expiresAt: number;
    amountIn: string;
    chainIdIn: number;
    chainIdOut: number;
    estimatedFees: {
      maxGasFeeToken: string;
      maxGasFeeNative: string;
    };
    minAmountOut: string;
    tokenIn: string;
    tokenOut: string;
    walletAddress: string;
    chain: string;
  }[];
};

const apikey = "<api-key>";

const BRZ_POLYGON = "0x4eD141110F6EeeAbA9A1df36d8c26f684d2475Dc";
const USDC_POLYGON = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";

const FACTORY_ADDRESS = "0xE77f2C7D79B2743d39Ad73DC47a8e9C6416aD3f3";

const baseUrl = "https://api.notuslabs.xyz/api/v1";

export default function ConnectWalletMetamask() {
  const [externallyOwnedAccount, setExternallyOwnedAccount] = useState("");
  const [accountAbstraction, setAccountAbstraction] = useState("");
  const [quote, setQuote] = useState<SwapQuote | undefined>();
  const [txHash, setTxHash] = useState("");

  const account = createWalletClient({
    chain: polygon,
    transport: custom(window.ethereum!),
  });

  const getSmartWalletAddress = async () => {
    let res = await fetch(`${baseUrl}/wallets/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apikey,
      },
      body: JSON.stringify({
        externallyOwnedAccount: externallyOwnedAccount,
        factory: FACTORY_ADDRESS,
        salt: "0",
      }),
    });
    if (!res?.ok) {
      res = await fetch(
        `${baseUrl}/wallets/address?externallyOwnedAccount=${externallyOwnedAccount}&factory=${FACTORY_ADDRESS}&salt=${0}`,
        {
          method: "GET",
          headers: {
            "x-api-key": apikey,
          },
        }
      );
    }

    const data = await res.json();
    setAccountAbstraction(data.wallet.accountAbstraction);
  };

  const getSwapQuote = async () => {
    const swapParams = {
      payGasFeeToken: USDC_POLYGON,
      tokenIn: USDC_POLYGON,
      tokenOut: BRZ_POLYGON,
      amountIn: "5",
      walletAddress: accountAbstraction,
      toAddress: accountAbstraction,
      signerAddress: externallyOwnedAccount,
      chainIdIn: polygon.id,
      chainIdOut: polygon.id,
      gasFeePaymentMethod: "DEDUCT_FROM_AMOUNT",
    };
    const res = await fetch(`${baseUrl}/crypto/swap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apikey,
      },
      body: JSON.stringify(swapParams),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) return;

    const data = (await res.json()) as SwapQuote;

    console.log({ data });

    setQuote(data);
  };

  const requestAddress = async () => {
    const [externallyOwnedAccount] = await account.requestAddresses();
    if (externallyOwnedAccount) {
      setExternallyOwnedAccount(externallyOwnedAccount);
    }
  };

  const signingAndExecute = async () => {
    if (!quote?.swap.quoteId) return;
    const quoteId = quote.swap.quoteId as `0x${string}`;

    const signature = await account.signMessage({
      account: externallyOwnedAccount as `0x${string}`,
      message: {
        raw: quoteId,
      },
    });

    const res = await fetch(`${baseUrl}/crypto/execute-user-op`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apikey,
      },
      body: JSON.stringify({
        quoteId,
        signature,
      }),
    });

    if (!res.ok) return;

    const data = await res.json();

    setTxHash(data.userOpHash);
  };

  if (externallyOwnedAccount) {
    return (
      <div className="flex flex-col items-center gap-4 justify-center w-screen h-screen">
        {externallyOwnedAccount && (
          <div>{`Signer: ${externallyOwnedAccount}`}</div>
        )}

        {accountAbstraction && (
          <div>{`Account Abstraction: ${accountAbstraction}`}</div>
        )}

        {!accountAbstraction && (
          <button
            onClick={() => getSmartWalletAddress()}
            className="shadow-sm border border-gray-300 bg-white py-2 px-4 text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
          >
            Get SmartWallet
          </button>
        )}

        {quote && (
          <div>
            <h3>Swap Quote: </h3>
            <ul className="list-disc pl-6">
              <li>Quote Id: {quote.quotes[0].quoteId ?? ""}</li>
              <li>Token in: {quote.quotes[0].tokenIn}</li>
              <li>Token out: {quote.quotes[0].tokenOut}</li>
              <li>Amount in: {quote.quotes[0].amountIn}</li>
              <li>Min amount out: {quote.quotes[0].minAmountOut}</li>
            </ul>
          </div>
        )}

        {txHash && <h3>User Op Hash: {txHash}</h3>}

        {accountAbstraction && (
          <button
            onClick={() => getSwapQuote()}
            className="shadow-sm border border-gray-300 bg-white py-2 px-4 text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
          >
            Swap Quote
          </button>
        )}

        {quote && (
          <button
            onClick={() => {
              signingAndExecute();
            }}
            className="shadow-sm border border-gray-300 bg-white py-2 px-4 text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
          >
            Signing user operation and execute
          </button>
        )}

        <button
          onClick={() => {
            setExternallyOwnedAccount("");
            setAccountAbstraction("");
            setQuote(undefined);
          }}
          className="shadow-sm border border-gray-300 bg-white py-2 px-4 text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-screen h-screen">
      <button
        className="shadow-sm border border-gray-300 bg-white py-2 px-4 text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
        onClick={async () => {
          await requestAddress();
        }}
      >
        Metamask
      </button>
    </div>
  );
}
