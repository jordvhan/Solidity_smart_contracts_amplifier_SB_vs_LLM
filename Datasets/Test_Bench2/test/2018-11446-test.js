const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GRX Contract", function () {
  let GRX, grx, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const GRXFactory = await ethers.getContractFactory("GRX");
    grx = await GRXFactory.deploy();
  });

  it("Should deploy with correct initial values", async function () {
    expect(await grx.name()).to.equal("Gold Reward Token");
    expect(await grx.symbol()).to.equal("GRX");
    expect(await grx.decimals()).to.equal(18);
    expect(await grx.totalSupply()).to.equal(ethers.parseEther("20000000"));
    expect(await grx.balanceOf(owner.address)).to.equal(ethers.parseEther("20000000"));
  });

  it("Should allow owner to transfer ownership", async function () {
    await grx.transferOwnership(addr1.address);
    expect(await grx.owner()).to.equal(addr1.address);
  });

  it("Should allow token transfers", async function () {
    await grx.transfer(addr1.address, ethers.parseEther("100"));
    expect(await grx.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
    expect(await grx.balanceOf(owner.address)).to.equal(ethers.parseEther("19999900"));
  });

  it("Should prevent transfers from frozen accounts", async function () {
    await grx.freeze(owner.address, true);
    await expect(grx.transfer(addr1.address, ethers.parseEther("100"))).to.be.reverted;
  });

  it("Should allow admin to freeze and unfreeze accounts", async function () {
    await grx.makeAdmin(addr1.address, true);
    await grx.connect(owner).setAdmin(addr1.address, true);

    await grx.connect(addr1).freeze(addr2.address, true);
    expect(await grx.frozen(addr2.address)).to.equal(true);

    await grx.connect(addr1).freeze(addr2.address, false);
    expect(await grx.frozen(addr2.address)).to.equal(false);
  });

  it("Should allow rewards to be issued", async function () {
    await grx.reward(addr1.address, ethers.parseEther("50"), false, "Reward Test");
    expect(await grx.balanceOf(addr1.address)).to.equal(ethers.parseEther("50"));
  });

  it("Should allow burning tokens", async function () {
    await grx.burn(ethers.parseEther("100"));
    expect(await grx.totalSupply()).to.equal(ethers.parseEther("19999900"));
  });

  it("Should allow admin to set ICO state", async function () {
    await grx.setICO(false);
    expect(await grx.ico()).to.equal(false);
  });

  it("Should allow setting token prices", async function () {
    await grx.setPrices(700, 800);
    expect(await grx.sellPrice()).to.equal(700);
    expect(await grx.buyPrice()).to.equal(800);
  });

  it("Should allow approving and transferring tokens via allowance", async function () {
    await grx.approve(addr1.address, ethers.parseEther("100"));
    await grx.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("50"));
    expect(await grx.balanceOf(addr2.address)).to.equal(ethers.parseEther("50"));
  });

  it("Should allow admin to transfer and freeze accounts", async function () {
    await grx.transferAndFreeze(addr1.address, ethers.parseEther("100"));
    expect(await grx.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
    expect(await grx.frozen(addr1.address)).to.equal(true);
  });

  it("Should allow rewards to be transfered", async function () {
    await grx.reward(addr1.address, ethers.parseEther("50"), true, "Reward Test");
    await grx.connect(addr1).transferReward(owner.address, ethers.parseEther("50"));
    expect(await grx.balanceOf(owner.address)).to.equal(ethers.parseEther("20000000"));
  });

  it("Should allow burning tokens from another account", async function () {
    await grx.approve(addr1.address, ethers.parseEther("100"));
    await grx.connect(addr1).burnFrom(owner.address, ethers.parseEther("50"));
    expect(await grx.totalSupply()).to.equal(ethers.parseEther("19999950"));
  });

  it("Should allow increasing total supply", async function () {
    await grx.increaseTotalSupply(addr1.address, ethers.parseEther("100"));
    expect(await grx.totalSupply()).to.equal(ethers.parseEther("20000100"));
    expect(await grx.balanceOf(addr1.address)).to.equal(ethers.parseEther("100"));
  });

  it("Should allow setting users can unfreeze", async function () {
    await grx.usersCanUnFreeze(true);
    expect(await grx.usersCanUnfreeze()).to.equal(true);
  });

  it("Should allow setting users can trade", async function () {
    await grx.setUsersCanTrade(true);
    expect(await grx.usersCanTrade()).to.equal(true);
  });

  it("Should allow setting can trade", async function () {
    await grx.setCanTrade(addr1.address, true);
    expect(await grx.canTrade(addr1.address)).to.equal(true);
  });

  it("Should not allow transfer to the zero address", async function () {
    await expect(grx.transfer(ethers.ZeroAddress, ethers.parseEther("100"))).to.be.reverted;
  });

  it("Should not allow reward to the zero address", async function () {
    await expect(grx.reward(ethers.ZeroAddress, ethers.parseEther("50"), false, "Reward Test")).to.be.reverted;
  });

  it("Should not allow transferFrom more than allowance", async function () {
    await grx.approve(addr1.address, ethers.parseEther("100"));
    await expect(grx.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("150"))).to.be.reverted;
  });

  it("Should not allow burn more than balance", async function () {
    await expect(grx.burn(ethers.parseEther("20000001"))).to.be.reverted;
  });

  it("Should not allow burn from more than allowance", async function () {
    await grx.approve(addr1.address, ethers.parseEther("100"));
    await expect(grx.connect(addr1).burnFrom(owner.address, ethers.parseEther("150"))).to.be.reverted;
  });

  it("Should not allow burn from if balance is not enough", async function () {
    await grx.approve(addr1.address, ethers.parseEther("100"));
    await expect(grx.connect(addr1).burnFrom(owner.address, ethers.parseEther("20000001"))).to.be.reverted;
  });
});
