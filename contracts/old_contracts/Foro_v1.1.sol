// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract DecentralizedForum {
    struct Post {
        uint32 id;
        address author;
        string title;
        string contentCID; // IPFS CID for content
        string imageCID; // IPFS CID for image (optional)
        string topic;
        uint32 likeCount;
        uint32 commentCount;
        bool isActive;
    }

    struct Comment {
        uint32 id;
        address author;
        string content;
        bool isActive;
    }

    uint32 private postCounter;
    uint32 private commentCounter;
    mapping(uint32 => Post) public posts; // Mapping of post ID to Post struct
    mapping(uint32 => Comment[]) public comments; // Mapping of post ID to array of comments
    mapping(uint32 => mapping(address => bool)) public postLikes; // Tracks likes per post per user
    mapping(address => uint256) private lastPostTime; // Prevent spam

    event PostCreated(
        uint32 indexed postId,
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

    modifier cooldown() {
        require(
            block.timestamp >= lastPostTime[msg.sender] + 1 minutes,
            "Cooldown active"
        );
        _;
        lastPostTime[msg.sender] = block.timestamp;
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

    function createPost(
        string memory title,
        string memory contentCID,
        string memory imageCID,
        string memory topic
    ) external cooldown validContent(contentCID, topic, title) {
        postCounter++;
        posts[postCounter] = Post(
            postCounter,
            msg.sender,
            title,
            contentCID,
            imageCID,
            topic,
            0,
            0,
            true
        );
        emit PostCreated(postCounter, msg.sender, topic);
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
            Comment(commentCounter, msg.sender, content, true)
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

    function getAllPosts() external view returns (Post[] memory) {
        Post[] memory allPosts = new Post[](postCounter);
        for (uint32 i = 1; i <= postCounter; i++) {
            allPosts[i - 1] = posts[i];
        }
        return allPosts;
    }
}
