"use client";

import { createWalletClient, custom } from "viem";
import { polygon } from "viem/chains";
import { useEffect, useState } from "react";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { Web3Auth, Web3AuthOptions } from "@web3auth/modal";

type SwapQuote = {
  swap: {
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
  };
};

const BRZ_POLYGON = "0x4eD141110F6EeeAbA9A1df36d8c26f684d2475Dc";
const USDC_POLYGON = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";

const FACTORY_ADDRESS = "0xE77f2C7D79B2743d39Ad73DC47a8e9C6416aD3f3";

const clientId =
  "BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ";

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0xaa36a7",
  rpcTarget: "https://rpc.ankr.com/eth_sepolia",
  ticker: "ETH",
  tickerName: "Ethereum",
  logo: "https://cryptologos.cc/logos/ethereum-eth-logo.png",
};

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

const web3AuthOptions: Web3AuthOptions = {
  clientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
  privateKeyProvider,
};

const web3auth = new Web3Auth(web3AuthOptions);

const baseUrl = "https://api.notuslabs.xyz/api/v1";
const apikey = "<api-key>";

export default function ConnectWalletWeb3Auth() {
  const [account, setAccount] = useState<any | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [accountAbstraction, setAccountAbstraction] = useState("");
  const [externallyOwnedAccount, setExternallyOwnedAccount] = useState("");

  const [quote, setQuote] = useState<SwapQuote | undefined>();
  const [txHash, setTxHash] = useState("");

  const getSmartWalletAddress = async () => {
    const res = await fetch(
      `${baseUrl}/wallets/address?externallyOwnedAccount=${externallyOwnedAccount}&factory=${FACTORY_ADDRESS}&salt=${0}`,
      {
        method: "GET",
        headers: {
          "x-api-key": apikey,
        },
      }
    );

    if (!res.ok) return;

    const data = await res.json();
    setAccountAbstraction(data.wallet.accountAbstraction);
  };

  const getSwapQuote = async () => {
    const swapParams = {
      payGasFeeToken: USDC_POLYGON,
      tokenIn: USDC_POLYGON,
      tokenOut: BRZ_POLYGON,
      amountIn: "0.8",
      walletAddress: accountAbstraction,
      signerAddress: externallyOwnedAccount,
      chain: "POLYGON",
      swapProvider: "PARASWAP",
      gasFeePaymentMethod: "DEDUCT_FROM_AMOUNT",
    };
    const res = await fetch(`${baseUrl}/crypto/swap`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apikey,
      },
      body: JSON.stringify(swapParams),
    });

    if (!res.ok) return;

    const data = (await res.json()) as SwapQuote;

    console.log({ data });

    setQuote(data);
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

    console.log(signature);

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

  const login = async () => {
    const web3authProvider = await web3auth.connect();
    if (!web3authProvider) {
      return;
    }
    const account = createWalletClient({
      chain: polygon,
      transport: custom(web3authProvider),
    });
    const [address] = await account.getAddresses();

    setExternallyOwnedAccount(address);

    setAccount(account);
    if (web3auth.connected) {
      setLoggedIn(true);
    }
  };

  const logout = async () => {
    await web3auth.logout();
    setAccount(null);
    setLoggedIn(false);
  };

  useEffect(() => {
    const init = async () => {
      try {
        await web3auth.initModal();
        if (!web3auth.provider) {
          return;
        }
        const account = createWalletClient({
          chain: polygon,
          transport: custom(web3auth.provider),
        });

        const [address] = await account.getAddresses();

        setExternallyOwnedAccount(address);

        setAccount(account);

        if (web3auth.connected) {
          setLoggedIn(true);
        }
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, []);

  const unloggedInView = (
    <button onClick={login} className="card">
      Login
    </button>
  );

  const loggedInView = (
    <>
      <div className="flex flex-col gap-2 items-center">
        {externallyOwnedAccount && (
          <div>{`Signer: ${externallyOwnedAccount}`}</div>
        )}

        {accountAbstraction && (
          <div>{`Account Abstraction: ${accountAbstraction}`}</div>
        )}
        {!accountAbstraction && (
          <div>
            <button
              onClick={() => getSmartWalletAddress()}
              className="shadow-sm border border-gray-300 bg-white py-2 px-4 text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
            >
              Get SmartWallet Address
            </button>
          </div>
        )}
        <div>
          <button
            onClick={() => getSwapQuote()}
            className="shadow-sm border border-gray-300 bg-white py-2 px-4 text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
          >
            Quote Swap
          </button>
        </div>

        {quote && (
          <div>
            <button
              onClick={() => signingAndExecute()}
              className="shadow-sm border border-gray-300 bg-white py-2 px-4 text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
            >
              Sign Message
            </button>
          </div>
        )}

        <div>
          <button
            onClick={logout}
            className="shadow-sm border border-gray-300 bg-white py-2 px-4 text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md"
          >
            Log Out
          </button>
        </div>

        {quote && (
          <div>
            <h3>Swap Quote: </h3>
            <ul className="list-disc pl-6">
              <li>Quote Id: {quote.swap.quoteId}</li>
              <li>Token in: {quote.swap.tokenIn}</li>
              <li>Token out: {quote.swap.tokenOut}</li>
              <li>Amount in: {quote.swap.amountIn}</li>
              <li>Min amount out: {quote.swap.minAmountOut}</li>
            </ul>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="container flex flex-col items-center gap-2">
      <h1 className="title">
        <a
          target="_blank"
          href="https://web3auth.io/docs/sdk/pnp/web/modal"
          rel="noreferrer"
        >
          Web3Auth{" "}
        </a>
        & NextJS Quick Start
      </h1>

      <div className="grid">{loggedIn ? loggedInView : unloggedInView}</div>
      <div id="console" style={{ whiteSpace: "pre-line" }}>
        <p style={{ whiteSpace: "pre-line" }}></p>
      </div>
    </div>
  );
}
