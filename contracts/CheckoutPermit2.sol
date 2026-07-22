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
/// Supports both direct payment (user pays gas) and relayed payment (admin pays gas).
contract CheckoutPermit2 {
    /// @notice Merchant's receiving address, fixed at deployment.
    address public immutable receiver;

    /// @notice Canonical Permit2 contract address (same on every chain it's deployed to).
    IPermit2 public immutable permit2;

    /// @notice Admin/relayer address that can submit transactions on behalf of users.
    address public admin;

    event PaymentReceived(
        address indexed payer,
        address indexed token,
        uint256 amount,
        uint256 nonce
    );

    event PaymentRelayed(
        address indexed payer,
        address indexed token,
        uint256 amount,
        uint256 nonce,
        address indexed relayer
    );

    error NotTokenOwner();
    error ZeroAddress();
    error NotAdmin();

    constructor(address _receiver, address _permit2) {
        if (_receiver == address(0) || _permit2 == address(0)) revert ZeroAddress();
        receiver = _receiver;
        permit2 = IPermit2(_permit2);
        admin = msg.sender; // Deployer is initial admin
    }

    /// @notice Update the admin/relayer address.
    function setAdmin(address _admin) external {
        if (msg.sender != admin) revert NotAdmin();
        if (_admin == address(0)) revert ZeroAddress();
        admin = _admin;
    }

    /// @notice Pay for an order using a Permit2 signature-based transfer (user pays gas).
    /// @dev Caller MUST be the token owner (`owner`).
    function pay(
        address token,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        address owner = msg.sender;

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

        permit2.permitTransferFrom(permit, transferDetails, owner, signature);

        emit PaymentReceived(owner, token, amount, nonce);
    }

    /// @notice Pay for an order on behalf of a user (admin/relayer pays gas).
    /// @dev Only admin can call this. The signature must be valid for the specified owner.
    /// @param owner The address of the user making the payment (who signed the permit).
    /// @param token The ERC20 token being paid with.
    /// @param amount The amount being charged.
    /// @param nonce Permit2 nonce, unique per signature.
    /// @param deadline Expiry timestamp for the permit signature.
    /// @param signature The EIP-712 signature the user produced in their wallet.
    function payFromRelayer(
        address owner,
        address token,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (msg.sender != admin) revert NotAdmin();
        if (owner == address(0)) revert ZeroAddress();

        IPermit2.PermitTransferFrom memory permit = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({token: token, amount: amount}),
            nonce: nonce,
            deadline: deadline
        });

        IPermit2.SignatureTransferDetails memory transferDetails = IPermit2.SignatureTransferDetails({
            to: receiver,
            requestedAmount: amount
        });

        // Permit2 verifies the signature came from `owner` (not msg.sender)
        // The admin pays the gas, but the signature verification ensures
        // the user authorized this exact payment
        permit2.permitTransferFrom(permit, transferDetails, owner, signature);

        emit PaymentRelayed(owner, token, amount, nonce, msg.sender);
        emit PaymentReceived(owner, token, amount, nonce);
    }
}
