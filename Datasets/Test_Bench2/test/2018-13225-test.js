const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MyYLCToken", function () {
  let MyYLCToken, myYLCToken, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const initialSupply = ethers.parseEther("1000");
    MyYLCToken = await ethers.getContractFactory("MyYLCToken");
    myYLCToken = await MyYLCToken.deploy(initialSupply, "MyToken", 18, "MTK");
  });

  it("Should deploy with correct initial supply", async function () {
    const totalSupply = await myYLCToken.totalSupply();
    expect(totalSupply).to.equal(ethers.parseEther("1000"));
    const ownerBalance = await myYLCToken.balanceOf(owner.address);
    expect(ownerBalance).to.equal(ethers.parseEther("1000"));
  });

  it("Should transfer tokens between accounts", async function () {
    await myYLCToken.transfer(addr1.address, ethers.parseEther("100"));
    const addr1Balance = await myYLCToken.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(ethers.parseEther("100"));
  });

  it("Should not allow transfer if sender has insufficient balance", async function () {
    await expect(
      myYLCToken.connect(addr1).transfer(addr2.address, ethers.parseEther("1"))
    ).to.be.reverted;
  });

  it("Should allow owner to mint tokens", async function () {
    await myYLCToken.mintToken(addr1.address, ethers.parseEther("500"));
    const addr1Balance = await myYLCToken.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(ethers.parseEther("500"));
  });

  it("Should allow owner to freeze and unfreeze accounts", async function () {
    await myYLCToken.freezeAccount(addr1.address, true);
    await expect(
      myYLCToken.connect(addr1).transfer(addr2.address, ethers.parseEther("1"))
    ).to.be.reverted;
    await myYLCToken.freezeAccount(addr1.address, false);
    await myYLCToken.transfer(addr1.address, ethers.parseEther("100"));
    await myYLCToken.connect(addr1).transfer(addr2.address, ethers.parseEther("50"));
    const addr2Balance = await myYLCToken.balanceOf(addr2.address);
    expect(addr2Balance).to.equal(ethers.parseEther("50"));
  });

  it("Should allow owner to set buy and sell prices", async function () {
    await myYLCToken.setPrices(ethers.parseEther("0.01"), ethers.parseEther("0.02"));
    const sellPrice = await myYLCToken.sellPrice();
    const buyPrice = await myYLCToken.buyPrice();
    expect(sellPrice).to.equal(ethers.parseEther("0.01"));
    expect(buyPrice).to.equal(ethers.parseEther("0.02"));
  });

  it("Should allow owner to burn tokens", async function () {
    await myYLCToken.burn(ethers.parseEther("100"));
    const totalSupply = await myYLCToken.totalSupply();
    expect(totalSupply).to.equal(ethers.parseEther("900"));
  });

  it("Should allow transferFrom with sufficient allowance", async function () {
    await myYLCToken.approve(addr1.address, ethers.parseEther("200"));
    await myYLCToken.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("100"));
    const addr2Balance = await myYLCToken.balanceOf(addr2.address);
    expect(addr2Balance).to.equal(ethers.parseEther("100"));
  });

  it("Should not allow transferFrom without sufficient allowance", async function () {
    await myYLCToken.approve(addr1.address, ethers.parseEther("50"));
    await expect(
      myYLCToken.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("100"))
    ).to.be.reverted;
  });

  it("Should not allow transferFrom from frozen account", async function () {
    await myYLCToken.freezeAccount(owner.address, true);
    await myYLCToken.approve(addr1.address, ethers.parseEther("200"));
    await expect(
      myYLCToken.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("100"))
    ).to.be.reverted;
    await myYLCToken.freezeAccount(owner.address, false);
  });

  it("Should not allow minting by non-owner", async function () {
    await expect(
      myYLCToken.connect(addr1).mintToken(addr1.address, ethers.parseEther("500"))
    ).to.be.reverted;
  });

  it("Should not allow selling more tokens than available", async function () {
    await myYLCToken.setPrices(ethers.parseEther("0.01"), ethers.parseEther("0.02"));
    const amountToSell = ethers.parseEther("1001");
    await expect(myYLCToken.sell(amountToSell)).to.be.reverted;
  });

  it("Should not allow burning more tokens than available", async function () {
    await expect(myYLCToken.burn(ethers.parseEther("1001"))).to.be.reverted;
  });

  it("Should not allow burning by non-owner", async function () {
    await expect(myYLCToken.connect(addr1).burn(ethers.parseEther("100"))).to.be.reverted;
  });

  it("Should handle fallback function", async function () {
    await expect(owner.sendTransaction({
      to: myYLCToken.target,
      value: ethers.parseEther("1")
    })).to.be.reverted;
  });
});
