const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CheckoutPermit2", function () {
  let checkout, mockPermit2, mockToken;
  let owner, receiver, attacker;
  const ORDER_AMOUNT = ethers.utils.parseUnits("50", 6); // 50 mUSD

  beforeEach(async function () {
    [owner, receiver, attacker] = await ethers.getSigners();

    const MockPermit2 = await ethers.getContractFactory("MockPermit2");
    mockPermit2 = await MockPermit2.deploy();
    await mockPermit2.deployed();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy();
    await mockToken.deployed();

    const CheckoutPermit2 = await ethers.getContractFactory("CheckoutPermit2");
    checkout = await CheckoutPermit2.deploy(receiver.address, mockPermit2.address);
    await checkout.deployed();

    // Fund `owner` (the "customer") and have them approve MockPermit2,
    // mirroring the real Permit2 allowance model.
    await mockToken.mint(owner.address, ORDER_AMOUNT);
    await mockToken.connect(owner).approve(mockPermit2.address, ORDER_AMOUNT);
  });

  it("sets the receiver and permit2 address at deployment", async function () {
    expect(await checkout.receiver()).to.equal(receiver.address);
    expect(await checkout.permit2()).to.equal(mockPermit2.address);
  });

  it("reverts deployment with a zero-address receiver", async function () {
    const CheckoutPermit2 = await ethers.getContractFactory("CheckoutPermit2");
    await expect(
      CheckoutPermit2.deploy(ethers.constants.AddressZero, mockPermit2.address)
    ).to.be.revertedWithCustomError(checkout, "ZeroAddress");
  });

  it("transfers the exact order amount from payer to receiver when called by the payer", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 900;
    const nonce = 1;
    const fakeSignature = "0x00"; // MockPermit2 doesn't verify signatures

    await expect(
      checkout.connect(owner).pay(mockToken.address, ORDER_AMOUNT, nonce, deadline, fakeSignature)
    )
      .to.emit(checkout, "PaymentReceived")
      .withArgs(owner.address, mockToken.address, ORDER_AMOUNT, nonce);

    expect(await mockToken.balanceOf(receiver.address)).to.equal(ORDER_AMOUNT);
    expect(await mockToken.balanceOf(owner.address)).to.equal(0);
  });

  it("passes msg.sender through as the owner — attacker cannot pay on someone else's behalf with their own tx", async function () {
    // attacker calls pay(), but msg.sender (attacker) has no balance/allowance,
    // so the underlying transfer must fail — attacker can never move owner's funds.
    const deadline = Math.floor(Date.now() / 1000) + 900;

    await expect(
      checkout.connect(attacker).pay(mockToken.address, ORDER_AMOUNT, 2, deadline, "0x00")
    ).to.be.reverted; // MockERC20 reverts on insufficient allowance/balance for attacker
  });

  it("reverts if Permit2 rejects the call (e.g. expired/invalid signature)", async function () {
    await mockPermit2.setShouldRevert(true, "MockPermit2: invalid signature");

    const deadline = Math.floor(Date.now() / 1000) + 900;
    await expect(
      checkout.connect(owner).pay(mockToken.address, ORDER_AMOUNT, 3, deadline, "0x00")
    ).to.be.revertedWith("MockPermit2: invalid signature");

    // Nothing should have moved.
    expect(await mockToken.balanceOf(receiver.address)).to.equal(0);
  });

  it("reverts on an expired deadline", async function () {
    const expiredDeadline = Math.floor(Date.now() / 1000) - 10;
    await expect(
      checkout.connect(owner).pay(mockToken.address, ORDER_AMOUNT, 4, expiredDeadline, "0x00")
    ).to.be.revertedWith("MockPermit2: expired");
  });

  it("always sends funds to the immutable receiver, regardless of caller", async function () {
    const deadline = Math.floor(Date.now() / 1000) + 900;
    await checkout.connect(owner).pay(mockToken.address, ORDER_AMOUNT, 5, deadline, "0x00");

    // No parameter exists for redirecting the destination — receiver is
    // fixed at deployment, confirming funds can't be sent elsewhere.
    expect(await mockToken.balanceOf(receiver.address)).to.equal(ORDER_AMOUNT);
  });
});

/**
 * NOTE on integration testing against the REAL Permit2 contract:
 *
 * These tests use MockPermit2 to isolate CheckoutPermit2's own logic
 * (correct receiver, correct pass-through of args, msg.sender handling)
 * without needing full EIP-712 signature generation in tests.
 *
 * Before mainnet deployment, also run an integration test against a
 * forked mainnet (Hardhat's `forking` config pointed at a mainnet RPC)
 * using the REAL Permit2 at 0x000000000022D473030F116dDEE9F6B43aC78BA,
 * with signatures generated via the signCheckoutPermit() helper in
 * checkoutPermit2Signing.js and a real ethers.Wallet as the signer.
 * That confirms the EIP-712 domain/types match what Permit2 actually
 * expects on-chain — the mock alone can't catch a domain/type mismatch.
 */
