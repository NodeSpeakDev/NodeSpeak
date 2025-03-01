// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./ForumCommon.sol";
import "./ForumCommunityManager.sol";

contract ForumPostManager {
    address public forumContract;
    
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

    // Referencia al contrato de comunidades
    ForumCommunityManager private communityManager;

    // Contadores
    uint32 private postCounter;
    uint32 private commentCounter;
    
    // Mappings
    mapping(uint32 => Post) public posts; // Mapping de ID de post a struct Post
    mapping(uint32 => Comment[]) public comments; // Mapping de ID de post a array de comentarios
    mapping(uint32 => mapping(address => bool)) public postLikes; // Tracking de likes por post por usuario
    mapping(address => uint256) private lastPostTime; // Prevenir spam

    // Eventos
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

    // Constructor que recibe la dirección del contrato de comunidades
    constructor(address communityManagerAddress) {
        communityManager = ForumCommunityManager(communityManagerAddress);
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

    modifier cooldown(address user) {
        require(
            block.timestamp >= lastPostTime[user] + 1 minutes,
            "Cooldown active"
        );
        _;
        lastPostTime[user] = block.timestamp;
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
    
    // ========== FUNCIONES PARA LLAMADAS DIRECTAS ==========
    // Estas funciones siguen existiendo para mantener compatibilidad

    // Crear un post en una comunidad
    function createPost(
        uint32 communityId,
        string memory title,
        string memory contentCID,
        string memory imageCID,
        string memory topic
    ) external cooldown(msg.sender) validContent(contentCID, topic, title) {
        _createPost(msg.sender, communityId, title, contentCID, imageCID, topic);
    }

    function likePost(uint32 postId) external {
        _likePost(msg.sender, postId);
    }

    function addComment(uint32 postId, string memory content) external {
        _addComment(msg.sender, postId, content);
    }

    function deactivatePost(uint32 postId) external {
        _deactivatePost(msg.sender, postId);
    }

    function deactivateComment(uint32 postId, uint32 commentId) external {
        _deactivateComment(msg.sender, postId, commentId);
    }
    
    // ========== FUNCIONES PARA LLAMADAS DESDE EL CONTRATO PRINCIPAL ==========
    
    // Crear un post para un usuario específico
    function createPostFor(
        address user,
        uint32 communityId,
        string memory title,
        string memory contentCID,
        string memory imageCID,
        string memory topic
    ) external onlyForumContract cooldown(user) validContent(contentCID, topic, title) {
        _createPost(user, communityId, title, contentCID, imageCID, topic);
    }

    function likePostFor(address user, uint32 postId) external onlyForumContract {
        _likePost(user, postId);
    }

    function addCommentFor(address user, uint32 postId, string memory content) external onlyForumContract {
        _addComment(user, postId, content);
    }

    function deactivatePostFor(address user, uint32 postId) external onlyForumContract {
        _deactivatePost(user, postId);
    }

    function deactivateCommentFor(address user, uint32 postId, uint32 commentId) external onlyForumContract {
        _deactivateComment(user, postId, commentId);
    }
    
    // ========== FUNCIONES INTERNAS ==========
    
    // Implementación interna para crear un post
    function _createPost(
        address author,
        uint32 communityId,
        string memory title,
        string memory contentCID,
        string memory imageCID,
        string memory topic
    ) internal {
        // Verificar que el topic sea válido para la comunidad
        require(communityManager.validateTopicForCommunity(communityId, topic), 
            "Topic not allowed in this community");
        
        postCounter++;
        posts[postCounter] = Post(
            postCounter,
            author,
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
        
        // Incrementar contador de posts en la comunidad
        communityManager.incrementPostCount(communityId);
        
        emit PostCreated(postCounter, communityId, author, topic);
    }

    // Implementación interna para dar like a un post
    function _likePost(address user, uint32 postId) internal {
        require(postId > 0 && postId <= postCounter, "Invalid post ID");
        require(posts[postId].isActive, "Post is inactive");
        require(
            !postLikes[postId][user],
            "You have already liked this post"
        );

        postLikes[postId][user] = true;
        posts[postId].likeCount++;

        emit PostLiked(postId, user);
    }

    // Implementación interna para añadir un comentario
    function _addComment(address user, uint32 postId, string memory content) internal {
        require(postId > 0 && postId <= postCounter, "Invalid post ID");
        require(posts[postId].isActive, "Post is inactive");

        commentCounter++;
        comments[postId].push(
            Comment(commentCounter, user, content, block.timestamp, true)
        );
        posts[postId].commentCount++;

        emit CommentAdded(postId, commentCounter, user);
    }

    // Implementación interna para desactivar un post
    function _deactivatePost(address user, uint32 postId) internal {
        require(postId > 0 && postId <= postCounter, "Invalid post ID");
        require(user == posts[postId].author, "Not post owner");
        require(posts[postId].isActive, "Post already inactive");

        posts[postId].isActive = false;
        emit PostDeactivated(postId);
    }

    // Implementación interna para desactivar un comentario
    function _deactivateComment(address user, uint32 postId, uint32 commentId) internal {
        require(postId > 0 && postId <= postCounter, "Invalid post ID");
        
        // Verificar que el comentario exista dentro del post
        Comment[] memory postComments = comments[postId];
        require(commentId > 0 && commentId <= postComments.length, "Invalid comment ID");
        
        // Verificar que el comentario esté activo
        require(
            postComments[commentId - 1].isActive,
            "Comment already inactive"
        );
        
        // Verificar que el usuario sea el propietario del comentario
        require(
            user == postComments[commentId - 1].author,
            "Not comment owner"
        );

        comments[postId][commentId - 1].isActive = false;
        emit CommentDeactivated(postId, commentId);
    }

    // ========== FUNCIONES DE LECTURA (SIN CAMBIOS) ==========
    
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

    function getCommunityPosts(uint32 communityId) external view returns (Post[] memory) {
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
}