// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./ForumCommunityManager.sol";
import "./ForumPostManager.sol";

contract DecentralizedForum {
    ForumCommunityManager public communityManager;
    ForumPostManager public postManager;

    constructor() {
        // Primero desplegamos el gestor de comunidades
        communityManager = new ForumCommunityManager();
        
        // Luego desplegamos el gestor de posts, pasándole la dirección del gestor de comunidades
        postManager = new ForumPostManager(address(communityManager));
    }

    // Funciones proxy para comunidades
    function createCommunity(
        string memory contentCID,
        string[] memory initialTopics
    ) external {
        communityManager.createCommunity(contentCID, initialTopics);
    }

    function addTopicToCommunity(uint32 communityId, string memory topic) external {
        communityManager.addTopicToCommunity(communityId, topic);
    }

    function joinCommunity(uint32 communityId) external {
        communityManager.joinCommunity(communityId);
    }
    
    function leaveCommunity(uint32 communityId) external {
        communityManager.leaveCommunity(communityId);
    }

    function deactivateCommunity(uint32 communityId) external {
        communityManager.deactivateCommunity(communityId);
    }

    function getCommunity(uint32 communityId) external view returns (ForumCommunityManager.Community memory) {
        return communityManager.getCommunity(communityId);
    }

    function getActiveCommunities() external view returns (ForumCommunityManager.Community[] memory) {
        return communityManager.getActiveCommunities();
    }

    function getCommunityTopics(uint32 communityId) external view returns (string[] memory) {
        return communityManager.getCommunityTopics(communityId);
    }
    
    function isCommunityTopicValid(uint32 communityId, string memory topic) external view returns (bool) {
        return communityManager.isCommunityTopicValid(communityId, topic);
    }
    
    function isMember(uint32 communityId, address user) external view returns (bool) {
        return communityManager.isMember(communityId, user);
    }
    
    function getUserCommunities(address user) external view returns (uint32[] memory) {
        return communityManager.getUserCommunities(user);
    }
    
    function getUserActiveCommunities(address user) external view returns (ForumCommunityManager.Community[] memory) {
        return communityManager.getUserActiveCommunities(user);
    }
    
    function getCommunityMemberCount(uint32 communityId) external view returns (uint32) {
        return communityManager.getCommunityMemberCount(communityId);
    }

    // Funciones proxy para posts

    function createPost(
        uint32 communityId,
        string memory title,
        string memory contentCID,
        string memory imageCID,
        string memory topic
    ) external {
        postManager.createPost(communityId, title, contentCID, imageCID, topic);
    }

    function likePost(uint32 postId) external {
        postManager.likePost(postId);
    }

    function addComment(uint32 postId, string memory content) external {
        postManager.addComment(postId, content);
    }

    function deactivatePost(uint32 postId) external {
        postManager.deactivatePost(postId);
    }

    function deactivateComment(uint32 postId, uint32 commentId) external {
        postManager.deactivateComment(postId, commentId);
    }

    function getPost(uint32 postId) external view returns (ForumPostManager.Post memory) {
        return postManager.getPost(postId);
    }

    function getComments(uint32 postId) external view returns (ForumPostManager.Comment[] memory) {
        return postManager.getComments(postId);
    }

    function getActivePosts() external view returns (ForumPostManager.Post[] memory) {
        return postManager.getActivePosts();
    }

    function getCommunityPosts(uint32 communityId) external view returns (ForumPostManager.Post[] memory) {
        return postManager.getCommunityPosts(communityId);
    }
}