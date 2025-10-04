// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MerchantContract
 * @dev Simple contract for merchants to use virtual cards/delegations
 * This is a demo contract for Trendyol scenario
 */
contract MerchantContract {
    event PaymentReceived(address indexed from, uint256 amount, string orderId);
    event VirtualCardUsed(address indexed cardHolder, uint256 amount, string merchant);
    
    mapping(address => uint256) public balances;
    mapping(string => bool) public usedOrderIds;
    
    address public owner;
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Merchant receives payment using delegation/virtual card
     * @param orderId Unique order identifier
     * @param amount Amount to charge
     */
    function chargeVirtualCard(string memory orderId, uint256 amount) external {
        require(!usedOrderIds[orderId], "Order ID already used");
        require(amount > 0, "Amount must be greater than 0");
        require(msg.sender.balance >= amount, "Insufficient balance");
        
        // Mark order as used
        usedOrderIds[orderId] = true;
        
        // Transfer funds (in real implementation, this would use delegation)
        // For demo, we'll just emit events
        balances[msg.sender] += amount;
        
        emit PaymentReceived(msg.sender, amount, orderId);
        emit VirtualCardUsed(msg.sender, amount, "Trendyol");
    }
    
    /**
     * @dev Check if order ID is already used
     */
    function isOrderUsed(string memory orderId) external view returns (bool) {
        return usedOrderIds[orderId];
    }
    
    /**
     * @dev Get merchant balance
     */
    function getBalance() external view returns (uint256) {
        return balances[msg.sender];
    }
    
    /**
     * @dev Withdraw funds (owner only)
     */
    function withdraw(uint256 amount) external {
        require(msg.sender == owner, "Only owner can withdraw");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        balances[msg.sender] -= amount;
        payable(owner).transfer(amount);
    }
    
    // Fallback function to receive ETH
    receive() external payable {
        balances[msg.sender] += msg.value;
    }
}