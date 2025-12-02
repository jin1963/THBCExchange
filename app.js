// app.js - ethers.js version

let injected;
let provider;
let signer;
let currentAccount = null;

let usdtContract;
let exchangeContract;

const zeroAddress = "0x0000000000000000000000000000000000000000";

function $(id) {
  return document.getElementById(id);
}

function getInjectedProvider() {
  if (window.ethereum) return window.ethereum;
  if (window.bitkeep && window.bitkeep.ethereum) return window.bitkeep.ethereum;
  if (window.bitget && window.bitget.ethereum) return window.bitget.ethereum;
  return null;
}

/* ============================ INIT ============================ */

async function init() {
  injected = getInjectedProvider();
  if (!injected) {
    console.warn("No injected wallet found");
  }

  const amtInput = $("usdtAmount");
  if (amtInput) amtInput.addEventListener("input", updatePreviewTHBC);

  if ($("btnConnect")) $("btnConnect").onclick = connectWallet;
  if ($("btnApprove")) $("btnApprove").onclick = onApproveUSDT;
  if ($("btnBuy")) $("btnBuy").onclick = onBuyTHBC;
  if ($("btnCopy")) $("btnCopy").onclick = onCopyRef;

  // preview เริ่มต้น
  updatePreviewTHBC();
  updateReferralLinkUI();
}

/* ======================= CONNECT WALLET ======================= */

async function connectWallet() {
  try {
    if (!injected) {
      injected = getInjectedProvider();
      if (!injected) {
        alert("ไม่พบ Wallet (MetaMask / Bitget) ในเบราว์เซอร์");
        return;
      }
    }

    provider = new ethers.providers.Web3Provider(injected, "any");

    const accounts = await injected.request({
      method: "eth_requestAccounts"
    });
    if (!accounts || !accounts.length) {
      alert("ไม่พบบัญชีใน Wallet");
      return;
    }
    currentAccount = accounts[0];

    const network = await provider.getNetwork();
    if (network.chainId !== 56) {
      alert("กรุณาเลือก BNB Smart Chain (chainId 56) ใน Wallet ก่อน");
      // ให้ผู้ใช้เปลี่ยนเองแล้วค่อยกดใหม่
    }

    signer = provider.getSigner();

    const cfg = window.THBC_CONFIG;
    usdtContract = new ethers.Contract(cfg.usdt.address, cfg.usdt.abi, signer);
    exchangeContract = new ethers.Contract(
      cfg.exchange.address,
      cfg.exchange.abi,
      signer
    );

    // ปรับปุ่ม Connect ให้โชว์ address สั้น ๆ
    if ($("btnConnect")) {
      const short =
        currentAccount.slice(0, 6) +
        "..." +
        currentAccount.slice(currentAccount.length - 4);
      $("btnConnect").textContent = short;
    }

    // เผื่อมี ref link
    updateReferralLinkUI();

    // subscribe event เปลี่ยน chain/account
    if (injected && injected.on) {
      injected.on("accountsChanged", () => window.location.reload());
      injected.on("chainChanged", () => window.location.reload());
    }
  } catch (err) {
    console.error("connectWallet error:", err);
    alert("เชื่อมต่อกระเป๋าไม่สำเร็จ: " + (err.message || err));
  }
}

/* ======================= PREVIEW THBC ========================= */

function updatePreviewTHBC() {
  const amountStr = $("usdtAmount")?.value || "0";
  const num = parseFloat(amountStr) || 0;
  const rate = window.THBC_CONFIG
    ? window.THBC_CONFIG.uiRateThbcPerUsdt
    : 35;
  const thbc = num * rate;
  if ($("thbcReceive")) {
    $("thbcReceive").textContent = thbc.toFixed(2);
  }
}

/* ========================= APPROVE USDT ======================= */

async function onApproveUSDT() {
  const msgEl = $("txMessage");
  if (msgEl) msgEl.textContent = "";

  try {
    if (!signer || !currentAccount) {
      await connectWallet();
      if (!signer) return;
    }

    const cfg = window.THBC_CONFIG;

    if (!usdtContract) {
      usdtContract = new ethers.Contract(
        cfg.usdt.address,
        cfg.usdt.abi,
        signer
      );
    }

    if (msgEl) msgEl.textContent = "Sending approve transaction...";

    const max = ethers.constants.MaxUint256;

    const tx = await usdtContract.approve(cfg.exchange.address, max);
    await tx.wait();

    if (msgEl) msgEl.textContent = "Unlimited USDT approval successful.";
    if ($("btnApprove")) $("btnApprove").textContent = "Approved ✓";
  } catch (err) {
    console.error("Approve error:", err);
    if ($("txMessage")) {
      $("txMessage").textContent =
        "Approve failed: " +
        (err.data?.message || err.error?.message || err.message || err);
    }
  }
}

/* =========================== BUY THBC ========================= */

function getReferrerFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref && ethers.utils.isAddress(ref)) return ref;
  return zeroAddress;
}

async function onBuyTHBC() {
  const msgEl = $("txMessage");
  if (msgEl) msgEl.textContent = "";

  try:
    if (!signer || !currentAccount) {
      await connectWallet();
      if (!signer) return;
    }

    const amountStr = $("usdtAmount").value.trim();
    if (!amountStr || Number(amountStr) <= 0) {
      alert("กรุณาใส่จำนวน USDT ที่ต้องการใช้ซื้อ");
      return;
    }

    const usdtAmount = ethers.utils.parseUnits(amountStr, 18); // USDT BSC = 18

    const referrer = getReferrerFromUrl();
    const cfg = window.THBC_CONFIG;

    if (!exchangeContract) {
      exchangeContract = new ethers.Contract(
        cfg.exchange.address,
        cfg.exchange.abi,
        signer
      );
    }

    if (msgEl) msgEl.textContent = "Sending buy transaction...";

    const tx = await exchangeContract.buyTHBCWithUSDT(
      usdtAmount,
      referrer
    );
    await tx.wait();

    if (msgEl) msgEl.textContent = "Buy THBC success!";
  } catch (err) {
    console.error("Buy error:", err);
    if ($("txMessage")) {
      $("txMessage").textContent =
        "Buy failed: " +
        (err.data?.message ||
          err.error?.message ||
          err.reason ||
          err.message ||
          err);
    }
  }
}

/* ========================= REFERRAL LINK ====================== */

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

/* ============================ START =========================== */

window.addEventListener("load", init);
