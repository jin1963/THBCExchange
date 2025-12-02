// app.js
// ต้องมี <script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.min.js"></script> ใน index.html

let provider;
let signer;
let currentAccount;

let usdtContract;
let thbcContract;
let exchangeContract;

const zeroAddress = "0x0000000000000000000000000000000000000000";

function $(id) {
  return document.getElementById(id);
}

/* ======================== INIT / WALLET ======================== */

async function init() {
  if (!window.ethereum) {
    alert("ไม่พบ Wallet (MetaMask / Bitget) ในเบราว์เซอร์");
    return;
  }

  // provider จาก wallet โดยตรง
  provider = new ethers.providers.Web3Provider(window.ethereum, "any");

  // auto update ถ้า user เปลี่ยน account / chain
  window.ethereum.on("accountsChanged", () => {
    window.location.reload();
  });
  window.ethereum.on("chainChanged", () => {
    window.location.reload();
  });

  // bind ปุ่ม
  const connectBtn = $("btnConnect");
  if (connectBtn) connectBtn.onclick = connectWallet;

  const approveBtn = $("btnApprove");
  if (approveBtn) approveBtn.onclick = onApproveUSDT;

  const buyBtn = $("btnBuy");
  if (buyBtn) buyBtn.onclick = onBuyTHBC;

  // แสดงเรท 1 USDT = 35 THBC
  const rateBox = $("rateText");
  if (rateBox) {
    rateBox.textContent = `1 USDT = ${window.THBC_CONFIG.uiRateThbcPerUsdt} THBC`;
  }

  // ถ้ามี query ?ref= ให้แสดงใน referral link ของเรา
  updateReferralLinkUI();
}

async function connectWallet() {
  try {
    if (!provider) {
      provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    }

    // ขอสิทธิ์เชื่อมต่อ
    await provider.send("eth_requestAccounts", []);

    // เช็ค chain
    const network = await provider.getNetwork();
    if (network.chainId !== 56) {
      alert("กรุณาเปลี่ยน Network เป็น BNB Smart Chain (chainId 56)");
      return;
    }

    signer = provider.getSigner();
    currentAccount = await signer.getAddress();

    // สร้าง contract instance
    const cfg = window.THBC_CONFIG;
    usdtContract = new ethers.Contract(cfg.usdt.address, cfg.usdt.abi, signer);
    thbcContract = new ethers.Contract(cfg.thbc.address, cfg.thbc.abi, signer);
    exchangeContract = new ethers.Contract(
      cfg.exchange.address,
      cfg.exchange.abi,
      signer
    );

    // update UI
    if ($("connectStatus")) $("connectStatus").textContent = "Connected";
    if ($("walletAddress"))
      $("walletAddress").textContent =
        currentAccount.slice(0, 6) +
        "..." +
        currentAccount.slice(currentAccount.length - 4);

    await refreshBalances();
  } catch (err) {
    console.error(err);
    alert("เชื่อมต่อกระเป๋าไม่สำเร็จ: " + (err.message || err));
  }
}

async function refreshBalances() {
  if (!signer || !currentAccount) return;

  try {
    const [usdtBal, thbcBal] = await Promise.all([
      usdtContract.balanceOf(currentAccount),
      thbcContract.balanceOf(currentAccount)
    ]);

    if ($("usdtBalance"))
      $("usdtBalance").textContent = ethers.utils.formatUnits(usdtBal, 18);
    if ($("thbcBalance"))
      $("thbcBalance").textContent = ethers.utils.formatUnits(thbcBal, 18);
  } catch (err) {
    console.error("refreshBalances error:", err);
  }
}

/* ======================== APPROVE USDT ======================== */

async function onApproveUSDT() {
  try {
    if (!signer || !currentAccount) {
      await connectWallet();
      if (!signer) return;
    }

    $("status").textContent = "Sending approve tx...";

    const max = ethers.constants.MaxUint256;
    const tx = await usdtContract.approve(
      window.THBC_CONFIG.exchange.address,
      max
    );
    await tx.wait();

    $("status").textContent = "Unlimited USDT approval successful.";
    if ($("btnApprove")) $("btnApprove").textContent = "Approved ✓";
  } catch (err) {
    console.error(err);
    $("status").textContent =
      "Approve failed: " + (err.data?.message || err.message || err);
  }
}

/* ======================== BUY THBC ======================== */

function getReferrerFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref && ethers.utils.isAddress(ref)) {
    return ref;
  }
  return zeroAddress;
}

async function onBuyTHBC() {
  try {
    if (!signer || !currentAccount) {
      await connectWallet();
      if (!signer) return;
    }

    const amountStr = $("usdtInput").value.trim();
    if (!amountStr || Number(amountStr) <= 0) {
      alert("กรุณาใส่จำนวน USDT ที่ต้องการใช้ซื้อ");
      return;
    }

    const usdtAmount = ethers.utils.parseUnits(amountStr, 18); // USDT BSC = 18 decimals

    $("status").textContent = "Sending buy tx...";

    const referrer = getReferrerFromUrl();

    const tx = await exchangeContract.buyTHBCWithUSDT(
      usdtAmount,
      referrer
    );
    await tx.wait();

    $("status").textContent = "Buy THBC success!";
    await refreshBalances();
  } catch (err) {
    console.error(err);
    // แสดง error ให้เห็นชัด ๆ
    $("status").textContent =
      "Buy failed: " +
      (err.data?.message ||
        err.error?.message ||
        err.reason ||
        err.message ||
        err);
  }
}

/* ======================== REFERRAL UI ======================== */

function updateReferralLinkUI() {
  try {
    const base = window.location.origin + window.location.pathname;
    const link =
      base +
      (currentAccount
        ? `?ref=${currentAccount}`
        : ""); // ตอนแรกยังไม่ได้ต่อ ก็ยังไม่มี ref

    if ($("refLinkInput")) $("refLinkInput").value = link;
  } catch (err) {
    console.error(err);
  }
}

/* ======================== WINDOW ======================== */

window.addEventListener("load", init);
