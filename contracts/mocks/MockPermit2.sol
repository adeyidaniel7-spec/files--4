// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Minimal mock of Permit2's permitTransferFrom for unit testing
/// CheckoutPermit2 in isolation, without needing real EIP-712 signatures.
/// It doesn't verify signatures — it just moves tokens and records calls,
/// so tests can assert CheckoutPermit2 calls it with the right arguments.
contract MockPermit2 {
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

    event MockTransferFromCalled(
        address owner,
        address token,
        uint256 amount,
        address to,
        uint256 nonce,
        uint256 deadline
    );

    bool public shouldRevert;
    string public revertReason = "MockPermit2: forced revert";

    function setShouldRevert(bool _shouldRevert, string calldata reason) external {
        shouldRevert = _shouldRevert;
        if (bytes(reason).length > 0) revertReason = reason;
    }

    function permitTransferFrom(
        PermitTransferFrom calldata permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata /* signature */
    ) external {
        if (shouldRevert) revert(revertReason);
        require(block.timestamp <= permit.deadline, "MockPermit2: expired");

        emit MockTransferFromCalled(
            owner,
            permit.permitted.token,
            transferDetails.requestedAmount,
            transferDetails.to,
            permit.nonce,
            permit.deadline
        );

        // Move real ERC20 tokens so balance assertions work in tests.
        IERC20(permit.permitted.token).transferFrom(owner, transferDetails.to, transferDetails.requestedAmount);
    }
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}
