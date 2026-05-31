// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract OnChainWill {

    struct Will {
        address payable beneficiary;
        uint256 ethAmount;
        uint256 inactivityDays;
        uint256 lastCheckIn;
        bool active;
        string beneficiaryName;
    }

    mapping(address => Will) public wills;

    event WillRegistered(address indexed owner, address indexed beneficiary, uint256 ethAmount, uint256 inactivityDays);
    event CheckIn(address indexed owner, uint256 timestamp);
    event WillExecuted(address indexed owner, address indexed beneficiary, uint256 amount);
    event WillCancelled(address indexed owner, uint256 refundAmount);

    modifier onlyWillOwner() {
        require(wills[msg.sender].active, "No active will found");
        _;
    }

    function registerWill(
        address payable beneficiary,
        uint256 inactivityDays,
        string calldata beneficiaryName
    ) external payable {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(beneficiary != msg.sender, "Cannot set yourself as beneficiary");
        require(inactivityDays >= 30 && inactivityDays <= 365, "Inactivity must be 30-365 days");
        require(msg.value > 0, "Must deposit ETH");

        if (wills[msg.sender].active && wills[msg.sender].ethAmount > 0) {
            uint256 refund = wills[msg.sender].ethAmount;
            wills[msg.sender].ethAmount = 0;
            payable(msg.sender).transfer(refund);
        }

        wills[msg.sender] = Will({
            beneficiary: beneficiary,
            ethAmount: msg.value,
            inactivityDays: inactivityDays,
            lastCheckIn: block.timestamp,
            active: true,
            beneficiaryName: beneficiaryName
        });

        emit WillRegistered(msg.sender, beneficiary, msg.value, inactivityDays);
    }

    function checkIn() external onlyWillOwner {
        wills[msg.sender].lastCheckIn = block.timestamp;
        emit CheckIn(msg.sender, block.timestamp);
    }

    function executeWill(address owner) external {
        Will storage w = wills[owner];
        require(w.active, "No active will");
        require(block.timestamp >= w.lastCheckIn + (w.inactivityDays * 1 days), "Inactivity period not reached");

        uint256 amount = w.ethAmount;
        address payable beneficiary = w.beneficiary;
        w.active = false;
        w.ethAmount = 0;
        beneficiary.transfer(amount);

        emit WillExecuted(owner, beneficiary, amount);
    }

    function cancelWill() external onlyWillOwner {
        uint256 refund = wills[msg.sender].ethAmount;
        wills[msg.sender].active = false;
        wills[msg.sender].ethAmount = 0;
        if (refund > 0) payable(msg.sender).transfer(refund);
        emit WillCancelled(msg.sender, refund);
    }

    function isExecutable(address owner) external view returns (bool) {
        Will storage w = wills[owner];
        if (!w.active) return false;
        return block.timestamp >= w.lastCheckIn + (w.inactivityDays * 1 days);
    }

    function daysUntilExecutable(address owner) external view returns (uint256) {
        Will storage w = wills[owner];
        if (!w.active) return 0;
        uint256 deadline = w.lastCheckIn + (w.inactivityDays * 1 days);
        if (block.timestamp >= deadline) return 0;
        return (deadline - block.timestamp) / 1 days;
    }
}
