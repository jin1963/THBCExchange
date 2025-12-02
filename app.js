// app.js - เวอร์ชัน Web3.js เหมือนโครง KJC / CAT

let web3;
let ethProvider;
let currentAccount = null;

let usdtContract;
let exchangeContract;

const zeroAddress = "0x0000000000000000000000000000000000000000";

function $(id) {
  return document.getElementById(id);
}

/* =============== หา provider (MetaMask / Bitget / Bitkeep) =============== */

function getEthereumProvider() {
  if (window.ethereum) return window.ethereum;
  if (window.bitkeep && window.bitkeep.ethereum) return window.bitkeep.ethereum;
  if (window.bitget && window.bitget.ethereum) return window.bitget.ethereum;
  return null;
}

/* ============================ INIT ============================ */

async function init() {
  ethProvider = getEthereumProvider();
  if (!ethProvider) {
    alert("ไม่พบ Wallet (MetaMask / Bitget / Bitkeep) ในเบราว์เซอร์");
    return;
  }

  web3 = new Web3(ethProvider);

  // event เปลี่ยน account / chain
  ethProvider.on("accountsChanged", () => window.location.reload());
  ethProvider.on("chainChanged", () => window.location.reload());

  if ($("btnConnect")) $("btnConnect").onclick = connectWallet;
  if ($("btnApprove")) $("btnApprove").onclick = onApproveUSDT;
  if ($("btnBuy")) $("btnBuy").onclick = onBuyTHBC;
  if ($("btnCopy")) $("btnCopy").onclick = onCopyRef;

  const amountInput = $("usdtAmount");
  if (amountInput) {
    amountInput.addEventListener("input", updatePreviewTHBC);
  }

  // set rate text จาก config
  const rateBox = $("rateText");
  if (rateBox && window.THBC_CONFIG) {
    rateBox.textContent = `1 USDT = ${window.THBC_CONFIG.uiRateThbcPerUsdt} THBC`;
  }

  updateReferralLinkUI();
}

/* ======================== CONNECT WALLET ======================== */

async function connectWallet() {
  try {
    if (!ethProvider) {
      ethProvider = getEthereumProvider();
      if (!ethProvider) {
        alert("ไม่พบ Wallet ในเบราว์เซอร์");
        return;
      }
      web3 = new Web3(ethProvider);
    }

    // ขอสิทธิ์เชื่อมต่อ acc
    const accounts = await ethProvider.request({
      method: "eth_requestAccounts"
    });
    if (!accounts || !accounts.length) {
      alert("ไม่พบบัญชีใน Wallet");
      return;
    }
    currentAccount = accounts[0];

    // เช็ค chain ให้เป็น BSC (0x38)
    const chainId = await ethProvider.request({ method: "eth_chainId" });
    if (chainId !== "0x38") {
      alert("กรุณาเปลี่ยน Network เป็น BNB Smart Chain (chainId 56)");
      // ไม่ return เพื่อให้ผู้ใช้เปลี่ยนเองแล้วกด connect ใหม่
    }

    const cfg = window.THBC_CONFIG;

    usdtContract = new web3.eth.Contract(cfg.usdt.abi, cfg.usdt.address);
    exchangeContract = new web3.eth.Contract(
      cfg.exchange.abi,
      cfg.exchange.address
    );

    if ($("btnConnect")) {
      const short =
        currentAccount.slice(0, 6) +
        "..." +
        currentAccount.slice(currentAccount.length - 4);
      $("btnConnect").textContent = short;
    }

    updateReferralLinkUI();
  } catch (err) {
    console.error(err);
    alert("เชื่อมต่อกระเป๋าไม่สำเร็จ: " + (err.message || err));
  }
}

/* ======================== PREVIEW THBC ======================== */

function updatePreviewTHBC() {
  const amountStr = $("usdtAmount").value.trim();
  const num = parseFloat(amountStr || "0");
  const rate = window.THBC_CONFIG
    ? window.THBC_CONFIG.uiRateThbcPerUsdt
    : 35;
  const thbc = num * rate;
  $("thbcReceive").textContent = isNaN(thbc) ? "0" : thbc.toFixed(2);
}

/* ========================= APPROVE USDT ======================== */

async function onApproveUSDT() {
  const msgEl = $("txMessage");
  msgEl.textContent = "";

  try {
    if (!currentAccount) {
      await connectWallet();
      if (!currentAccount) return;
    }

    if (!usdtContract) {
      const cfg = window.THBC_CONFIG;
      usdtContract = new web3.eth.Contract(cfg.usdt.abi, cfg.usdt.address);
    }

    msgEl.textContent = "Sending approve transaction...";

    // MaxUint256 แบบง่าย ๆ
    const maxUint256 =
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

    const cfg = window.THBC_CONFIG;

    await usdtContract.methods
      .approve(cfg.exchange.address, maxUint256)
      .send({ from: currentAccount });

    msgEl.textContent = "Unlimited USDT approval successful.";
    if ($("btnApprove")) $("btnApprove").textContent = "Approved ✓";
  } catch (err) {
    console.error("Approve error:", err);
    msgEl.textContent =
      "Approve failed: " + (err?.message || JSON.stringify(err));
  }
}

/* =========================== BUY THBC ========================== */

function getReferrerFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref && web3.utils.isAddress(ref)) return ref;
  return zeroAddress;
}

async function onBuyTHBC() {
  const msgEl = $("txMessage");
  msgEl.textContent = "";

  try {
    if (!currentAccount) {
      await connectWallet();
      if (!currentAccount) return;
    }

    const amountStr = $("usdtAmount").value.trim();
    if (!amountStr || Number(amountStr) <= 0) {
      alert("กรุณาใส่จำนวน USDT ที่ต้องการใช้ซื้อ");
      return;
    }

    // USDT BSC 18 decimals -> ใช้ toWei("x", "ether")
    const usdtAmount = web3.utils.toWei(amountStr, "ether");
    const referrer = getReferrerFromUrl();

    if (!exchangeContract) {
      const cfg = window.THBC_CONFIG;
      exchangeContract = new web3.eth.Contract(
        cfg.exchange.abi,
        cfg.exchange.address
      );
    }

    msgEl.textContent = "Sending buy transaction...";

    await exchangeContract.methods
      .buyTHBCWithUSDT(usdtAmount, referrer)
      .send({ from: currentAccount });

    msgEl.textContent = "Buy THBC success!";
  } catch (err) {
    console.error("Buy error:", err);
    msgEl.textContent =
      "Buy failed: " + (err?.message || JSON.stringify(err));
  }
}

/* ========================= REFERRAL LINK ======================= */

function updateReferralLinkUI() {
  const base = window.location.origin + window.location.pathname;
  const link = currentAccount ? `${base}?ref=${currentAccount}` : base;
  if ($("refLink")) $("refLink").value = link;
}

function onCopyRef() {
  const input = $("refLink");
  if (!input) return;
  input.select();
  document.execCommand("copy");
  alert("Copied referral link");
}

/* ============================ START ============================ */

window.addEventListener("load", init);
