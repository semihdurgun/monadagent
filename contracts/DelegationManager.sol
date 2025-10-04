// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DelegationManager
 * @dev Ana wallet gizli kalarak arkadaşlara MON kullanım yetkisi veren sistem
 */
contract DelegationManager {
    struct Delegation {
        address from;           // Ana wallet (gizli kalır)
        address to;             // Arkadaş adresi
        address smartAccount;   // Smart Account adresi
        uint256 amount;         // Tahsis edilen MON miktarı
        uint256 remainingAmount; // Kalan MON miktarı
        uint256 expiresAt;      // Bitiş zamanı (timestamp)
        uint256 maxUses;        // Maksimum kullanım sayısı
        uint256 usedCount;      // Kullanılan sayı
        bool isActive;          // Aktif mi?
        string[] allowedActions; // İzin verilen işlemler
    }

    mapping(bytes32 => Delegation) public delegations;
    mapping(address => bytes32[]) public userDelegations; // Kullanıcının delegation'ları
    mapping(bytes32 => bool) public usedDelegationIds;    // Kullanılan ID'ler

    address public owner;
    uint256 public totalDelegations;

    event DelegationCreated(
        bytes32 indexed delegationId,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 expiresAt
    );

    event DelegationUsed(
        bytes32 indexed delegationId,
        address indexed user,
        uint256 amount,
        address recipient
    );

    event DelegationRevoked(
        bytes32 indexed delegationId,
        address indexed from
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Yeni delegation oluştur
     * @param to Arkadaş adresi
     * @param smartAccount Smart Account adresi
     * @param amount MON miktarı
     * @param durationSeconds Süre (saniye)
     * @param maxUses Maksimum kullanım sayısı
     * @param allowedActions İzin verilen işlemler
     */
    function createDelegation(
        address to,
        address smartAccount,
        uint256 amount,
        uint256 durationSeconds,
        uint256 maxUses,
        string[] memory allowedActions
    ) external payable returns (bytes32) {
        require(msg.value >= amount, "Insufficient payment");
        require(to != address(0), "Invalid recipient");
        require(smartAccount != address(0), "Invalid smart account");
        require(amount > 0, "Amount must be greater than 0");
        require(durationSeconds > 0, "Duration must be greater than 0");

        // Delegation ID oluştur
        bytes32 delegationId = keccak256(
            abi.encodePacked(
                msg.sender,
                to,
                block.timestamp,
                block.number,
                totalDelegations
            )
        );

        require(!usedDelegationIds[delegationId], "Delegation ID already exists");

        // Delegation oluştur
        Delegation storage delegation = delegations[delegationId];
        delegation.from = msg.sender;
        delegation.to = to;
        delegation.smartAccount = smartAccount;
        delegation.amount = amount;
        delegation.remainingAmount = amount;
        delegation.expiresAt = block.timestamp + durationSeconds;
        delegation.maxUses = maxUses;
        delegation.usedCount = 0;
        delegation.isActive = true;

        // Allowed actions'ı ekle
        for (uint256 i = 0; i < allowedActions.length; i++) {
            delegation.allowedActions.push(allowedActions[i]);
        }

        usedDelegationIds[delegationId] = true;
        userDelegations[msg.sender].push(delegationId);
        userDelegations[to].push(delegationId);
        totalDelegations++;

        // Smart Account'a MON transfer et
        (bool success, ) = smartAccount.call{value: amount}("");
        require(success, "Transfer to smart account failed");

        emit DelegationCreated(delegationId, msg.sender, to, amount, delegation.expiresAt);

        return delegationId;
    }

    /**
     * @dev Arkadaş delegation'ı kullanır
     * @param delegationId Delegation ID
     * @param amount Kullanılacak MON miktarı
     * @param recipient Alıcı adres
     */
    function useDelegation(
        bytes32 delegationId,
        uint256 amount,
        address recipient
    ) external {
        Delegation storage delegation = delegations[delegationId];
        
        // Kontroller
        require(delegation.isActive, "Delegation is not active");
        require(delegation.to == msg.sender, "Not authorized to use this delegation");
        require(block.timestamp <= delegation.expiresAt, "Delegation expired");
        require(delegation.usedCount < delegation.maxUses, "Usage limit exceeded");
        require(delegation.remainingAmount >= amount, "Insufficient remaining amount");
        require(amount > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");

        // Kullanım sayısını artır
        delegation.usedCount++;
        delegation.remainingAmount -= amount;

        // Eğer tüm MON kullanıldıysa delegation'ı kapat
        if (delegation.remainingAmount == 0 || delegation.usedCount >= delegation.maxUses) {
            delegation.isActive = false;
        }

        // Smart Account'tan MON gönder (simulated)
        // Gerçek uygulamada burada Smart Account'un execute fonksiyonu çağrılır
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Transfer failed");

        emit DelegationUsed(delegationId, msg.sender, amount, recipient);
    }

    /**
     * @dev Delegation'ı iptal et (sadece oluşturan kişi)
     * @param delegationId Delegation ID
     */
    function revokeDelegation(bytes32 delegationId) external {
        Delegation storage delegation = delegations[delegationId];
        
        require(delegation.from == msg.sender, "Not authorized to revoke");
        require(delegation.isActive, "Delegation is not active");

        delegation.isActive = false;

        // Kalan MON'ları geri gönder
        if (delegation.remainingAmount > 0) {
            (bool success, ) = delegation.from.call{value: delegation.remainingAmount}("");
            require(success, "Refund failed");
        }

        emit DelegationRevoked(delegationId, msg.sender);
    }

    /**
     * @dev Delegation bilgilerini getir (arkadaş için)
     * @param delegationId Delegation ID
     * @param userAddress Kullanıcı adresi
     */
    function getDelegationForUser(
        bytes32 delegationId,
        address userAddress
    ) external view returns (
        uint256 amount,
        uint256 remainingAmount,
        uint256 expiresAt,
        uint256 maxUses,
        uint256 usedCount,
        bool isActive,
        address smartAccount
    ) {
        Delegation storage delegation = delegations[delegationId];
        
        require(delegation.to == userAddress, "Not authorized to view this delegation");

        return (
            delegation.amount,
            delegation.remainingAmount,
            delegation.expiresAt,
            delegation.maxUses,
            delegation.usedCount,
            delegation.isActive,
            delegation.smartAccount
        );
    }

    /**
     * @dev Kullanıcının tüm delegation'larını getir
     * @param user Kullanıcı adresi
     */
    function getUserDelegations(address user) external view returns (bytes32[] memory) {
        return userDelegations[user];
    }

    /**
     * @dev Delegation detaylarını getir
     * @param delegationId Delegation ID
     */
    function getDelegation(bytes32 delegationId) external view returns (
        address from,
        address to,
        address smartAccount,
        uint256 amount,
        uint256 remainingAmount,
        uint256 expiresAt,
        uint256 maxUses,
        uint256 usedCount,
        bool isActive
    ) {
        Delegation storage delegation = delegations[delegationId];
        
        return (
            delegation.from,
            delegation.to,
            delegation.smartAccount,
            delegation.amount,
            delegation.remainingAmount,
            delegation.expiresAt,
            delegation.maxUses,
            delegation.usedCount,
            delegation.isActive
        );
    }

    /**
     * @dev Contract'ın bakiyesini getir
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Owner fonksiyonları
     */
    function withdraw(uint256 amount) external onlyOwner {
        require(amount <= address(this).balance, "Insufficient balance");
        payable(owner).transfer(amount);
    }

    // Fallback function to receive ETH
    receive() external payable {}
}
