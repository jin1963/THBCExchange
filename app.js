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
    navigator.clipboard.writeText(
      document.getElementById("refLink").value || ""
    );
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

  await checkAllowance();
}

async function checkAllowance() {
  if (!userAddress) return;
  const allowance = await usdt.allowance(userAddress, CONFIG.exchangeAddress);
  if (allowance.gt(0)) {
    document.getElementById("btnApprove").innerText = "Approved ✓";
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

    // check allowance ก่อนกัน Bitget งอแง
    const allowance = await usdt.allowance(userAddress, CONFIG.exchangeAddress);
    if (allowance.lt(usdtAmount)) {
      return alert("กรุณากด Approve USDT ก่อน (หรือจำนวน USDT เกิน limit ที่อนุมัติไว้)");
    }

    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref") || ethers.constants.AddressZero;

    const exWithSigner = exchange.connect(signer);
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
  if (!e) return "Unknown error";
  if (e.data && e.data.message) return e.data.message;
  if (e.error && e.error.message) return e.error.message;
  if (e.message) return e.message;
  return String(e);
}
