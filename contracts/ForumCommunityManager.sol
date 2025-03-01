// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./ForumCommon.sol";

contract ForumCommunityManager {
    address public forumContract;

    struct Community {
        uint32 id;
        address creator;
        string contentCID; // IPFS CID para nombre y descripción
        string[] topics; // Tópicos específicos de esta comunidad
        uint32 postCount;
        bool isActive;
    }

    // Contador de comunidades
    uint32 private communityCounter;

    // Mappings relacionados con comunidades
    mapping(uint32 => Community) public communities;
    mapping(uint32 => mapping(string => bool)) public communityTopics;
    mapping(uint32 => mapping(address => bool)) public communityMembers;
    mapping(address => uint32[]) private userCommunities;
    mapping(uint32 => uint32) public communityMemberCount;
    mapping(address => uint256) private lastCommunityCreationTime;

    // Eventos
    event CommunityCreated(uint32 indexed communityId, address indexed creator);
    event TopicAdded(uint32 indexed communityId, string topic);
    event CommunityDeactivated(uint32 indexed communityId);
    event MemberJoined(uint32 indexed communityId, address indexed member);
    event MemberLeft(uint32 indexed communityId, address indexed member);

    constructor() {
        forumContract = msg.sender;
    }

    // Función para actualizar la dirección del contrato principal
    function setForumContract(address _newForumContract) external {
        require(msg.sender == forumContract, "Not authorized");
        forumContract = _newForumContract;
    }

    // Modificadores
    modifier onlyForumContract() {
        require(msg.sender == forumContract, "Not authorized");
        _;
    }

    modifier communityCooldown(address user) {
        require(
            block.timestamp >=
                lastCommunityCreationTime[user] + 5 minutes,
            "Community creation cooldown active"
        );
        _;
        lastCommunityCreationTime[user] = block.timestamp;
    }

    modifier validCommunity(uint32 communityId) {
        require(
            communityId > 0 && communityId <= communityCounter,
            "Invalid community ID"
        );
        require(communities[communityId].isActive, "Community is inactive");
        _;
    }

    // ========== FUNCIONES PARA LLAMADAS DIRECTAS ==========
    // Estas funciones siguen existiendo para mantener compatibilidad

    // Crear una nueva comunidad
    function createCommunity(
        string memory contentCID,
        string[] memory initialTopics
    ) external communityCooldown(msg.sender) {
        _createCommunity(msg.sender, contentCID, initialTopics);
    }

    // Añadir un nuevo tópico a una comunidad existente
    function addTopicToCommunity(
        uint32 communityId,
        string memory topic
    ) external validCommunity(communityId) {
        require(
            msg.sender == communities[communityId].creator,
            "Not community creator"
        );
        _addTopicToCommunity(communityId, topic);
    }

    // Unirse a una comunidad
    function joinCommunity(
        uint32 communityId
    ) external validCommunity(communityId) {
        _joinCommunity(msg.sender, communityId);
    }

    // Abandonar una comunidad
    function leaveCommunity(
        uint32 communityId
    ) external validCommunity(communityId) {
        _leaveCommunity(msg.sender, communityId);
    }

    // Desactivar una comunidad
    function deactivateCommunity(
        uint32 communityId
    ) external validCommunity(communityId) {
        require(
            msg.sender == communities[communityId].creator,
            "Not community creator"
        );
        _deactivateCommunity(communityId);
    }

    // ========== FUNCIONES PARA LLAMADAS DESDE EL CONTRATO PRINCIPAL ==========
    
    // Crear una nueva comunidad para un usuario específico
    function createCommunityFor(
        address user,
        string memory contentCID,
        string[] memory initialTopics
    ) external onlyForumContract communityCooldown(user) {
        _createCommunity(user, contentCID, initialTopics);
    }

    // Añadir un nuevo tópico a una comunidad para un usuario específico
    function addTopicToCommunityFor(
        address user,
        uint32 communityId,
        string memory topic
    ) external onlyForumContract validCommunity(communityId) {
        require(
            user == communities[communityId].creator,
            "Not community creator"
        );
        _addTopicToCommunity(communityId, topic);
    }

    // Unirse a una comunidad para un usuario específico
    function joinCommunityFor(
        address user,
        uint32 communityId
    ) external onlyForumContract validCommunity(communityId) {
        _joinCommunity(user, communityId);
    }

    // Abandonar una comunidad para un usuario específico
    function leaveCommunityFor(
        address user,
        uint32 communityId
    ) external onlyForumContract validCommunity(communityId) {
        _leaveCommunity(user, communityId);
    }

    // Desactivar una comunidad para un usuario específico
    function deactivateCommunityFor(
        address user,
        uint32 communityId
    ) external onlyForumContract validCommunity(communityId) {
        require(
            user == communities[communityId].creator,
            "Not community creator"
        );
        _deactivateCommunity(communityId);
    }

    // ========== FUNCIONES INTERNAS ==========
    
    // Implementación interna para crear una comunidad
    function _createCommunity(
        address creator,
        string memory contentCID,
        string[] memory initialTopics
    ) internal {
        require(bytes(contentCID).length > 0, "Content CID invalid");
        require(initialTopics.length > 0, "At least one topic required");

        // Verificar que no haya tópicos duplicados
        for (uint256 i = 0; i < initialTopics.length; i++) {
            require(
                bytes(initialTopics[i]).length > 0,
                "Empty topic not allowed"
            );
            for (uint256 j = i + 1; j < initialTopics.length; j++) {
                require(
                    keccak256(abi.encodePacked(initialTopics[i])) !=
                        keccak256(abi.encodePacked(initialTopics[j])),
                    "Duplicate topics not allowed"
                );
            }
        }

        communityCounter++;

        communities[communityCounter] = Community(
            communityCounter,
            creator,
            contentCID,
            initialTopics,
            0,
            true
        );

        // Registrar los tópicos iniciales
        for (uint256 i = 0; i < initialTopics.length; i++) {
            communityTopics[communityCounter][initialTopics[i]] = true;
        }

        emit CommunityCreated(communityCounter, creator);

        // El creador se convierte automáticamente en miembro
        communityMembers[communityCounter][creator] = true;
        userCommunities[creator].push(communityCounter);
        communityMemberCount[communityCounter] = 1;

        emit MemberJoined(communityCounter, creator);
    }

    // Implementación interna para añadir un tópico
    function _addTopicToCommunity(uint32 communityId, string memory topic) internal {
        require(
            bytes(topic).length > 0 && bytes(topic).length <= 100,
            "Topic size invalid"
        );
        require(!communityTopics[communityId][topic], "Topic already exists");

        communities[communityId].topics.push(topic);
        communityTopics[communityId][topic] = true;

        emit TopicAdded(communityId, topic);
    }

    // Implementación interna para unirse a una comunidad
    function _joinCommunity(address user, uint32 communityId) internal {
        require(!communityMembers[communityId][user], "Already a member");

        communityMembers[communityId][user] = true;
        userCommunities[user].push(communityId);
        communityMemberCount[communityId]++;

        emit MemberJoined(communityId, user);
    }

    // Implementación interna para abandonar una comunidad
    function _leaveCommunity(address user, uint32 communityId) internal {
        require(communityMembers[communityId][user], "Not a member");
        require(
            communities[communityId].creator != user,
            "Creator cannot leave"
        );

        communityMembers[communityId][user] = false;
        communityMemberCount[communityId]--;

        // Eliminar la comunidad del array de comunidades del usuario
        uint32[] storage userComms = userCommunities[user];
        for (uint256 i = 0; i < userComms.length; i++) {
            if (userComms[i] == communityId) {
                // Reemplazar con el último elemento y reducir la longitud
                userComms[i] = userComms[userComms.length - 1];
                userComms.pop();
                break;
            }
        }

        emit MemberLeft(communityId, user);
    }

    // Implementación interna para desactivar una comunidad
    function _deactivateCommunity(uint32 communityId) internal {
        communities[communityId].isActive = false;
        emit CommunityDeactivated(communityId);
    }

    // ========== FUNCIONES DE LECTURA (SIN CAMBIOS) ==========
    
    function getCommunity(
        uint32 communityId
    ) external view returns (Community memory) {
        require(
            communityId > 0 && communityId <= communityCounter,
            "Invalid community ID"
        );
        return communities[communityId];
    }

    function getActiveCommunities() external view returns (Community[] memory) {
        uint32 count = 0;

        for (uint32 i = 1; i <= communityCounter; i++) {
            if (communities[i].isActive) {
                count++;
            }
        }

        Community[] memory activeCommunities = new Community[](count);
        uint32 currentIndex = 0;

        for (uint32 i = 1; i <= communityCounter; i++) {
            if (communities[i].isActive) {
                activeCommunities[currentIndex] = communities[i];
                currentIndex++;
            }
        }

        return activeCommunities;
    }

    function getCommunityTopics(
        uint32 communityId
    ) external view validCommunity(communityId) returns (string[] memory) {
        return communities[communityId].topics;
    }

    function isCommunityTopicValid(
        uint32 communityId,
        string memory topic
    ) external view validCommunity(communityId) returns (bool) {
        return communityTopics[communityId][topic];
    }

    function isMember(
        uint32 communityId,
        address user
    ) external view validCommunity(communityId) returns (bool) {
        return communityMembers[communityId][user];
    }

    function getUserCommunities(
        address user
    ) external view returns (uint32[] memory) {
        return userCommunities[user];
    }

    function getUserActiveCommunities(
        address user
    ) external view returns (Community[] memory) {
        uint32[] memory commIds = userCommunities[user];
        uint32 activeCount = 0;

        // Primero contamos cuántas comunidades activas tiene el usuario
        for (uint256 i = 0; i < commIds.length; i++) {
            uint32 commId = commIds[i];
            if (
                communities[commId].isActive && communityMembers[commId][user]
            ) {
                activeCount++;
            }
        }

        // Creamos el array de resultado
        Community[] memory activeCommunities = new Community[](activeCount);
        uint32 currentIndex = 0;

        // Llenamos el array con las comunidades activas
        for (uint256 i = 0; i < commIds.length; i++) {
            uint32 commId = commIds[i];
            if (
                communities[commId].isActive && communityMembers[commId][user]
            ) {
                activeCommunities[currentIndex] = communities[commId];
                currentIndex++;
            }
        }

        return activeCommunities;
    }

    function getCommunityMemberCount(
        uint32 communityId
    ) external view validCommunity(communityId) returns (uint32) {
        return communityMemberCount[communityId];
    }

    // Incrementar el contador de posts de una comunidad (llamado desde el contrato de posts)
    function incrementPostCount(
        uint32 communityId
    ) external validCommunity(communityId) {
        communities[communityId].postCount++;
    }

    // Verificar que un topic sea válido para una comunidad (llamado desde el contrato de posts)
    function validateTopicForCommunity(
        uint32 communityId,
        string memory topic
    ) external view validCommunity(communityId) returns (bool) {
        return communityTopics[communityId][topic];
    }

    // Obtener el contador actual de comunidades
    function getCommunityCounter() external view returns (uint32) {
        return communityCounter;
    }
}