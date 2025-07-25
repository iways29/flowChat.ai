import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Components
import { EmptyState } from './components/UI/EmptyState.tsx';
import { ChatPanel } from './components/Chat/ChatPanel.tsx';
import { FlowCanvas } from './components/Flow/FlowCanvas.tsx';

// Hooks
import { useConversations } from './hooks/useConversations.ts';
import { useFlowElements } from './hooks/useFlowElements.ts';
import { useMessageOperations } from './hooks/useMessageOperations.ts';
import { usePanelManager } from './components/Layout/PanelManager.tsx';

// Authentication
import { useAuth } from './hooks/useAuth.ts';

const FlowChatAI: React.FC = () => {
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY EARLY RETURNS
  const { user, loading } = useAuth();
  
  // Core state management
  const conversationHook = useConversations([]);
  const panelManager = usePanelManager();
  
  // UI state
  const [selectedMessageId, setSelectedMessageId] = useState('');
  const [selectedNodes, setSelectedNodes] = useState(new Set<string>());
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [bookmarkedNodes, setBookmarkedNodes] = useState(new Set<string>());
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // Track if user wants to start (clicked the button)
  const [wantsToStart, setWantsToStart] = useState(false);

  // Flow elements with proper change handling
  const flowElements = useFlowElements(
    conversationHook.currentConversation?.messages || [],
    selectedMessageId,
    selectedNodes,
    handleNodeClick,
    handleNodeDoubleClick
  );

  // Clear selections when conversation changes
  useEffect(() => {
    setSelectedMessageId('');
    setSelectedNodes(new Set());
  }, [conversationHook.activeConversation]);

  // Message operations
  const messageOps = useMessageOperations({
    activeConversation: conversationHook.activeConversation,
    selectedMessageId,
    selectedNodes,
    addMessage: conversationHook.addMessage,
    findMessage: conversationHook.findMessage,
    getMessageThread: conversationHook.getMessageThread,
    onMessageSent: setSelectedMessageId,
    onClearSelection: () => setSelectedNodes(new Set())
  });

  // Event handlers
  function handleNodeClick(messageId: string, event?: React.MouseEvent) {
    if (event?.ctrlKey || event?.metaKey) {
      const newSelected = new Set(selectedNodes);
      if (newSelected.has(messageId)) {
        newSelected.delete(messageId);
      } else {
        newSelected.add(messageId);
      }
      setSelectedNodes(newSelected);
    } else {
      setSelectedMessageId(messageId);
      setSelectedNodes(new Set());
    }
  }

  function handleNodeDoubleClick(messageId: string, _event?: React.MouseEvent) {
    if (panelManager.isChatCollapsed) {
      panelManager.controls.setChatPanelCollapsed(false);
      setSelectedMessageId(messageId);
      setSelectedNodes(new Set());
      setTimeout(() => {
        setSelectedMessageId(messageId);
      }, 100);
    } else {
      setSelectedMessageId(messageId);
      setSelectedNodes(new Set());
    }
  }

  const handleLayoutApplied = useCallback((layoutedNodes: any[], layoutedEdges: any[]) => {
    // Update the flow elements with the new layouted positions
    flowElements.handleNodesChange(
      layoutedNodes.map(node => ({
        type: 'position',
        id: node.id,
        position: node.position
      }))
    );
  }, [flowElements]);

  const handleConversationChange = useCallback((id: string) => {
    // Only change if it's actually a different conversation
    if (id === conversationHook.activeConversation) return;
    
    conversationHook.setActiveConversation(id);
    // Clear selections immediately when changing conversations
    setSelectedMessageId('');
    setSelectedNodes(new Set());
    
    // Set the first message as selected if the conversation has messages
    setTimeout(() => {
      const newConv = conversationHook.conversations.find(c => c.id === id);
      if (newConv && newConv.messages.length > 0) {
        setSelectedMessageId(newConv.messages[0].id);
      }
    }, 50);
  }, [conversationHook]);

  const handleCreateFirstConversation = useCallback(() => {
    // This is called when user clicks "Start Your First Conversation"
    setWantsToStart(true);
    
    // If user is already logged in, create conversation immediately
    if (user) {
      const newId = conversationHook.createNewConversation();
      setSelectedMessageId('');
      setSelectedNodes(new Set());
      return newId;
    }
    // If not logged in, the EmptyState will show the auth form
  }, [conversationHook, user]);

  const handleCreateNewConversation = useCallback(() => {
    const newId = conversationHook.createNewConversation();
    // Clear selections for new conversation
    setSelectedMessageId('');
    setSelectedNodes(new Set());
    return newId;
  }, [conversationHook]);

  const handleStartRenaming = useCallback(() => {
    const currentConv = conversationHook.currentConversation;
    if (currentConv) {
      panelManager.startRenamingConversation(currentConv.name);
    }
  }, [conversationHook.currentConversation, panelManager]);

  const handleSaveRename = useCallback(() => {
    const newName = panelManager.controls.saveConversationName();
    if (newName && conversationHook.activeConversation) {
      conversationHook.renameConversation(conversationHook.activeConversation, newName);
    }
  }, [panelManager, conversationHook]);

  // Timeline animation
  const startTimelineAnimation = useCallback(() => {
    if (isAnimating) {
      setIsAnimating(false);
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
      return;
    }

    setIsAnimating(true);
    flowElements.setTimelinePosition(0);

    animationRef.current = setInterval(() => {
      flowElements.setTimelinePosition(prev => {
        if (prev >= 1.0) {
          setIsAnimating(false);
          if (animationRef.current) {
            clearInterval(animationRef.current);
          }
          return 1.0;
        }
        return prev + 0.02;
      });
    }, 100);
  }, [isAnimating, flowElements]);

  const resetTimeline = useCallback(() => {
    flowElements.setTimelinePosition(1.0);
    setIsAnimating(false);
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
  }, [flowElements]);

  // NOW WE CAN DO EARLY RETURNS AFTER ALL HOOKS ARE DEFINED
  
  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page with auth if user wants to start but isn't logged in
  // OR show landing page if user hasn't clicked start yet
  // OR show landing page if no conversations exist
  if (!user || !wantsToStart || conversationHook.conversations.length === 0) {
    return (
      <EmptyState
        onCreateConversation={handleCreateFirstConversation}
        showAuth={wantsToStart && !user}
      />
    );
  }

  // Show the main app interface
  return (
    <div className="flex h-screen bg-gray-50 app-main-container">
      {/* Chat Panel */}
      <ChatPanel
        collapsed={panelManager.isChatCollapsed}
        onToggleCollapse={panelManager.toggleChatPanel}
        infoPanelCollapsed={panelManager.isInfoCollapsed}
        onToggleInfoPanel={panelManager.toggleInfoPanel}
        messageThread={conversationHook.getMessageThread(selectedMessageId)}
        selectedMessageId={selectedMessageId}
        isLoading={messageOps.isLoading}
        inputText={messageOps.inputText}
        onInputChange={messageOps.setInputText}
        onSendMessage={messageOps.sendMessage}
        canSendMessage={messageOps.canSendMessage}
        currentMessage={messageOps.getCurrentMessage()}
        bookmarkedNodes={bookmarkedNodes}
        onToggleBookmark={(nodeId) => {
          const newBookmarks = new Set(bookmarkedNodes);
          if (newBookmarks.has(nodeId)) {
            newBookmarks.delete(nodeId);
          } else {
            newBookmarks.add(nodeId);
          }
          setBookmarkedNodes(newBookmarks);
        }}
        conversations={conversationHook.conversations}
        activeConversation={conversationHook.activeConversation}
        onConversationChange={handleConversationChange}
        onCreateConversation={handleCreateNewConversation}
        selectedNodes={selectedNodes}
        canMerge={messageOps.canMerge()}
        onPerformMerge={messageOps.performIntelligentMerge}
        effectiveMergeCount={messageOps.getEffectiveMergeCount()}
        onClearSelection={() => setSelectedNodes(new Set())}
        onFitView={() => {}}
        isRenamingConversation={panelManager.isRenaming}
        tempConversationName={panelManager.tempName}
        onStartRenaming={handleStartRenaming}
        onSaveRename={handleSaveRename}
        onCancelRename={panelManager.controls.cancelRenamingConversation}
        onTempNameChange={panelManager.setTempConversationName}
      />

      {/* Flow Canvas */}
      <FlowCanvas
        nodes={flowElements.nodes}
        edges={flowElements.edges}
        onNodesChange={flowElements.handleNodesChange}
        onEdgesChange={flowElements.handleEdgesChange}
        showMiniMap={showMiniMap}
        chatPanelCollapsed={panelManager.isChatCollapsed}
        selectedNodes={selectedNodes}
        onClearSelection={() => setSelectedNodes(new Set())}
        onFitView={() => {}}
        searchTerm={flowElements.searchTerm}
        onSearchChange={flowElements.setSearchTerm}
        filterType={flowElements.filterType}
        onFilterChange={flowElements.setFilterType}
        timelinePosition={flowElements.timelinePosition}
        onTimelineChange={flowElements.setTimelinePosition}
        isAnimating={isAnimating}
        onStartAnimation={startTimelineAnimation}
        onResetTimeline={resetTimeline}
        canMerge={messageOps.canMerge()}
        onPerformMerge={messageOps.performIntelligentMerge}
        isLoading={messageOps.isLoading}
        effectiveMergeCount={messageOps.getEffectiveMergeCount()}
        onToggleMiniMap={() => setShowMiniMap(!showMiniMap)}
        allMessagesCount={conversationHook.getAllMessages().length}
        conversationName={conversationHook.currentConversation?.name}
        onLayoutApplied={handleLayoutApplied}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ReactFlowProvider>
      <FlowChatAI />
      <Analytics />
      <SpeedInsights />
    </ReactFlowProvider>
  );
};

export default App;