window.QuiverWallet = (function () {
  const CHAIN_ID = 4663;
  const CHAIN_HEX = "0x1237";
  const NETWORK = {
    chainId: CHAIN_HEX,
    chainName: "Robinhood Chain",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://rpc.mainnet.chain.robinhood.com"],
    blockExplorerUrls: ["https://robinhoodchain.blockscout.com"],
  };

  function provider() {
    return window.ethereum || null;
  }
  function short(addr) {
    if (!addr) return "";
    return addr.slice(0, 6) + "…" + addr.slice(-4);
  }
  async function ensureChain(eth) {
    const id = await eth.request({ method: "eth_chainId" });
    if (id === CHAIN_HEX || parseInt(id, 16) === CHAIN_ID) return true;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
      return true;
    } catch (err) {
      if (err && (err.code === 4902 || err.code === -32603)) {
        await eth.request({ method: "wallet_addEthereumChain", params: [NETWORK] });
        return true;
      }
      throw err;
    }
  }
  async function connect() {
    const eth = provider();
    if (!eth) {
      return { ok: false, demo: true, account: null, reason: "no_provider" };
    }
    try {
      await ensureChain(eth);
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      if (!accounts || !accounts[0]) {
        return { ok: false, demo: true, account: null, reason: "no_accounts" };
      }
      return { ok: true, demo: false, account: accounts[0] };
    } catch (e) {
      return { ok: false, demo: false, account: null, reason: e && e.message ? e.message : "rejected" };
    }
  }
  function disconnect() {
    return { ok: true, demo: true, account: null };
  }
  function onAccountsChanged(cb) {
    const eth = provider();
    if (!eth || !eth.on) return function () {};
    const handler = function (accounts) {
      cb(accounts && accounts[0] ? accounts[0] : null);
    };
    eth.on("accountsChanged", handler);
    return function () {
      if (eth.removeListener) eth.removeListener("accountsChanged", handler);
    };
  }
  function onChainChanged(cb) {
    const eth = provider();
    if (!eth || !eth.on) return function () {};
    const handler = function (chainId) {
      cb(chainId);
    };
    eth.on("chainChanged", handler);
    return function () {
      if (eth.removeListener) eth.removeListener("chainChanged", handler);
    };
  }
  return {
    CHAIN_ID,
    CHAIN_HEX,
    NETWORK,
    provider,
    short,
    ensureChain,
    connect,
    disconnect,
    onAccountsChanged,
    onChainChanged,
  };
})();
