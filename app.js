let provider, signer, userAddress;
let usdt, thbc, exchange;

window.onload = init;

async function init() {
    provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    document.getElementById("btnConnect").onclick = connectWallet;
    document.getElementById("btnApprove").onclick = approveUnlimited;
    document.getElementById("btnBuy").onclick = buyTHBC;
    document.getElementById("btnCopy").onclick = () => {
        navigator.clipboard.writeText(document.getElementById("refLink").value);
    };

    const amountInput = document.getElementById("usdtAmount");
    amountInput.oninput = calcReceive;

    loadContracts();
}

function loadContracts() {
    usdt = new ethers.Contract(
        CONFIG.usdt,
        [
            "function approve(address,uint256) external returns(bool)",
            "function allowance(address,address) view returns(uint256)",
        ],
        provider
    );

    thbc = new ethers.Contract(CONFIG.thbc, ["function balanceOf(address) view returns(uint256)"], provider);

    exchange = new ethers.Contract(
        CONFIG.exchange,
        ["function buyTHBCWithUSDT(uint256,address) external"],
        provider
    );
}

async function connectWallet() {
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    document.getElementById("btnConnect").innerText =
        userAddress.slice(0, 6) + "..." + userAddress.slice(-4);

    const refUrl = `${location.origin}?ref=${userAddress}`;
    document.getElementById("refLink").value = refUrl;

    checkAllowance();
}

async function checkAllowance() {
    if (!userAddress) return;
    const allowance = await usdt.allowance(userAddress, CONFIG.exchange);
    if (allowance.gt(0)) {
        document.getElementById("btnApprove").innerText = "Approved ✓";
    }
}

function calcReceive() {
    const amt = parseFloat(document.getElementById("usdtAmount").value || 0);
    document.getElementById("thbcReceive").innerText = (amt * CONFIG.rate).toFixed(2);
}

async function approveUnlimited() {
    try {
        const usdtWithSigner = usdt.connect(signer);
        const tx = await usdtWithSigner.approve(
            CONFIG.exchange,
            ethers.constants.MaxUint256
        );

        document.getElementById("txMessage").innerText = "Approving...";
        await tx.wait();

        document.getElementById("btnApprove").innerText = "Approved ✓";
        document.getElementById("txMessage").innerText = "Unlimited USDT approval successful.";
    } catch (err) {
        document.getElementById("txMessage").innerText = err.message;
    }
}

async function buyTHBC() {
    try {
        if (!userAddress) return alert("Connect wallet first.");

        const amt = document.getElementById("usdtAmount").value;
        if (!amt || amt <= 0) return alert("Enter amount.");

        const ref = new URLSearchParams(window.location.search).get("ref") || ethers.constants.AddressZero;

        const ex = exchange.connect(signer);
        const tx = await ex.buyTHBCWithUSDT(
            ethers.utils.parseUnits(amt, 18),
            ref
        );

        document.getElementById("txMessage").innerText = "Buying...";
        await tx.wait();

        document.getElementById("txMessage").innerText = "Success!";
    } catch (err) {
        document.getElementById("txMessage").innerText = err.message;
    }
}
