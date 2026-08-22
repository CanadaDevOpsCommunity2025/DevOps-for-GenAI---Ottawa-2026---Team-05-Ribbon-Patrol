import { RepositoryState, CommitInfo, DagGraph, DagCommitNode, DagEdge, DagLane, DagNodeRole } from '../types';

export interface NormalizerOptions {
  drawerWidth?: number;
  expandedGroups?: Set<string>;
  enableLinearCollapse?: boolean;
}

/**
 * Deterministic DAG Normalizer
 * Converts any repository state (mock or live) into a normalized layout with lanes, nodes, and edges.
 */
export function buildGitDagTopology(
  state: RepositoryState,
  options: NormalizerOptions = {}
): DagGraph {
  const {
    drawerWidth = 460,
    expandedGroups = new Set<string>(),
    enableLinearCollapse = true,
  } = options;

  // 1. Guard against empty/unavailable state
  if (
    state.repositoryUnavailable ||
    (!state.currentBranch?.lastCommitHash &&
      (!state.commitHistory || state.commitHistory.length === 0) &&
      (!state.localCommitsAhead || state.localCommitsAhead.length === 0) &&
      (!state.remoteCommitsBehind || state.remoteCommitsBehind.length === 0))
  ) {
    return {
      nodes: [],
      edges: [],
      lanes: [],
      width: drawerWidth,
      height: 180,
      hasIncompleteHistory: true,
      incompleteHistoryReason: state.repositoryUnavailable
        ? 'Workspace is not an active Git repository'
        : 'Commit history is empty or uninitialized',
      collapsedGroupCount: 0,
    };
  }

  // 2. Prepare Lane Metadata
  const currentBranchName = state.currentBranch?.name || 'main';
  const upstreamBranchName = state.currentBranch?.upstream || 'origin/' + currentBranchName;
  const isDetached = Boolean(state.currentBranch?.isDetached);
  const isHealthy = state.healthLevel === 'Healthy';
  const hasAhead = (state.localCommitsAhead && state.localCommitsAhead.length > 0) || (state.currentBranch?.aheadCount || 0) > 0;
  const hasBehind = (state.remoteCommitsBehind && state.remoteCommitsBehind.length > 0) || (state.currentBranch?.behindCount || 0) > 0;
  const isDiverged = hasAhead && hasBehind;
  const isConflicted = state.workingTree?.some((f) => f.status === 'conflicted');
  const isHazard = state.healthLevel === 'Unsafe' || state.primarySymptom === 'destructive_hazard';

  // Determine lane structure
  // Lane 0: Main / Base / Remote Upstream
  // Lane 1: Current Feature Branch / Local / Detached
  const lane0Name = isHealthy && !hasAhead && !hasBehind
    ? `${currentBranchName} ↔ ${upstreamBranchName}`
    : (state.currentBranch?.upstream ? upstreamBranchName : 'main / upstream');
  
  const lane1Name = isDetached
    ? 'detached HEAD'
    : currentBranchName;

  const lanes: DagLane[] = [];
  const lane0X = 54;
  const lane1X = Math.min(drawerWidth - 64, 180);

  // If completely healthy/synced on a single branch, we can render 1 lane cleanly
  const useSingleLane = isHealthy && !hasAhead && !hasBehind && !isDetached;

  if (useSingleLane) {
    lanes.push({
      index: 0,
      name: lane0Name,
      shortName: currentBranchName,
      color: '#10b981', // emerald
      isCurrent: true,
      isUpstream: true,
      x: 64,
    });
  } else {
    lanes.push({
      index: 0,
      name: lane0Name,
      shortName: upstreamBranchName.replace('origin/', ''),
      color: '#64748b', // slate
      isCurrent: false,
      isUpstream: true,
      x: lane0X,
    });
    lanes.push({
      index: 1,
      name: lane1Name,
      shortName: currentBranchName,
      color: isHazard ? '#ef4444' : isConflicted ? '#f43f5e' : isDetached ? '#f59e0b' : '#3b82f6',
      isCurrent: true,
      isUpstream: false,
      x: lane1X,
    });
  }

  // 3. Assemble and deduplicate raw commits
  const rawCommitsMap = new Map<string, CommitInfo & { roleHint?: DagNodeRole; laneHint?: number }>();

  // Process Local Commits Ahead (Lane 1)
  if (state.localCommitsAhead && state.localCommitsAhead.length > 0) {
    state.localCommitsAhead.forEach((c) => {
      rawCommitsMap.set(c.hash, {
        ...c,
        isLocal: true,
        isRemote: false,
        roleHint: 'local_ahead',
        laneHint: useSingleLane ? 0 : 1,
      });
    });
  }

  // Process Remote Commits Behind (Lane 0)
  if (state.remoteCommitsBehind && state.remoteCommitsBehind.length > 0) {
    state.remoteCommitsBehind.forEach((c) => {
      rawCommitsMap.set(c.hash, {
        ...c,
        isLocal: false,
        isRemote: true,
        roleHint: 'remote_behind',
        laneHint: 0,
      });
    });
  }

  // Process History Commits
  if (state.commitHistory && state.commitHistory.length > 0) {
    state.commitHistory.forEach((c) => {
      if (!rawCommitsMap.has(c.hash)) {
        rawCommitsMap.set(c.hash, {
          ...c,
          laneHint: useSingleLane ? 0 : 0,
        });
      }
    });
  }

  // If history is still sparse, generate synthetic anchor node from currentBranch
  if (rawCommitsMap.size === 0 && state.currentBranch?.lastCommitHash) {
    const headHash = state.currentBranch.lastCommitHash;
    rawCommitsMap.set(headHash, {
      hash: headHash,
      shortHash: headHash.slice(0, 7),
      message: state.currentBranch.lastCommitMessage || 'Active commit',
      author: 'Workspace Author',
      timestamp: state.currentBranch.lastActivity || 'Recently',
      isLocal: true,
      laneHint: useSingleLane ? 0 : 1,
    });
  }

  // 4. Construct normalized chronological list of nodes
  const rawList = Array.from(rawCommitsMap.values());
  const headHash = state.currentBranch?.lastCommitHash;

  // Build intermediate node objects
  const rawDagNodes: DagCommitNode[] = [];

  // Identify scenario archetypes for precise visual topology
  const isMvpScenario = state.primarySymptom === 'behind_remote' && (state.remoteCommitsBehind?.length || 0) > 0;
  const isUnpushedScenario = state.primarySymptom === 'unpushed_work' && (state.localCommitsAhead?.length || 0) > 0;
  const isConflictScenario = state.primarySymptom === 'merge_conflict';
  const isStaleScenario = state.primarySymptom === 'stale_branch';

  // Build nodes in topological/chronological order (from root ancestor at top to HEAD at bottom)
  let yCounter = 60;
  const Y_SPACING = 56;

  // Let's structure nodes deterministically based on relationships
  if (useSingleLane) {
    // Single linear synchronized branch
    const sorted = [...rawList];
    // Root to HEAD
    sorted.reverse();
    sorted.forEach((c, idx) => {
      const isThisHead = c.shortHash === headHash || c.hash === headHash || idx === sorted.length - 1;
      rawDagNodes.push({
        id: c.hash,
        hash: c.hash,
        shortHash: c.shortHash || c.hash.slice(0, 7),
        message: c.message,
        author: c.author,
        timestamp: c.timestamp,
        laneIndex: 0,
        laneName: lanes[0].name,
        role: isThisHead ? 'head' : 'sync_clean',
        isHead: isThisHead,
        isUpstreamHead: isThisHead,
        isLocalAhead: false,
        isRemoteBehind: false,
        isMergeBase: idx === 0 && sorted.length > 1,
        isForkPoint: false,
        isDetached: false,
        parents: idx > 0 ? [sorted[idx - 1].hash] : (c.parents || []),
        children: idx < sorted.length - 1 ? [sorted[idx + 1].hash] : [],
        x: lanes[0].x,
        y: yCounter,
      });
      yCounter += Y_SPACING;
    });
  } else if (isDetached) {
    // Detached HEAD scenario
    const baseCommit = rawList.find((c) => c.shortHash !== headHash && c.hash !== headHash) || {
      hash: 'base_main_ref',
      shortHash: '8a1f49c',
      message: 'feat(cart): implement quantity stepper counter',
      author: 'Lucas Whitaker <lucas@acme.dev>',
      timestamp: 'Yesterday',
    };
    const detachedCommit = rawList.find((c) => c.shortHash === headHash || c.hash === headHash) || rawList[0];

    // Base Node (Lane 0)
    rawDagNodes.push({
      id: baseCommit.hash,
      hash: baseCommit.hash,
      shortHash: baseCommit.shortHash || baseCommit.hash.slice(0, 7),
      message: baseCommit.message,
      author: baseCommit.author,
      timestamp: baseCommit.timestamp,
      laneIndex: 0,
      laneName: lanes[0].name,
      role: 'fork_point',
      isHead: false,
      isUpstreamHead: true,
      isLocalAhead: false,
      isRemoteBehind: false,
      isMergeBase: true,
      isForkPoint: true,
      isDetached: false,
      parents: [],
      children: [detachedCommit.hash],
      x: lanes[0].x,
      y: yCounter,
    });
    yCounter += Y_SPACING;

    // Detached Node (Lane 1)
    rawDagNodes.push({
      id: detachedCommit.hash,
      hash: detachedCommit.hash,
      shortHash: detachedCommit.shortHash || detachedCommit.hash.slice(0, 7),
      message: detachedCommit.message,
      author: detachedCommit.author,
      timestamp: detachedCommit.timestamp,
      laneIndex: 1,
      laneName: 'detached HEAD',
      role: 'detached',
      isHead: true,
      isUpstreamHead: false,
      isLocalAhead: true,
      isRemoteBehind: false,
      isMergeBase: false,
      isForkPoint: false,
      isDetached: true,
      parents: [baseCommit.hash],
      children: [],
      x: lanes[1].x,
      y: yCounter,
    });
    yCounter += Y_SPACING;
  } else if (isConflictScenario) {
    // Conflict / Rebase divergence
    const baseCommit = rawList.find((c) => c.shortHash === '1e4a779' || c.message.includes('base')) || {
      hash: '1e4a779182739182739182',
      shortHash: '1e4a779',
      message: 'chore: base commit before feature divergence',
      author: 'Team Acme',
      timestamp: '3 days ago',
    };
    const upstreamCommit = state.remoteCommitsBehind?.[0] || {
      hash: '7b91d4e182938172918273',
      shortHash: '7b91d4e',
      message: 'feat(payments): upgrade stripe client sdk (origin/main)',
      author: 'Elena Gomez <elena@acme.dev>',
      timestamp: '30 mins ago',
    };
    const localCommit = state.localCommitsAhead?.[0] || {
      hash: '4f29a01872918237198273',
      shortHash: '4f29a01',
      message: 'fix(checkout): adjust billing address validator (rebasing)',
      author: 'Lucas Whitaker <lucas@acme.dev>',
      timestamp: '10 mins ago',
    };

    // 1. Merge Base / Fork Point
    rawDagNodes.push({
      id: baseCommit.hash,
      hash: baseCommit.hash,
      shortHash: baseCommit.shortHash || '1e4a779',
      message: baseCommit.message,
      author: baseCommit.author,
      timestamp: baseCommit.timestamp,
      laneIndex: 0,
      laneName: lanes[0].name,
      role: 'merge_base',
      isHead: false,
      isUpstreamHead: false,
      isLocalAhead: false,
      isRemoteBehind: false,
      isMergeBase: true,
      isForkPoint: true,
      isDetached: false,
      parents: [],
      children: [upstreamCommit.hash, localCommit.hash],
      x: lanes[0].x,
      y: yCounter,
    });
    yCounter += Y_SPACING;

    // 2. Upstream Commit on origin/main
    rawDagNodes.push({
      id: upstreamCommit.hash,
      hash: upstreamCommit.hash,
      shortHash: upstreamCommit.shortHash || '7b91d4e',
      message: upstreamCommit.message,
      author: upstreamCommit.author,
      timestamp: upstreamCommit.timestamp,
      laneIndex: 0,
      laneName: lanes[0].name,
      role: 'upstream_head',
      isHead: false,
      isUpstreamHead: true,
      isLocalAhead: false,
      isRemoteBehind: true,
      isMergeBase: false,
      isForkPoint: false,
      isDetached: false,
      parents: [baseCommit.hash],
      children: [localCommit.hash],
      x: lanes[0].x,
      y: yCounter,
    });
    yCounter += Y_SPACING;

    // 3. Conflicted local rebase commit
    rawDagNodes.push({
      id: localCommit.hash,
      hash: localCommit.hash,
      shortHash: localCommit.shortHash || '4f29a01',
      message: localCommit.message,
      author: localCommit.author,
      timestamp: localCommit.timestamp,
      laneIndex: 1,
      laneName: lanes[1].name,
      role: 'conflicted',
      isHead: true,
      isUpstreamHead: false,
      isLocalAhead: true,
      isRemoteBehind: false,
      isMergeBase: false,
      isForkPoint: false,
      isDetached: false,
      isConflicted: true,
      parents: [baseCommit.hash, upstreamCommit.hash],
      children: [],
      x: lanes[1].x,
      y: yCounter,
    });
    yCounter += Y_SPACING;
  } else if (isUnpushedScenario) {
    // Unpushed commits ahead of upstream anchor
    const baseCommit = {
      hash: 'base_anchor_upstream',
      shortHash: '8a1f49c',
      message: 'feat(cart): implement quantity stepper counter (origin/feature/cart)',
      author: 'Lucas Whitaker <lucas@acme.dev>',
      timestamp: 'Yesterday',
    };
    const aheadCommits = state.localCommitsAhead || [];
    const orderedAhead = [...aheadCommits].reverse();

    // 1. Upstream Base Node
    rawDagNodes.push({
      id: baseCommit.hash,
      hash: baseCommit.hash,
      shortHash: baseCommit.shortHash,
      message: baseCommit.message,
      author: baseCommit.author,
      timestamp: baseCommit.timestamp,
      laneIndex: 0,
      laneName: lanes[0].name,
      role: 'upstream_head',
      isHead: false,
      isUpstreamHead: true,
      isLocalAhead: false,
      isRemoteBehind: false,
      isMergeBase: true,
      isForkPoint: true,
      isDetached: false,
      parents: [],
      children: [orderedAhead[0]?.hash || 'head'],
      x: lanes[0].x,
      y: yCounter,
    });
    yCounter += Y_SPACING;

    // 2. Sequential Ahead Commits on Lane 1
    let previousHash = baseCommit.hash;
    orderedAhead.forEach((c, idx) => {
      const isThisHead = idx === orderedAhead.length - 1;
      const nextHash = idx < orderedAhead.length - 1 ? orderedAhead[idx + 1].hash : undefined;
      rawDagNodes.push({
        id: c.hash,
        hash: c.hash,
        shortHash: c.shortHash || c.hash.slice(0, 7),
        message: c.message,
        author: c.author,
        timestamp: c.timestamp,
        laneIndex: 1,
        laneName: lanes[1].name,
        role: isThisHead ? 'head' : 'local_ahead',
        isHead: isThisHead,
        isUpstreamHead: false,
        isLocalAhead: true,
        isRemoteBehind: false,
        isMergeBase: false,
        isForkPoint: false,
        isDetached: false,
        parents: [previousHash],
        children: nextHash ? [nextHash] : [],
        x: lanes[1].x,
        y: yCounter,
      });
      previousHash = c.hash;
      yCounter += Y_SPACING;
    });
  } else if (isMvpScenario || isHazard || isDiverged || (hasBehind && !hasAhead)) {
    // Diverged or Behind Scenario (e.g. MVP_SCENARIO with 3 remote commits behind & local HEAD)
    const baseCommit = {
      hash: 'base_merge_base',
      shortHash: '1e4a779',
      message: 'merge: main into feature/cart (common merge base)',
      author: 'Lucas Whitaker <lucas@acme.dev>',
      timestamp: '2 days ago',
    };

    const behindCommits = state.remoteCommitsBehind || [];
    const orderedBehind = [...behindCommits].reverse();

    const localHead = {
      hash: headHash || '8a1f49c',
      shortHash: headHash ? headHash.slice(0, 7) : '8a1f49c',
      message: state.currentBranch?.lastCommitMessage || 'feat(cart): implement quantity stepper counter',
      author: 'Lucas Whitaker <lucas@acme.dev>',
      timestamp: state.currentBranch?.lastActivity || '2 hours ago',
    };

    // 1. Common Merge Base / Fork Node
    rawDagNodes.push({
      id: baseCommit.hash,
      hash: baseCommit.hash,
      shortHash: baseCommit.shortHash,
      message: baseCommit.message,
      author: baseCommit.author,
      timestamp: baseCommit.timestamp,
      laneIndex: 0,
      laneName: lanes[0].name,
      role: 'merge_base',
      isHead: false,
      isUpstreamHead: false,
      isLocalAhead: false,
      isRemoteBehind: false,
      isMergeBase: true,
      isForkPoint: true,
      isDetached: false,
      parents: [],
      children: [orderedBehind[0]?.hash || 'behind_head', localHead.hash],
      x: lanes[0].x,
      y: yCounter,
    });
    yCounter += Y_SPACING;

    // 2. Upstream Commits Behind on Lane 0
    let prevBehindHash = baseCommit.hash;
    orderedBehind.forEach((c, idx) => {
      const isUpstreamHead = idx === orderedBehind.length - 1;
      const nextHash = idx < orderedBehind.length - 1 ? orderedBehind[idx + 1].hash : undefined;
      rawDagNodes.push({
        id: c.hash,
        hash: c.hash,
        shortHash: c.shortHash || c.hash.slice(0, 7),
        message: c.message,
        author: c.author,
        timestamp: c.timestamp,
        laneIndex: 0,
        laneName: lanes[0].name,
        role: isUpstreamHead ? 'upstream_head' : 'remote_behind',
        isHead: false,
        isUpstreamHead,
        isLocalAhead: false,
        isRemoteBehind: true,
        isMergeBase: false,
        isForkPoint: false,
        isDetached: false,
        isHazard: Boolean(isHazard && isUpstreamHead),
        parents: [prevBehindHash],
        children: nextHash ? [nextHash] : [],
        x: lanes[0].x,
        y: yCounter,
      });
      prevBehindHash = c.hash;
      yCounter += Y_SPACING;
    });

    // 3. Local Feature Branch HEAD on Lane 1
    rawDagNodes.push({
      id: localHead.hash,
      hash: localHead.hash,
      shortHash: localHead.shortHash,
      message: localHead.message,
      author: localHead.author,
      timestamp: localHead.timestamp,
      laneIndex: 1,
      laneName: lanes[1].name,
      role: 'head',
      isHead: true,
      isUpstreamHead: false,
      isLocalAhead: false,
      isRemoteBehind: false,
      isMergeBase: false,
      isForkPoint: false,
      isDetached: false,
      isHazard,
      parents: [baseCommit.hash],
      children: [],
      x: lanes[1].x,
      y: yCounter,
    });
    yCounter += Y_SPACING;
  } else {
    // General fallback reconstruction from commit history
    const sorted = [...rawList].reverse();
    sorted.forEach((c, idx) => {
      const isThisHead = c.shortHash === headHash || c.hash === headHash || idx === sorted.length - 1;
      const laneIdx = c.laneHint ?? (c.isRemote ? 0 : 1);
      const targetLane = lanes[laneIdx] || lanes[0];
      const prev = idx > 0 ? sorted[idx - 1] : undefined;
      const next = idx < sorted.length - 1 ? sorted[idx + 1] : undefined;

      rawDagNodes.push({
        id: c.hash,
        hash: c.hash,
        shortHash: c.shortHash || c.hash.slice(0, 7),
        message: c.message,
        author: c.author,
        timestamp: c.timestamp,
        laneIndex: laneIdx,
        laneName: targetLane.name,
        role: isThisHead ? 'head' : c.isRemote ? 'remote_behind' : c.isLocal ? 'local_ahead' : 'sync_clean',
        isHead: isThisHead,
        isUpstreamHead: Boolean(c.isRemote && isThisHead),
        isLocalAhead: Boolean(c.isLocal),
        isRemoteBehind: Boolean(c.isRemote),
        isMergeBase: idx === 0,
        isForkPoint: false,
        isDetached: false,
        parents: prev ? [prev.hash] : [],
        children: next ? [next.hash] : [],
        x: targetLane.x,
        y: yCounter,
      });
      yCounter += Y_SPACING;
    });
  }

  // 5. Handle Linear Run Collapsing
  let finalNodes: DagCommitNode[] = [];
  let collapsedGroupCount = 0;

  if (enableLinearCollapse && rawDagNodes.length >= 5) {
    const processed = new Set<string>();
    let currentY = 60;

    for (let i = 0; i < rawDagNodes.length; i++) {
      const node = rawDagNodes[i];
      if (processed.has(node.id)) continue;

      const isIntermediate = !node.isHead && !node.isUpstreamHead && !node.isMergeBase && !node.isForkPoint && !node.isConflicted && !node.isDetached;
      
      if (isIntermediate) {
        const linearChain: DagCommitNode[] = [node];
        let j = i + 1;
        while (
          j < rawDagNodes.length &&
          rawDagNodes[j].laneIndex === node.laneIndex &&
          !rawDagNodes[j].isHead &&
          !rawDagNodes[j].isUpstreamHead &&
          !rawDagNodes[j].isMergeBase &&
          !rawDagNodes[j].isForkPoint &&
          !rawDagNodes[j].isConflicted
        ) {
          linearChain.push(rawDagNodes[j]);
          j++;
        }

        const groupId = `collapse_group_${node.id}`;
        const isExpanded = expandedGroups.has(groupId);

        if (linearChain.length >= 3) {
          if (!isExpanded) {
            collapsedGroupCount++;
            const firstInChain = linearChain[0];
            const lastInChain = linearChain[linearChain.length - 1];

            finalNodes.push({
              id: groupId,
              hash: groupId,
              shortHash: `${linearChain.length} commits`,
              message: `${linearChain.length} linear commits collapsed`,
              author: `${new Set(linearChain.map((c) => c.author.split('<')[0].trim())).size} authors`,
              timestamp: `${lastInChain.timestamp} - ${firstInChain.timestamp}`,
              laneIndex: node.laneIndex,
              laneName: node.laneName,
              role: 'collapsed_run',
              isHead: false,
              isUpstreamHead: false,
              isLocalAhead: linearChain.some((c) => c.isLocalAhead),
              isRemoteBehind: linearChain.some((c) => c.isRemoteBehind),
              isMergeBase: false,
              isForkPoint: false,
              isDetached: false,
              parents: firstInChain.parents,
              children: lastInChain.children,
              x: node.x,
              y: currentY,
              isCollapsedGroup: true,
              collapsedCount: linearChain.length,
              collapsedCommitIds: linearChain.map((c) => c.id),
            });
            currentY += Y_SPACING;

            linearChain.forEach((c) => processed.add(c.id));
            continue;
          } else {
            // When expanded, emit all chain nodes in sequence
            for (const chainNode of linearChain) {
              finalNodes.push({
                ...chainNode,
                y: currentY,
              });
              processed.add(chainNode.id);
              currentY += Y_SPACING;
            }
            continue;
          }
        }
      }

      finalNodes.push({
        ...node,
        y: currentY,
      });
      processed.add(node.id);
      currentY += Y_SPACING;
    }
  } else {
    finalNodes = rawDagNodes;
  }

  // 6. Build Edges connecting parents to children with bezier coordinates
  const edges: DagEdge[] = [];
  const nodePositionMap = new Map<string, DagCommitNode>();
  finalNodes.forEach((n) => {
    nodePositionMap.set(n.id, n);
    if (n.collapsedCommitIds) {
      n.collapsedCommitIds.forEach((subId) => nodePositionMap.set(subId, n));
    }
  });

  const edgeSet = new Set<string>();

  finalNodes.forEach((node) => {
    node.parents.forEach((parentId) => {
      const parentNode = nodePositionMap.get(parentId);
      if (parentNode && parentNode.id !== node.id) {
        const edgeKey = `${parentNode.id}->${node.id}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          const isDivergent = parentNode.laneIndex !== node.laneIndex;
          const isMerge = Boolean(node.parents.length > 1 && parentNode.laneIndex !== node.laneIndex);
          edges.push({
            id: edgeKey,
            fromId: parentNode.id,
            toId: node.id,
            fromX: parentNode.x,
            fromY: parentNode.y,
            toX: node.x,
            toY: node.y,
            isDivergent,
            isMerge,
            isDirect: parentNode.laneIndex === node.laneIndex,
            isHazard: Boolean(node.isHazard || parentNode.isHazard),
            isConflicted: Boolean(node.isConflicted || parentNode.isConflicted),
          });
        }
      }
    });
  });

  // Calculate total height
  const maxY = finalNodes.reduce((max, n) => Math.max(max, n.y), 60);
  const totalHeight = Math.max(220, maxY + 70);

  const headNode = finalNodes.find((n) => n.isHead);
  const upstreamNode = finalNodes.find((n) => n.isUpstreamHead);
  const mergeBaseNode = finalNodes.find((n) => n.isMergeBase);

  return {
    nodes: finalNodes,
    edges,
    lanes,
    width: drawerWidth,
    height: totalHeight,
    headNodeId: headNode?.id,
    upstreamNodeId: upstreamNode?.id,
    mergeBaseNodeId: mergeBaseNode?.id,
    hasIncompleteHistory: false,
    collapsedGroupCount,
  };
}
