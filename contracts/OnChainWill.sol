// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract OnChainWill {
    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    struct Will {
        address beneficiary;
        uint256 usdcAmount;      // 0 = full balance
        uint256 inactivityDays;
        uint256 lastCheckIn;
        bool active;
        string beneficiaryName;
    }

    mapping(address => Will) public wills;

    event WillRegistered(address indexed owner, address indexed beneficiary, uint256 usdcAmount, uint256 inactivityDays);
    event CheckIn(address indexed owner, uint256 timestamp);
    event WillExecuted(address indexed owner, address indexed beneficiary, uint256 amount);
    event WillCancelled(address indexed owner);

    modifier onlyWillOwner() {
        require(wills[msg.sender].active, "No active will found");
        _;
    }

    /// @notice Register or update your will
    function registerWill(
        address beneficiary,
        uint256 usdcAmount,
        uint256 inactivityDays,
        string calldata beneficiaryName
    ) external {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(beneficiary != msg.sender, "Cannot set yourself as beneficiary");
        require(inactivityDays >= 30 && inactivityDays <= 365, "Inactivity must be 30-365 days");

        wills[msg.sender] = Will({
            beneficiary: beneficiary,
            usdcAmount: usdcAmount,
            inactivityDays: inactivityDays,
            lastCheckIn: block.timestamp,
            active: true,
            beneficiaryName: beneficiaryName
        });

        emit WillRegistered(msg.sender, beneficiary, usdcAmount, inactivityDays);
    }

    /// @notice Reset your inactivity timer — call this periodically to prove you're alive
    function checkIn() external onlyWillOwner {
        wills[msg.sender].lastCheckIn = block.timestamp;
        emit CheckIn(msg.sender, block.timestamp);
    }

    /// @notice Execute a will after inactivity period has passed
    /// @param owner The wallet whose will should be executed
    function executeWill(address owner) external {
        Will storage w = wills[owner];
        require(w.active, "No active will");
        require(
            block.timestamp >= w.lastCheckIn + (w.inactivityDays * 1 days),
            "Inactivity period not reached"
        );

        IERC20 usdc = IERC20(USDC);
        uint256 balance = usdc.balanceOf(owner);
        uint256 allowed = usdc.allowance(owner, address(this));

        uint256 amount;
        if (w.usdcAmount == 0) {
            // Transfer full allowance or balance, whichever is less
            amount = balance < allowed ? balance : allowed;
        } else {
            amount = w.usdcAmount;
            if (amount > balance) amount = balance;
            if (amount > allowed) amount = allowed;
        }

        require(amount > 0, "No USDC available to transfer");

        w.active = false;

        bool success = usdc.transferFrom(owner, w.beneficiary, amount);
        require(success, "USDC transfer failed");

        emit WillExecuted(owner, w.beneficiary, amount);
    }

    /// @notice Cancel your will
    function cancelWill() external onlyWillOwner {
        wills[msg.sender].active = false;
        emit WillCancelled(msg.sender);
    }

    /// @notice Check if a will is ready to be executed
    function isExecutable(address owner) external view returns (bool) {
        Will storage w = wills[owner];
        if (!w.active) return false;
        return block.timestamp >= w.lastCheckIn + (w.inactivityDays * 1 days);
    }

    /// @notice Get days remaining before will can be executed
    function daysUntilExecutable(address owner) external view returns (uint256) {
        Will storage w = wills[owner];
        if (!w.active) return 0;
        uint256 deadline = w.lastCheckIn + (w.inactivityDays * 1 days);
        if (block.timestamp >= deadline) return 0;
        return (deadline - block.timestamp) / 1 days;
    }
}
