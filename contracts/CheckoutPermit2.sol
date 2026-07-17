// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal interface for the canonical Permit2 contract.
interface IPermit2 {
    struct TokenPermissions {
        address token;
        uint256 amount;
    }

    struct PermitTransferFrom {
        TokenPermissions permitted;
        uint256 nonce;
        uint256 deadline;
    }

    struct SignatureTransferDetails {
        address to;
        uint256 requestedAmount;
    }

    function permitTransferFrom(
        PermitTransferFrom calldata permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external;
}

/// @title CheckoutPermit2
/// @notice A merchant checkout contract that accepts payment via Permit2.
///
/// Key design choice: this contract must be called directly by the payer's
/// own wallet (msg.sender == owner). The customer signs the Permit2 message
/// and submits the transaction themselves, in one wallet interaction, so
/// their wallet shows them exactly what is being charged at the moment
/// payment happens. There is no flow where a signature is captured now and
/// redeemed by someone else later.
contract CheckoutPermit2 {
    /// @notice Merchant's receiving address, fixed at deployment.
    address public immutable receiver;

    /// @notice Canonical Permit2 contract address (same on every chain it's deployed to).
    IPermit2 public immutable permit2;

    event PaymentReceived(
        address indexed payer,
        address indexed token,
        uint256 amount,
        uint256 nonce
    );

    error NotTokenOwner();
    error ZeroAddress();

    constructor(address _receiver, address _permit2) {
        if (_receiver == address(0) || _permit2 == address(0)) revert ZeroAddress();
        receiver = _receiver;
        permit2 = IPermit2(_permit2);
    }

    /// @notice Pay for an order using a Permit2 signature-based transfer.
    /// @dev Caller MUST be the token owner (`owner`). This is what makes the
    /// flow participatory: the customer's own wallet has to sign and send
    /// this transaction, so they see and approve the charge in real time,
    /// rather than a merchant redeeming a previously-collected signature
    /// on the customer's behalf at some later, disconnected point.
    /// @param token The ERC20 token being paid with.
    /// @param amount The amount being charged.
    /// @param nonce Permit2 nonce, unique per signature.
    /// @param deadline Expiry timestamp for the permit signature.
    /// @param signature The EIP-712 signature the customer just produced
    ///        in their wallet for this exact payment.
    function pay(
        address token,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        address owner = msg.sender;

        // Enforced by construction: msg.sender is always the owner here,
        // since `owner` is derived from msg.sender rather than passed in.
        // This check is left explicit for clarity/defense-in-depth.
        if (owner != msg.sender) revert NotTokenOwner();

        IPermit2.PermitTransferFrom memory permit = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: token, amount: amount}),
            nonce: nonce,
            deadline: deadline
        });

        IPermit2.SignatureTransferDetails memory transferDetails = IPermit2.SignatureTransferDetails({
            to: receiver,
            requestedAmount: amount
        });

        // Permit2 verifies the signature came from `owner` and that it
        // matches this exact token/amount/nonce/deadline, then executes
        // the transfer to `receiver` — all within the transaction the
        // customer themselves submitted and paid gas for.
        permit2.permitTransferFrom(permit, transferDetails, owner, signature);

        emit PaymentReceived(owner, token, amount, nonce);
    }
}
