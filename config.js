// config.js

const CONFIG = {
  chainId: 56, // BNB Smart Chain mainnet
  rpcUrl: "https://bsc-dataseed.binance.org/",

  // ---- addresses ----
  usdtAddress: "0x55d398326f99059fF775485246999027B3197955",
  thbcAddress: "0xe8d4687b77B5611eF1828FDa7428034FA12a1Beb",
  exchangeAddress: "0xe584224ec67a1e6CC52B83023fc5336b12664a3d",

  // ใช้โชว์เรทบนหน้าเว็บ
  rate: 35,

  // ---- ABIs ----
  usdtABI: [
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ],

  thbcABI: [
    "function balanceOf(address) view returns (uint256)"
  ],

  // Exchange ABI (ย่อเฉพาะฟังก์ชันที่เราใช้)
  exchangeABI: [
    "function buyTHBCWithUSDT(uint256 usdtAmount, address referrer) external",
    "function thbcPerUsdt() view returns (uint256)",
    "function usdtTreasury() view returns (address)",
    "function getReferralRates() view returns (uint256,uint256,uint256)",
    "function getReferrers(address user) view returns (address,address,address)",
    "function users(address) view returns (address referrer, uint256 totalVolumeUSDT, uint256 totalCommissionUSDT)"
  ]
};
