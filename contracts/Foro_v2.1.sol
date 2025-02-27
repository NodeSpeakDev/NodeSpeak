// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract DecentralizedForum {
    struct Community {
        uint32 id;
        address creator;
        string contentCID; // IPFS CID para nombre y descripción
        string[] topics; // Tópicos específicos de esta comunidad
        uint32 postCount;
        bool isActive;
    }

    struct Post {
        uint32 id;
        address author;
        string title;
        string contentCID; // IPFS CID para contenido
        string imageCID; // IPFS CID para imagen (opcional)
        string topic;
        uint32 communityId; // ID de la comunidad a la que pertenece
        uint32 likeCount;
        uint32 commentCount;
        uint256 timestamp; // Timestamp de creación
        bool isActive;
    }

    struct Comment {
        uint32 id;
        address author;
        string content;
        uint256 timestamp; // Timestamp de creación
        bool isActive;
    }

    uint32 private communityCounter;
    uint32 private postCounter;
    uint32 private commentCounter;
    
    mapping(uint32 => Community) public communities; // Mapping de ID de comunidad a struct Community
    mapping(uint32 => Post) public posts; // Mapping de ID de post a struct Post
    mapping(uint32 => mapping(string => bool)) public communityTopics; // Tracking de tópicos por comunidad
    mapping(uint32 => Comment[]) public comments; // Mapping de ID de post a array de comentarios
    mapping(uint32 => mapping(address => bool)) public postLikes; // Tracking de likes por post por usuario
    mapping(address => uint256) private lastPostTime; // Prevenir spam
    mapping(address => uint256) private lastCommunityCreationTime; // Prevenir spam de creación de comunidades
    mapping(uint32 => mapping(address => bool)) public communityMembers; // Miembros de cada comunidad
    mapping(address => uint32[]) private userCommunities; // Comunidades a las que pertenece cada usuario
    mapping(uint32 => uint32) public communityMemberCount; // Contador de miembros por comunidad

    event CommunityCreated(
        uint32 indexed communityId,
        address indexed creator
    );
    
    event TopicAdded(
        uint32 indexed communityId,
        string topic
    );

    event PostCreated(
        uint32 indexed postId,
        uint32 indexed communityId,
        address indexed author,
        string topic
    );
    
    event CommentAdded(
        uint32 indexed postId,
        uint32 indexed commentId,
        address indexed author
    );
    
    event PostLiked(uint32 indexed postId, address indexed liker);
    
    event PostDeactivated(uint32 indexed postId);
    
    event CommentDeactivated(uint32 indexed postId, uint32 indexed commentId);
    
    event CommunityDeactivated(uint32 indexed communityId);
    
    event MemberJoined(uint32 indexed communityId, address indexed member);
    
    event MemberLeft(uint32 indexed communityId, address indexed member);

    modifier cooldown() {
        require(
            block.timestamp >= lastPostTime[msg.sender] + 1 minutes,
            "Cooldown active"
        );
        _;
        lastPostTime[msg.sender] = block.timestamp;
    }

    modifier communityCooldown() {
        require(
            block.timestamp >= lastCommunityCreationTime[msg.sender] + 1 days,
            "Community creation cooldown active"
        );
        _;
        lastCommunityCreationTime[msg.sender] = block.timestamp;
    }

    modifier validContent(
        string memory contentCID,
        string memory topic,
        string memory title
    ) {
        require(
            bytes(title).length > 0 && bytes(title).length <= 100,
            "Title size invalid"
        );
        require(bytes(contentCID).length > 0, "Content CID invalid");
        require(
            bytes(topic).length > 0 && bytes(topic).length <= 100,
            "Topic size invalid"
        );
        _;
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
            require(bytes(initialTopics[i]).length > 0, "Empty topic not allowed");
            for (uint256 j = i + 1; j < initialTopics.length; j++) {
                require(
                    keccak256(abi.encodePacked(initialTopics[i])) != keccak256(abi.encodePacked(initialTopics[j])),
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
    
    // Unirse a una comunidad
    function joinCommunity(uint32 communityId) external validCommunity(communityId) {
        require(!communityMembers[communityId][msg.sender], "Already a member");
        
        communityMembers[communityId][msg.sender] = true;
        userCommunities[msg.sender].push(communityId);
        communityMemberCount[communityId]++;
        
        emit MemberJoined(communityId, msg.sender);
    }
    
    // Abandonar una comunidad
    function leaveCommunity(uint32 communityId) external validCommunity(communityId) {
        require(communityMembers[communityId][msg.sender], "Not a member");
        require(communities[communityId].creator != msg.sender, "Creator cannot leave");
        
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

    // Añadir un nuevo tópico a una comunidad existente
    function addTopicToCommunity(uint32 communityId, string memory topic) external validCommunity(communityId) {
        require(msg.sender == communities[communityId].creator, "Not community creator");
        require(bytes(topic).length > 0 && bytes(topic).length <= 100, "Topic size invalid");
        require(!communityTopics[communityId][topic], "Topic already exists");
        
        communities[communityId].topics.push(topic);
        communityTopics[communityId][topic] = true;
        
        emit TopicAdded(communityId, topic);
    }

    // Crear un post en una comunidad
    function createPost(
        uint32 communityId,
        string memory title,
        string memory contentCID,
        string memory imageCID,
        string memory topic
    ) external cooldown validContent(contentCID, topic, title) validCommunity(communityId) {
        require(communityTopics[communityId][topic], "Topic not allowed in this community");
        
        postCounter++;
        posts[postCounter] = Post(
            postCounter,
            msg.sender,
            title,
            contentCID,
            imageCID,
            topic,
            communityId,
            0,
            0,
            block.timestamp,
            true
        );
        
        communities[communityId].postCount++;
        
        emit PostCreated(postCounter, communityId, msg.sender, topic);
    }

    function likePost(uint32 postId) external {
        require(postId > 0 && postId <= postCounter, "Invalid post ID");
        require(posts[postId].isActive, "Post is inactive");
        require(
            !postLikes[postId][msg.sender],
            "You have already liked this post"
        );

        postLikes[postId][msg.sender] = true;
        posts[postId].likeCount++;

        emit PostLiked(postId, msg.sender);
    }

    function addComment(uint32 postId, string memory content) external {
        require(postId > 0 && postId <= postCounter, "Invalid post ID");
        require(posts[postId].isActive, "Post is inactive");

        commentCounter++;
        comments[postId].push(
            Comment(commentCounter, msg.sender, content, block.timestamp, true)
        );
        posts[postId].commentCount++;

        emit CommentAdded(postId, commentCounter, msg.sender);
    }

    function deactivatePost(uint32 postId) external {
        require(postId > 0 && postId <= postCounter, "Invalid post ID");
        require(msg.sender == posts[postId].author, "Not post owner");
        require(posts[postId].isActive, "Post already inactive");

        posts[postId].isActive = false;
        emit PostDeactivated(postId);
    }

    function deactivateComment(uint32 postId, uint32 commentId) external {
        require(postId > 0 && postId <= postCounter, "Invalid post ID");
        require(
            commentId > 0 && commentId <= posts[postId].commentCount,
            "Invalid comment ID"
        );
        require(
            comments[postId][commentId - 1].isActive,
            "Comment already inactive"
        );
        require(
            msg.sender == comments[postId][commentId - 1].author,
            "Not comment owner"
        );

        comments[postId][commentId - 1].isActive = false;
        emit CommentDeactivated(postId, commentId);
    }

    function deactivateCommunity(uint32 communityId) external validCommunity(communityId) {
        require(msg.sender == communities[communityId].creator, "Not community creator");
        
        communities[communityId].isActive = false;
        emit CommunityDeactivated(communityId);
    }

    function getPost(uint32 postId) external view returns (Post memory) {
        require(postId > 0 && postId <= postCounter, "Invalid post ID");
        return posts[postId];
    }

    function getComments(
        uint32 postId
    ) external view returns (Comment[] memory) {
        require(postId > 0 && postId <= postCounter, "Invalid post ID");
        return comments[postId];
    }

    function getCommunity(uint32 communityId) external view returns (Community memory) {
        require(communityId > 0 && communityId <= communityCounter, "Invalid community ID");
        return communities[communityId];
    }

    function getActivePosts() external view returns (Post[] memory) {
        uint32 count = 0;
        
        for (uint32 i = 1; i <= postCounter; i++) {
            if (posts[i].isActive) {
                count++;
            }
        }
        
        Post[] memory activePosts = new Post[](count);
        uint32 currentIndex = 0;
        
        for (uint32 i = 1; i <= postCounter; i++) {
            if (posts[i].isActive) {
                activePosts[currentIndex] = posts[i];
                currentIndex++;
            }
        }
        
        return activePosts;
    }

    function getCommunityPosts(uint32 communityId) external view validCommunity(communityId) returns (Post[] memory) {
        uint32 count = 0;
        
        for (uint32 i = 1; i <= postCounter; i++) {
            if (posts[i].communityId == communityId && posts[i].isActive) {
                count++;
            }
        }
        
        Post[] memory communityPosts = new Post[](count);
        uint32 currentIndex = 0;
        
        for (uint32 i = 1; i <= postCounter; i++) {
            if (posts[i].communityId == communityId && posts[i].isActive) {
                communityPosts[currentIndex] = posts[i];
                currentIndex++;
            }
        }
        
        return communityPosts;
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

    function getCommunityTopics(uint32 communityId) external view validCommunity(communityId) returns (string[] memory) {
        return communities[communityId].topics;
    }
    
    function isCommunityTopicValid(uint32 communityId, string memory topic) external view validCommunity(communityId) returns (bool) {
        return communityTopics[communityId][topic];
    }
    
    // Verificar si un usuario es miembro de una comunidad
    function isMember(uint32 communityId, address user) external view validCommunity(communityId) returns (bool) {
        return communityMembers[communityId][user];
    }
    
    // Obtener todas las comunidades a las que pertenece un usuario
    function getUserCommunities(address user) external view returns (uint32[] memory) {
        return userCommunities[user];
    }
    
    // Obtener comunidades activas a las que pertenece un usuario
    function getUserActiveCommunities(address user) external view returns (Community[] memory) {
        uint32[] memory commIds = userCommunities[user];
        uint32 activeCount = 0;
        
        // Primero contamos cuántas comunidades activas tiene el usuario
        for (uint256 i = 0; i < commIds.length; i++) {
            uint32 commId = commIds[i];
            if (communities[commId].isActive && communityMembers[commId][user]) {
                activeCount++;
            }
        }
        
        // Creamos el array de resultado
        Community[] memory activeCommunities = new Community[](activeCount);
        uint32 currentIndex = 0;
        
        // Llenamos el array con las comunidades activas
        for (uint256 i = 0; i < commIds.length; i++) {
            uint32 commId = commIds[i];
            if (communities[commId].isActive && communityMembers[commId][user]) {
                activeCommunities[currentIndex] = communities[commId];
                currentIndex++;
            }
        }
        
        return activeCommunities;
    }
    
    // Obtener el número de miembros de una comunidad
    function getCommunityMemberCount(uint32 communityId) external view validCommunity(communityId) returns (uint32) {
        return communityMemberCount[communityId];
    }
}