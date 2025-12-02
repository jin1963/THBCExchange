// app.js

let provider;
let signer;
let currentAccount;

let usdtContract;
let exchangeContract;

const zeroAddress = "0x0000000000000000000000000000000000000000";

function $(id) {
  return document.getElementById(id);
}

/* ======================== INIT ======================== */

async function init() {
  if (!window.ethereum) {
    alert("ไม่พบ Wallet (MetaMask / Bitget) ในเบราว์เซอร์");
    return;
  }

  provider = new ethers.providers.Web3Provider(window.ethereum, "any");

  window.ethereum.on("accountsChanged", () => window.location.reload());
  window.ethereum.on("chainChanged", () => window.location.reload());

  if ($("btnConnect")) $("btnConnect").onclick = connectWallet;
  if ($("btnApprove")) $("btnApprove").onclick = onApproveUSDT;
  if ($("btnBuy")) $("btnBuy").onclick = onBuyTHBC;
  if ($("btnCopy")) $("btnCopy").onclick = onCopyRef;

  // อัปเดตเรทในกล่อง
  const rateBox = $("rateText");
  if (rateBox) {
    rateBox.textContent = `1 USDT = ${window.THBC_CONFIG.uiRateThbcPerUsdt} THBC`;
  }

  // คำนวณ THBC ที่จะได้รับตาม input
  const amountInput = $("usdtAmount");
  if (amountInput) {
    amountInput.addEventListener("input", updatePreviewTHBC);
  }

  updateReferralLinkUI(); // ยังไม่ได้ connect ก็จะเป็นลิงก์เปล่า ๆ ก่อน
}

/* ======================== CONNECT WALLET ======================== */

async function connectWallet() {
  try {
    if (!provider) {
      provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    }

    await provider.send("eth_requestAccounts", []);

    const network = await provider.getNetwork();
    if (network.chainId !== 56) {
      alert("กรุณาเปลี่ยน Network เป็น BNB Smart Chain (chainId 56)");
      return;
    }

    signer = provider.getSigner();
    currentAccount = await signer.getAddress();

    const cfg = window.THBC_CONFIG;
    usdtContract = new ethers.Contract(cfg.usdt.address, cfg.usdt.abi, signer);
    exchangeContract = new ethers.Contract(
      cfg.exchange.address,
      cfg.exchange.abi,
      signer
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
  const rate = window.THBC_CONFIG.uiRateThbcPerUsdt;
  const thbc = num * rate;
  $("thbcReceive").textContent = thbc.toFixed(2);
}

/* ======================== APPROVE USDT ======================== */

async function onApproveUSDT() {
  const msg = $("txMessage");
  try {
    if (!signer || !currentAccount) {
      await connectWallet();
      if (!signer) return;
    }

    msg.textContent = "Sending approve tx...";

    const max = ethers.constants.MaxUint256;
    const tx = await usdtContract.approve(
      window.THBC_CONFIG.exchange.address,
      max
    );
    await tx.wait();

    msg.textContent = "Unlimited USDT approval successful.";
    if ($("btnApprove")) $("btnApprove").textContent = "Approved ✓";
  } catch (err) {
    console.error(err);
    msg.textContent =
      "Approve failed: " + (err.data?.message || err.message || err);
  }
}

/* ======================== BUY THBC ======================== */

function getReferrerFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref && ethers.utils.isAddress(ref)) return ref;
  return zeroAddress;
}

async function onBuyTHBC() {
  const msg = $("txMessage");
  try {
    if (!signer || !currentAccount) {
      await connectWallet();
      if (!signer) return;
    }

    const amountStr = $("usdtAmount").value.trim();
    if (!amountStr || Number(amountStr) <= 0) {
      alert("กรุณาใส่จำนวน USDT ที่ต้องการใช้ซื้อ");
      return;
    }

    const usdtAmount = ethers.utils.parseUnits(amountStr, 18); // USDT บน BSC 18 decimals
    const referrer = getReferrerFromUrl();

    msg.textContent = "Sending buy tx...";

    const tx = await exchangeContract.buyTHBCWithUSDT(usdtAmount, referrer);
    await tx.wait();

    msg.textContent = "Buy THBC success!";
  } catch (err) {
    console.error(err);
    msg.textContent =
      "Buy failed: " +
      (err.data?.message ||
        err.error?.message ||
        err.reason ||
        err.message ||
        err);
  }
}

/* ======================== REFERRAL LINK ======================== */

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

/* ======================== START ======================== */

window.addEventListener("load", init);
