// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

contract JointAccountNetwork {
    struct User {
        bool exists;
        string name;
        uint256[] neighbors;
    }

    struct Channel {
        bool exists;
        uint256 userA;
        uint256 userB;
        uint256 balanceA;
        uint256 balanceB;
    }

    mapping(uint256 => User) private users;
    mapping(uint256 => mapping(uint256 => Channel)) private channels;

    uint256[] private userIds;
    mapping(uint256 => uint256) private userIndexPlusOne;

    event UserRegistered(uint256 indexed userId, string userName);
    event AccountCreated(
        uint256 indexed userId1,
        uint256 indexed userId2,
        uint256 contribution1,
        uint256 contribution2
    );
    event AmountSent(uint256 indexed fromUserId, uint256 indexed toUserId, uint256 amount, uint256[] path);
    event AccountClosed(uint256 indexed userId1, uint256 indexed userId2);

    function registerUser(uint256 userId, string calldata userName) external {
        require(!users[userId].exists, "User already registered");

        users[userId].exists = true;
        users[userId].name = userName;

        userIds.push(userId);
        userIndexPlusOne[userId] = userIds.length;

        emit UserRegistered(userId, userName);
    }

    function createAcc(
        uint256 userId1,
        uint256 userId2,
        uint256 contribution1,
        uint256 contribution2
    ) external {
        require(userId1 != userId2, "Cannot create self account");
        require(users[userId1].exists && users[userId2].exists, "User not found");

        (uint256 low, uint256 high, bool firstIsLow) = _orderedUsers(userId1, userId2);
        require(!channels[low][high].exists, "Account already exists");

        channels[low][high] = Channel({
            exists: true,
            userA: low,
            userB: high,
            balanceA: firstIsLow ? contribution1 : contribution2,
            balanceB: firstIsLow ? contribution2 : contribution1
        });

        users[userId1].neighbors.push(userId2);
        users[userId2].neighbors.push(userId1);

        emit AccountCreated(userId1, userId2, contribution1, contribution2);
    }

    function sendAmount(uint256 fromUserId, uint256 toUserId, uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(users[fromUserId].exists && users[toUserId].exists, "User not found");

        uint256[] memory path = _getShortestPath(fromUserId, toUserId);
        require(path.length > 0, "No path found");

        for (uint256 i = 0; i + 1 < path.length; i++) {
            require(_balanceOf(path[i], path[i + 1], path[i]) >= amount, "Insufficient balance on path");
        }

        for (uint256 i = 0; i + 1 < path.length; i++) {
            _transferOnChannel(path[i], path[i + 1], amount);
        }

        emit AmountSent(fromUserId, toUserId, amount, path);
    }

    function closeAccount(uint256 userId1, uint256 userId2) external {
        require(userId1 != userId2, "Invalid users");

        (uint256 low, uint256 high, ) = _orderedUsers(userId1, userId2);
        require(channels[low][high].exists, "Account does not exist");

        delete channels[low][high];

        _removeNeighbor(userId1, userId2);
        _removeNeighbor(userId2, userId1);

        emit AccountClosed(userId1, userId2);
    }

    function getShortestPath(uint256 fromUserId, uint256 toUserId) external view returns (uint256[] memory) {
        require(users[fromUserId].exists && users[toUserId].exists, "User not found");
        return _getShortestPath(fromUserId, toUserId);
    }

    function getContribution(
        uint256 userId1,
        uint256 userId2,
        uint256 ownerUserId
    ) external view returns (uint256) {
        require(ownerUserId == userId1 || ownerUserId == userId2, "Owner must be one endpoint");
        require(userId1 != userId2, "Invalid users");

        (uint256 low, uint256 high, ) = _orderedUsers(userId1, userId2);
        Channel storage c = channels[low][high];
        require(c.exists, "Account does not exist");

        if (ownerUserId == c.userA) {
            return c.balanceA;
        }

        return c.balanceB;
    }

    function getUser(uint256 userId) external view returns (bool exists, string memory userName, uint256 degree) {
        User storage u = users[userId];
        return (u.exists, u.name, u.neighbors.length);
    }

    function getNeighbors(uint256 userId) external view returns (uint256[] memory) {
        require(users[userId].exists, "User not found");
        return users[userId].neighbors;
    }

    function _orderedUsers(
        uint256 userId1,
        uint256 userId2
    ) private pure returns (uint256 low, uint256 high, bool firstIsLow) {
        if (userId1 < userId2) {
            return (userId1, userId2, true);
        }

        return (userId2, userId1, false);
    }

    function _balanceOf(uint256 userId1, uint256 userId2, uint256 ownerUserId) private view returns (uint256) {
        (uint256 low, uint256 high, ) = _orderedUsers(userId1, userId2);
        Channel storage c = channels[low][high];
        require(c.exists, "Channel missing");

        if (ownerUserId == c.userA) {
            return c.balanceA;
        }

        require(ownerUserId == c.userB, "Owner not part of channel");
        return c.balanceB;
    }

    function _transferOnChannel(uint256 senderUserId, uint256 receiverUserId, uint256 amount) private {
        (uint256 low, uint256 high, ) = _orderedUsers(senderUserId, receiverUserId);
        Channel storage c = channels[low][high];
        require(c.exists, "Channel missing");

        if (senderUserId == c.userA) {
            c.balanceA -= amount;
            c.balanceB += amount;
        } else {
            require(senderUserId == c.userB, "Invalid sender");
            c.balanceB -= amount;
            c.balanceA += amount;
        }
    }

    function _removeNeighbor(uint256 userId, uint256 neighborId) private {
        uint256[] storage list = users[userId].neighbors;
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == neighborId) {
                list[i] = list[list.length - 1];
                list.pop();
                return;
            }
        }
    }

    function _getShortestPath(uint256 fromUserId, uint256 toUserId) private view returns (uint256[] memory) {
        if (fromUserId == toUserId) {
            uint256[] memory trivialPath = new uint256[](1);
            trivialPath[0] = fromUserId;
            return trivialPath;
        }

        uint256 n = userIds.length;
        if (n == 0) {
            return new uint256[](0);
        }

        uint256 fromIdxPlusOne = userIndexPlusOne[fromUserId];
        uint256 toIdxPlusOne = userIndexPlusOne[toUserId];
        if (fromIdxPlusOne == 0 || toIdxPlusOne == 0) {
            return new uint256[](0);
        }

        uint256 fromIdx = fromIdxPlusOne - 1;
        uint256 toIdx = toIdxPlusOne - 1;

        bool[] memory visited = new bool[](n);
        int256[] memory parent = _initParent(n);
        uint256[] memory queue = new uint256[](n);

        uint256 head = 0;
        uint256 tail = 1;
        visited[fromIdx] = true;
        queue[0] = fromIdx;

        while (head < tail) {
            uint256 currentIdx = queue[head];
            head++;

            bool found;
            (tail, found) = _visitNeighbors(
                users[userIds[currentIdx]].neighbors,
                currentIdx,
                toIdx,
                visited,
                parent,
                queue,
                tail
            );

            if (found) {
                return _reconstructPath(fromIdx, toIdx, parent);
            }
        }

        return new uint256[](0);
    }

    function _initParent(uint256 n) private pure returns (int256[] memory parent) {
        parent = new int256[](n);
        for (uint256 i = 0; i < n; i++) {
            parent[i] = -1;
        }
    }

    function _visitNeighbors(
        uint256[] storage nbrs,
        uint256 currentIdx,
        uint256 toIdx,
        bool[] memory visited,
        int256[] memory parent,
        uint256[] memory queue,
        uint256 tail
    ) private view returns (uint256 updatedTail, bool found) {
        updatedTail = tail;
        for (uint256 i = 0; i < nbrs.length; i++) {
            uint256 idxPlusOne = userIndexPlusOne[nbrs[i]];
            if (idxPlusOne == 0) {
                continue;
            }

            uint256 neighborIdx = idxPlusOne - 1;
            if (visited[neighborIdx]) {
                continue;
            }

            visited[neighborIdx] = true;
            parent[neighborIdx] = int256(currentIdx);
            queue[updatedTail] = neighborIdx;
            updatedTail++;

            if (neighborIdx == toIdx) {
                return (updatedTail, true);
            }
        }
        return (updatedTail, false);
    }

    function _reconstructPath(
        uint256 fromIdx,
        uint256 toIdx,
        int256[] memory parent
    ) private view returns (uint256[] memory) {
        uint256 pathLen = 1;
        int256 cursor = int256(toIdx);

        while (uint256(cursor) != fromIdx) {
            cursor = parent[uint256(cursor)];
            if (cursor < 0) {
                return new uint256[](0);
            }
            pathLen++;
        }

        uint256[] memory path = new uint256[](pathLen);
        cursor = int256(toIdx);

        for (uint256 i = pathLen; i > 0; i--) {
            path[i - 1] = userIds[uint256(cursor)];
            if (i > 1) {
                cursor = parent[uint256(cursor)];
            }
        }

        return path;
    }
}
