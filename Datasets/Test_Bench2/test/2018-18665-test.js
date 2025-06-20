const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NexxusToken", function () {
    let NexxusToken, nexxusToken, owner, addr1, addr2;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        const NexxusTokenFactory = await ethers.getContractFactory("NexxusToken");
        nexxusToken = await NexxusTokenFactory.deploy();
    });

    it("Should deploy with the correct initial supply and assign it to the owner", async function () {
        const totalSupply = await nexxusToken.totalSupply();
        const ownerBalance = await nexxusToken.balanceOf(owner.address);
        expect(totalSupply).to.equal(ethers.parseEther("0.0318000000"));
        expect(ownerBalance).to.equal(totalSupply);
    });

    it("Should allow token transfers between accounts", async function () {
        await nexxusToken.mintToken(ethers.parseEther("1000"));
        const initialOwnerBalance = await nexxusToken.balanceOf(owner.address);
        const initialAddr1Balance = await nexxusToken.balanceOf(addr1.address);
        const transferAmount = ethers.parseEther("100");

        await nexxusToken.transfer(addr1.address, transferAmount);
        const addr1Balance = await nexxusToken.balanceOf(addr1.address);
        expect(addr1Balance).to.equal(initialAddr1Balance + transferAmount);
        expect(await nexxusToken.balanceOf(owner.address)).to.equal(initialOwnerBalance - transferAmount);

        // Transfer tokens back to the owner for subsequent tests
        await nexxusToken.connect(addr1).transfer(owner.address, transferAmount);
    });

    it("Should not allow transfers exceeding balance", async function () {
        // Check initial balance of addr1 and addr2
        const initialAddr1Balance = await nexxusToken.balanceOf(addr1.address);
        const initialAddr2Balance = await nexxusToken.balanceOf(addr2.address);

        // Try to transfer 100 tokens from addr1 to addr2 (should not throw error but also shouldn't happen)
        await nexxusToken.connect(addr1).transfer(addr2.address, ethers.parseEther("100"))

        // Check that addr1's balance is still the same (it should not have changed)
        const finalAddr1Balance = await nexxusToken.balanceOf(addr1.address);
        expect(finalAddr1Balance).to.equal(initialAddr1Balance);

        // Check that addr2's balance is still the same (it should not have received any tokens)
        const finalAddr2Balance = await nexxusToken.balanceOf(addr2.address);
        expect(finalAddr2Balance).to.equal(initialAddr2Balance);
    });

    it("Should allow the owner to mint new tokens", async function () {
        const initialTotalSupply = await nexxusToken.totalSupply();
        const mintAmount = ethers.parseEther("1000");
        await nexxusToken.mintToken(mintAmount);
        const totalSupply = await nexxusToken.totalSupply();
        const ownerBalance = await nexxusToken.balanceOf(owner.address);
        expect(totalSupply).to.equal(initialTotalSupply + mintAmount);
        expect(ownerBalance).to.equal(totalSupply);
    });

    it("Should not revert on non-owners minting tokens", async function () {
        // This test checks that non-owners *can* call mintToken, but the minting is conditional on msg.sender == owner in the contract
        // Therefore, the call will not revert, but no tokens will be minted
        const initialTotalSupply = await nexxusToken.totalSupply();
        await nexxusToken.connect(addr1).mintToken(ethers.parseEther("1000"));
        expect(await nexxusToken.totalSupply()).to.equal(initialTotalSupply);
    });

    it("Should allow the owner to disable and enable the token", async function () {
        // Mint tokens to the owner
        await nexxusToken.mintToken(ethers.parseUnits("1000", 8));

        // Check initial balances before disabling the token
        const initialOwnerBalance = await nexxusToken.balanceOf(owner.address);
        const initialAddr1Balance = await nexxusToken.balanceOf(addr1.address);

        // Disable the token and attempt a transfer (should revert)
        await nexxusToken.disableToken(true);
        await nexxusToken.transfer(addr1.address, ethers.parseUnits("100", 8))

        // Check that balances have not changed after the failed transfer
        const finalOwnerBalanceAfterDisable = await nexxusToken.balanceOf(owner.address);
        const finalAddr1BalanceAfterDisable = await nexxusToken.balanceOf(addr1.address);

        expect(finalOwnerBalanceAfterDisable).to.equal(initialOwnerBalance);
        expect(finalAddr1BalanceAfterDisable).to.equal(initialAddr1Balance);

        // Enable the token and attempt a transfer again (should succeed)
        await nexxusToken.disableToken(false);
        const transferAmount = ethers.parseUnits("100", 8);
        await nexxusToken.transfer(addr1.address, transferAmount);

        // Check the final balance of addr1 after the transfer
        const finalAddr1Balance = await nexxusToken.balanceOf(addr1.address);

        // Make sure you're adding to initial balance (ensure both are BigNumbers)
        const expectedAddr1Balance = initialAddr1Balance+transferAmount;
        expect(finalAddr1Balance).to.equal(expectedAddr1Balance);

        // Transfer tokens back to the owner for subsequent tests
        await nexxusToken.connect(addr1).transfer(owner.address, transferAmount);
    });

    it("Should allow the owner to disable and enable the token", async function () {
        await nexxusToken.disableToken(true);
        expect(await nexxusToken.disabled()).to.be.true;

        await nexxusToken.disableToken(false);
        expect(await nexxusToken.disabled()).to.be.false;
    });

    it("Should allow approval and allowance checks", async function () {
        const approveAmount = ethers.parseEther("200");
        await nexxusToken.approve(addr1.address, approveAmount);
        const allowance = await nexxusToken.allowance(owner.address, addr1.address);
        expect(allowance).to.equal(approveAmount);
    });

    it("Should allow approveAndCall", async function () {
        const spender = addr1.address;
        const approveAmount = ethers.parseEther("100");
        const extraData = "0x1234";

        await nexxusToken.approveAndCall(spender, approveAmount, extraData);
        expect(await nexxusToken.allowance(owner.address, spender)).to.equal(approveAmount);
    });

    it("Should allow transferFrom when approved", async function () {
        await nexxusToken.mintToken(ethers.parseEther("1000"));
        const initialOwnerBalance = await nexxusToken.balanceOf(owner.address);
        const initialAddr2Balance = await nexxusToken.balanceOf(addr2.address);
        const approveAmount = ethers.parseEther("200");
        const transferAmount = ethers.parseEther("100");

        await nexxusToken.approve(addr1.address, approveAmount);
        await nexxusToken.connect(addr1).transferFrom(owner.address, addr2.address, transferAmount);
        const addr2Balance = await nexxusToken.balanceOf(addr2.address);
        expect(addr2Balance).to.equal(initialAddr2Balance + transferAmount);
        expect(await nexxusToken.balanceOf(owner.address)).to.equal(initialOwnerBalance - transferAmount);

        // Transfer tokens back to the owner for subsequent tests
        await nexxusToken.connect(addr2).transfer(owner.address, transferAmount);
    });

    it("Should not allow transferFrom exceeding allowance", async function () {
        const approveAmount = ethers.parseEther("100");
        await nexxusToken.approve(addr1.address, approveAmount);

        const balanceBefore = await nexxusToken.balanceOf(addr2.address);

        // Try to transfer 200 tokens from owner to addr2 via addr1, but allowance is only 100
        await nexxusToken.connect(addr1).transferFrom(owner.address, addr2.address, ethers.parseEther("200"));

        const balanceAfter = await nexxusToken.balanceOf(addr2.address);

        // Ensure that the balance of addr2 hasn't changed
        expect(balanceBefore).to.equal(balanceAfter);
    });
});
