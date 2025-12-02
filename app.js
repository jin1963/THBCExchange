let provider, signer, userAddress;
let usdt, thbc, exchange;

window.onload = init;

async function init() {
  if (!window.ethereum) {
    alert("กรุณาติดตั้ง MetaMask หรือใช้ Bitget Wallet / Binance Wallet");
    return;
  }

  provider = new ethers.providers.Web3Provider(window.ethereum, "any");

  document.getElementById("btnConnect").onclick = connectWallet;
  document.getElementById("btnApprove").onclick = approveUnlimited;
  document.getElementById("btnBuy").onclick = buyTHBC;
  document.getElementById("btnCopy").onclick = () => {
    const v = document.getElementById("refLink").value || "";
    navigator.clipboard.writeText(v);
  };

  document.getElementById("usdtAmount").oninput = calcReceive;

  loadContracts();
}

function loadContracts() {
  usdt = new ethers.Contract(
    CONFIG.usdtAddress,
    CONFIG.usdtABI,
    provider
  );

  thbc = new ethers.Contract(
    CONFIG.thbcAddress,
    CONFIG.thbcABI,
    provider
  );

  exchange = new ethers.Contract(
    CONFIG.exchangeAddress,
    CONFIG.exchangeABI,
    provider
  );
}

async function connectWallet() {
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();
  userAddress = await signer.getAddress();

  document.getElementById("btnConnect").innerText =
    userAddress.slice(0, 6) + "..." + userAddress.slice(-4);

  // gen referral link
  const refUrl = `${location.origin}${location.pathname}?ref=${userAddress}`;
  document.getElementById("refLink").value = refUrl;

  // เช็กว่า chain ถูกมั้ย (BNB mainnet = 56)
  try {
    const net = await provider.getNetwork();
    if (net.chainId !== 56) {
      alert("โปรดสลับไปที่ BNB Smart Chain (mainnet, chainId = 56)");
    }
  } catch (e) {
    console.log("getNetwork error", e);
  }

  await checkAllowance();
}

async function checkAllowance() {
  // อันนี้แค่ไว้เปลี่ยนปุ่มเป็น Approved ✓ ถ้าอ่านไม่ได้ก็ไม่ต้องขึ้น error
  try {
    if (!userAddress) return;
    const allowance = await usdt.allowance(userAddress, CONFIG.exchangeAddress);
    if (allowance.gt(0)) {
      document.getElementById("btnApprove").innerText = "Approved ✓";
    }
  } catch (e) {
    console.log("allowance view failed (ไม่เป็นไร)", e);
  }
}

function calcReceive() {
  const v = parseFloat(document.getElementById("usdtAmount").value || "0");
  const thbc = v * CONFIG.rate;
  document.getElementById("thbcReceive").innerText = thbc.toFixed(2);
}

async function approveUnlimited() {
  try {
    if (!signer) return alert("Connect wallet first.");

    const usdtWithSigner = usdt.connect(signer);
    const tx = await usdtWithSigner.approve(
      CONFIG.exchangeAddress,
      ethers.constants.MaxUint256
    );

    setMsg("Approving USDT...");
    await tx.wait();

    document.getElementById("btnApprove").innerText = "Approved ✓";
    setMsg("Unlimited USDT approval successful.");
  } catch (e) {
    setMsg(cleanError(e));
  }
}

async function buyTHBC() {
  try {
    if (!signer) return alert("Connect wallet first.");

    const amtStr = document.getElementById("usdtAmount").value.trim();
    if (!amtStr || Number(amtStr) <= 0) {
      return alert("Please enter USDT amount.");
    }

    const usdtAmount = ethers.utils.parseUnits(amtStr, 18);

    // เอา ref จาก URL ถ้าไม่มีให้ใช้ address(0)
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref") || ethers.constants.AddressZero;

    const exWithSigner = exchange.connect(signer);
    // ไม่เช็ก allowance อีกแล้ว → ส่ง TX ตรง ๆ
    const tx = await exWithSigner.buyTHBCWithUSDT(usdtAmount, ref);

    setMsg("Buying THBC...");
    await tx.wait();
    setMsg("Buy THBC success!");
  } catch (e) {
    setMsg(cleanError(e));
  }
}

function setMsg(t) {
  document.getElementById("txMessage").innerText = t || "";
}

function cleanError(e) {
  console.log("ERROR:", e);
  if (!e) return "Unknown error";

  // ถ้าเป็น RPC error แบบธรรมดา
  if (e.data && e.data.message) return e.data.message;
  if (e.error && e.error.message) return e.error.message;
  if (e.message) return e.message;
  return String(e);
}
