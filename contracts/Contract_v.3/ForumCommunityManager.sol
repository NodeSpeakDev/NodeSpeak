// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./ForumCommon.sol";

contract ForumCommunityManager {
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

    // Modificadores
    modifier communityCooldown() {
        require(
            block.timestamp >=
                lastCommunityCreationTime[msg.sender] + 5 minutes,
            "Community creation cooldown active"
        );
        _;
        lastCommunityCreationTime[msg.sender] = block.timestamp;
    }

    modifier validCommunity(uint32 communityId) {
        require(
            communityId > 0 && communityId <= communityCounter,
            "Invalid community ID"
        );
        require(communities[communityId].isActive, "Community is inactive");
        _;
    }

    // Crear una nueva comunidad
    function createCommunity(
        string memory contentCID,
        string[] memory initialTopics
    ) external communityCooldown {
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
            msg.sender,
            contentCID,
            initialTopics,
            0,
            true
        );

        // Registrar los tópicos iniciales
        for (uint256 i = 0; i < initialTopics.length; i++) {
            communityTopics[communityCounter][initialTopics[i]] = true;
        }

        emit CommunityCreated(communityCounter, msg.sender);

        // El creador se convierte automáticamente en miembro
        communityMembers[communityCounter][msg.sender] = true;
        userCommunities[msg.sender].push(communityCounter);
        communityMemberCount[communityCounter] = 1;

        emit MemberJoined(communityCounter, msg.sender);
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
        require(
            bytes(topic).length > 0 && bytes(topic).length <= 100,
            "Topic size invalid"
        );
        require(!communityTopics[communityId][topic], "Topic already exists");

        communities[communityId].topics.push(topic);
        communityTopics[communityId][topic] = true;

        emit TopicAdded(communityId, topic);
    }

    // Unirse a una comunidad
    function joinCommunity(
        uint32 communityId
    ) external validCommunity(communityId) {
        require(!communityMembers[communityId][msg.sender], "Already a member");

        communityMembers[communityId][msg.sender] = true;
        userCommunities[msg.sender].push(communityId);
        communityMemberCount[communityId]++;

        emit MemberJoined(communityId, msg.sender);
    }

    // Abandonar una comunidad
    function leaveCommunity(
        uint32 communityId
    ) external validCommunity(communityId) {
        require(communityMembers[communityId][msg.sender], "Not a member");
        require(
            communities[communityId].creator != msg.sender,
            "Creator cannot leave"
        );

        communityMembers[communityId][msg.sender] = false;
        communityMemberCount[communityId]--;

        // Eliminar la comunidad del array de comunidades del usuario
        uint32[] storage userComms = userCommunities[msg.sender];
        for (uint256 i = 0; i < userComms.length; i++) {
            if (userComms[i] == communityId) {
                // Reemplazar con el último elemento y reducir la longitud
                userComms[i] = userComms[userComms.length - 1];
                userComms.pop();
                break;
            }
        }

        emit MemberLeft(communityId, msg.sender);
    }

    function deactivateCommunity(
        uint32 communityId
    ) external validCommunity(communityId) {
        require(
            msg.sender == communities[communityId].creator,
            "Not community creator"
        );

        communities[communityId].isActive = false;
        emit CommunityDeactivated(communityId);
    }

    // Funciones de lectura
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

    // Verificar si un usuario es miembro de una comunidad
    function isMember(
        uint32 communityId,
        address user
    ) external view validCommunity(communityId) returns (bool) {
        return communityMembers[communityId][user];
    }

    // Obtener todas las comunidades a las que pertenece un usuario
    function getUserCommunities(
        address user
    ) external view returns (uint32[] memory) {
        return userCommunities[user];
    }

    // Obtener comunidades activas a las que pertenece un usuario
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

    // Obtener el número de miembros de una comunidad
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
