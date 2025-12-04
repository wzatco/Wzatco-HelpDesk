import React, { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  getBezierPath,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  ArrowLeft, 
  Save, 
  Play,
  Plus,
  Trash2,
  Settings,
  Zap,
  GitBranch,
  Clock,
  Mail,
  User,
  Pause,
  PlayCircle,
  StopCircle,
  AlertTriangle,
  CheckCircle,
  Search,
  StickyNote,
  Bell,
  UserCheck,
  FileText,
  TrendingUp,
  X,
  Circle,
  Layout
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/Card';

import { withAuth } from '../../../../lib/withAuth';
// SLA Node configurations based on SLA Guide
const SLA_NODE_CATEGORIES = {
  triggers: {
    title: '🎯 Triggers',
    subtitle: 'Start your SLA workflow',
    icon: Zap,
    nodes: [
      { id: 'ticket_created', label: 'Ticket Created', description: 'Start when new ticket is created', icon: Plus, color: '#22c55e' },
      { id: 'ticket_updated', label: 'Ticket Updated', description: 'Trigger on ticket field changes', icon: Zap, color: '#f97316' },
      { id: 'time_scheduler', label: 'Time-Based Trigger', description: 'Run periodically (every N minutes)', icon: Clock, color: '#3b82f6' },
      { id: 'first_response', label: 'First Response', description: 'When agent first responds', icon: Mail, color: '#8b5cf6' },
      { id: 'assignment_changed', label: 'Assignment Changed', description: 'When ticket is reassigned', icon: UserCheck, color: '#ec4899' },
    ]
  },
  logic: {
    title: '🔀 Logic & Decisions',
    subtitle: 'Branch your workflow based on conditions',
    icon: GitBranch,
    nodes: [
      { id: 'condition_if', label: 'IF Condition', description: 'Route based on field check', icon: GitBranch, color: '#eab308' },
      { id: 'switch_node', label: 'Switch (Multi-branch)', description: 'Multiple condition branches', icon: GitBranch, color: '#6366f1' },
      { id: 'wait_delay', label: 'Wait / Delay', description: 'Pause workflow for time/event', icon: Pause, color: '#06b6d4' },
      { id: 'check_business_hours', label: 'Check Business Hours', description: 'Check if within working hours', icon: Clock, color: '#14b8a6' },
    ]
  },
  sla_timers: {
    title: '⏱️ SLA Timers',
    subtitle: 'Manage SLA countdown timers',
    icon: Clock,
    nodes: [
      { id: 'start_sla_timer', label: 'Start SLA Timer', description: 'Start countdown based on policy', icon: PlayCircle, color: '#22c55e' },
      { id: 'check_sla_time', label: 'Check SLA Time', description: 'Get time remaining/elapsed', icon: Clock, color: '#3b82f6' },
      { id: 'sla_warning', label: 'SLA Warning Threshold', description: 'Alert at 50%/80% time', icon: AlertTriangle, color: '#f59e0b' },
      { id: 'pause_sla', label: 'Pause SLA', description: 'Pause the timer', icon: Pause, color: '#f97316' },
      { id: 'resume_sla', label: 'Resume SLA', description: 'Resume paused timer', icon: PlayCircle, color: '#22c55e' },
      { id: 'sla_breach', label: 'SLA Breach', description: 'Handle SLA breach event', icon: AlertTriangle, color: '#ef4444' },
    ]
  },
  escalations: {
    title: '🚨 Escalations',
    subtitle: 'Escalate based on SLA state',
    icon: TrendingUp,
    nodes: [
      { id: 'escalation_node', label: 'SLA Escalation', description: 'Multi-level escalation logic', icon: TrendingUp, color: '#f97316' },
      { id: 'escalate_level1', label: 'Escalate Level 1', description: 'Escalate to supervisor', icon: TrendingUp, color: '#f97316' },
      { id: 'escalate_level2', label: 'Escalate Level 2', description: 'Escalate to manager', icon: TrendingUp, color: '#ef4444' },
      { id: 'escalate_breach', label: 'Breach Escalation', description: 'Emergency escalation', icon: AlertTriangle, color: '#dc2626' },
    ]
  },
  actions: {
    title: '⚡ Actions',
    subtitle: 'Perform automated actions',
    icon: Zap,
    nodes: [
      { id: 'send_email', label: 'Send Email', description: 'Send email notification', icon: Mail, color: '#8b5cf6' },
      { id: 'send_sms', label: 'Send SMS/WhatsApp', description: 'Send SMS or WhatsApp alert', icon: Bell, color: '#22c55e' },
      { id: 'send_notification', label: 'App Notification', description: 'In-app/Slack/Teams alert', icon: Bell, color: '#f59e0b' },
      { id: 'update_field', label: 'Update Ticket Field', description: 'Change priority/status/tags', icon: Settings, color: '#3b82f6' },
      { id: 'assign_ticket', label: 'Assign Ticket', description: 'Auto-assign to user/team', icon: User, color: '#ec4899' },
      { id: 'add_note', label: 'Add Internal Note', description: 'Post internal comment', icon: FileText, color: '#06b6d4' },
      { id: 'webhook', label: 'Trigger Webhook', description: 'Call external API/webhook', icon: Zap, color: '#a855f7' },
    ]
  },
  utilities: {
    title: '🛠️ Utilities',
    subtitle: 'Helper nodes for workflow logic',
    icon: Settings,
    nodes: [
      { id: 'code_node', label: 'Run Code', description: 'Execute custom JS logic', icon: FileText, color: '#8b5cf6' },
      { id: 'merge_node', label: 'Merge Branches', description: 'Combine parallel paths', icon: GitBranch, color: '#06b6d4' },
      { id: 'note_node', label: 'Note / Comment', description: 'Documentation note', icon: StickyNote, color: '#fbbf24' },
    ]
  }
};

// Custom node component with React Flow handles
const CustomNode = ({ data, selected }) => {
  // Ensure icon is a valid React component, fallback to Circle if not
  let Icon = Circle; // Default fallback
  if (data.icon) {
    if (typeof data.icon === 'function') {
      Icon = data.icon;
    } else if (React.isValidElement(data.icon)) {
      // If it's already an element, we can't use it as a component
      Icon = Circle;
    }
  }
  
  const [showPlus, setShowPlus] = React.useState(false);
  const isSource = true; // All nodes can be sources
  const isTarget = data.id !== 'ticket_created' && data.id !== 'ticket_updated' && data.id !== 'time_scheduler'; // Not triggers
  const isHighlighted = data.highlighted || false;
  
  return (
    <div 
      className={`relative px-4 py-3 rounded-2xl shadow-lg min-w-[200px] transition-all ${
        selected 
          ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-950' 
          : isHighlighted
          ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-950 animate-pulse'
          : 'hover:shadow-xl'
      }`}
      style={{ 
        background: isHighlighted 
          ? 'linear-gradient(135deg, #3d2e1f 0%, #2a1f15 100%)'
          : 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
        border: isHighlighted 
          ? '2px solid #facc15'
          : selected 
          ? '2px solid #8b5cf6' 
          : '2px solid #4a5568',
        boxShadow: isHighlighted ? '0 0 20px rgba(250, 204, 21, 0.5)' : undefined,
      }}
    >
      {/* React Flow Handle - Target (Input - Left side) */}
      {isTarget && (
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="react-flow-handle-custom"
          style={{
            left: '-10px',
            width: '16px',
            height: '16px',
            background: '#334155',
            border: '2px solid #0f172a',
            zIndex: 10,
          }}
        />
      )}
      
      {/* Configuration badge */}
      {data.config && Object.keys(data.config).length > 0 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 border-2 border-slate-900 rounded-full flex items-center justify-center z-20">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Node content */}
      <div className="flex items-center gap-3">
        <div 
          className="p-2.5 rounded-lg shadow-lg" 
          style={{ 
            backgroundColor: `${data.color}20`, 
            border: `1px solid ${data.color}60`,
            boxShadow: `0 0 10px ${data.color}20`
          }}
        >
          <Icon className="w-5 h-5" style={{ color: data.color }} />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-white mb-0.5">{data.label}</div>
          <div className="text-xs text-slate-400">{data.description}</div>
        </div>
      </div>
      
      {/* React Flow Handle - Source (Output - Right side) with hover effect */}
      {isSource && (
        <div 
          className="absolute -right-3 top-1/2 transform -translate-y-1/2 z-10"
          onMouseEnter={() => setShowPlus(true)}
          onMouseLeave={() => setShowPlus(false)}
        >
          {/* Glow effect */}
          <div className={`absolute inset-0 rounded-full transition-all duration-200 pointer-events-none ${
            showPlus ? 'w-7 h-7 -left-1 -top-1' : 'w-5 h-5'
          }`} 
            style={{ 
              background: `radial-gradient(circle, ${data.color}40 0%, transparent 70%)`,
            }}
          />
          
          {/* Plus icon overlay */}
          {showPlus && (
            <div className="absolute inset-0 w-5 h-5 flex items-center justify-center pointer-events-none z-20">
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          )}
          
          {/* Actual React Flow Handle */}
          <Handle
            type="source"
            position={Position.Right}
            id="output"
            className="react-flow-handle-custom-source"
            style={{
              position: 'relative',
              width: '20px',
              height: '20px',
              background: showPlus ? '#8b5cf6' : '#475569',
              border: '2px solid #0f172a',
              cursor: 'crosshair',
              transform: 'none',
              left: 0,
              top: 0,
              transition: 'all 0.2s ease',
              boxShadow: showPlus 
                ? `0 0 12px ${data.color}, 0 0 20px ${data.color}40` 
                : '0 2px 4px rgba(0,0,0,0.3)',
            }}
          />
        </div>
      )}
      
      {/* Node name label underneath */}
      <div className="absolute -bottom-6 left-0 right-0 text-center pointer-events-none">
        <div className="text-xs text-slate-400 font-medium truncate px-2">
          {data.label}
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export default function SLAWorkflowBuilder() {
  const router = useRouter();
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChangeBase] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Track if we're dragging to save history only once per drag
  const isDraggingRef = useRef(false);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showNodePanel, setShowNodePanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showLoadExampleConfirm, setShowLoadExampleConfirm] = useState(false);
  const [history, setHistory] = useState({ past: [], future: [] });
  const [copiedNode, setCopiedNode] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [workflowId, setWorkflowId] = useState(null);
  const [isDraft, setIsDraft] = useState(true);
  const [showNodeHelp, setShowNodeHelp] = useState(false);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [nodeSearchQuery, setNodeSearchQuery] = useState('');

  // Helper function to restore node data from saved workflow
  const restoreNodeData = (savedNode) => {
    // Extract the base node ID from the saved data
    // Node IDs are like "ticket_created_1234567890", we need "ticket_created"
    let nodeId = savedNode.data?.id;
    
    // If nodeId has timestamp suffix (e.g., "ticket_created_1234567890"), extract base ID
    if (nodeId && typeof nodeId === 'string') {
      // Try to find the base ID by matching against known node IDs
      const allNodeIds = [];
      Object.values(SLA_NODE_CATEGORIES).forEach(category => {
        category.nodes.forEach(node => allNodeIds.push(node.id));
      });
      
      // Find matching base ID
      for (const baseId of allNodeIds) {
        if (nodeId.startsWith(baseId + '_') || nodeId === baseId) {
          nodeId = baseId;
          break;
        }
      }
    }
    
    // Find the node definition from SLA_NODE_CATEGORIES
    let nodeDefinition = null;
    for (const category of Object.values(SLA_NODE_CATEGORIES)) {
      const found = category.nodes.find(n => n.id === nodeId);
      if (found) {
        nodeDefinition = found;
        break;
      }
    }

    // If node definition found, restore icon, label, description, color
    if (nodeDefinition) {
      return {
        ...savedNode,
        data: {
          ...savedNode.data,
          id: nodeDefinition.id,
          icon: nodeDefinition.icon,
          label: nodeDefinition.label,
          description: nodeDefinition.description,
          color: nodeDefinition.color,
          // Preserve config if it exists
          config: savedNode.data?.config || {},
        },
      };
    }

    // Fallback: return node as-is if definition not found, but ensure icon is valid
    return {
      ...savedNode,
      data: {
        ...savedNode.data,
        icon: (typeof savedNode.data?.icon === 'function') ? savedNode.data.icon : Circle,
      },
    };
  };

  // Load workflow if workflowId is in URL (edit mode)
  React.useEffect(() => {
    const loadWorkflow = async () => {
      const id = router.query.workflowId;
      if (!id || id === workflowId) return; // Already loaded or no ID

      try {
        setLoadingWorkflow(true);
        const response = await fetch(`/api/admin/sla/workflows/${id}`);
        const data = await response.json();

        if (data.success && data.workflow) {
          const workflow = data.workflow;
          
          // Set workflow ID and name
          setWorkflowId(workflow.id);
          setWorkflowName(workflow.name || 'Untitled Workflow');
          setIsDraft(workflow.isDraft || false);

          // Parse workflow data
          let workflowData = workflow.workflowData;
          if (typeof workflowData === 'string') {
            workflowData = JSON.parse(workflowData);
          }

          // Load nodes and edges - restore node data with icons
          if (workflowData?.nodes && Array.isArray(workflowData.nodes)) {
            const restoredNodes = workflowData.nodes.map(node => restoreNodeData(node));
            setNodes(restoredNodes);
          }
          if (workflowData?.edges && Array.isArray(workflowData.edges)) {
            setEdges(workflowData.edges);
          }

          showToast('Workflow loaded successfully', 'success');
        } else {
          showToast(data.message || 'Failed to load workflow', 'error');
        }
      } catch (error) {
        console.error('Error loading workflow:', error);
        showToast('Error loading workflow', 'error');
      } finally {
        setLoadingWorkflow(false);
      }
    };

    if (router.isReady) {
      loadWorkflow();
    }
  }, [router.query.workflowId, router.isReady, workflowId, setNodes, setEdges]);

  // Fit view when workflow is loaded and reactFlowInstance is ready
  React.useEffect(() => {
    if (workflowId && reactFlowInstance && nodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 200);
    }
  }, [workflowId, reactFlowInstance, nodes.length]);

  // Highlight nodes based on search query
  React.useEffect(() => {
    if (!nodeSearchQuery.trim()) {
      // Clear highlighting when search is empty
      setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, highlighted: false } })));
      return;
    }

    const query = nodeSearchQuery.toLowerCase().trim();
    setNodes((nds) => 
      nds.map((n) => {
        const nodeLabel = (n.data?.label || '').toLowerCase();
        const matches = nodeLabel.includes(query);
        return {
          ...n,
          data: {
            ...n.data,
            highlighted: matches,
          },
        };
      })
    );
  }, [nodeSearchQuery, setNodes]);

  // Show toast notification
  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2000);
  }, []);

  // Save current state to history for undo/redo
  const saveToHistory = useCallback(() => {
    setHistory((prev) => ({
      past: [...prev.past, { nodes, edges }],
      future: [],
    }));
  }, [nodes, edges]);

  // Wrap onNodesChange to save history on position changes (for undo)
  const onNodesChange = useCallback((changes) => {
    // Check if any change is a position change
    const hasPositionChange = changes.some(change => 
      change.type === 'position' && change.dragging === false
    );
    
    // Save to history when drag ends (position finalized)
    if (hasPositionChange && isDraggingRef.current) {
      isDraggingRef.current = false;
      saveToHistory();
    }
    
    // Track if dragging started
    const isDragging = changes.some(change => 
      change.type === 'position' && change.dragging === true
    );
    if (isDragging) {
      isDraggingRef.current = true;
    }
    
    // Apply changes
    onNodesChangeBase(changes);
  }, [onNodesChangeBase, saveToHistory]);

  const onConnect = useCallback((params) => {
    saveToHistory();
    const newEdge = {
      ...params,
      id: `e${params.source}-${params.target}`,
      type: 'smoothstep',
      animated: false,
      style: { 
        stroke: '#8b5cf6', 
        strokeWidth: 2,
        strokeDasharray: '6,4',
        strokeLinecap: 'round',
        opacity: 0.7,
      },
      markerEnd: { 
        type: MarkerType.ArrowClosed, 
        color: '#8b5cf6',
        width: 16,
        height: 16,
      },
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges, saveToHistory]);

  // Remove custom onNodeClick to use React Flow's default multi-select
  // React Flow handles Ctrl/Cmd+Click multi-select natively

  const onNodeDoubleClick = useCallback((event, node) => {
    // Double click opens full-screen configuration
    setSelectedNode(node);
    setShowNodePanel(false);
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setShowNodePanel(false);
  }, []);

  const addNodeAfterEdge = (edge) => {
    setShowNodePanel(true);
    // Store which edge we're adding after
    window.tempEdgeForNode = edge;
  };

  const deleteEdge = useCallback((edgeId) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    setSelectedEdge(null);
  }, [setEdges]);

  const addNodeToCanvas = (nodeData) => {
    saveToHistory();
    
    // Calculate position for vertical stacking (n8n style)
    let position;
    
    // If we're adding after an edge, position it between source and target
    if (window.tempEdgeForNode) {
      const edge = window.tempEdgeForNode;
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        // Position in the middle between source and target
        position = {
          x: (sourceNode.position.x + targetNode.position.x) / 2,
          y: (sourceNode.position.y + targetNode.position.y) / 2
        };
      } else {
        // Fallback: use source node position
        position = sourceNode 
          ? { x: sourceNode.position.x, y: sourceNode.position.y + 200 }
          : { x: 400, y: 200 };
      }
    } else if (nodes.length === 0) {
      // First node: center it on the canvas
      if (reactFlowInstance) {
        position = reactFlowInstance.project({ 
          x: window.innerWidth / 2 - 150, 
          y: 200 
        });
      } else {
        position = { x: 400, y: 200 };
      }
    } else {
      // Subsequent nodes: stack vertically below the last node
      // Find the bottommost node
      const bottomNode = nodes.reduce((bottom, node) => {
        const nodeBottom = node.position.y + (node.height || 100);
        const bottomBottom = bottom.position.y + (bottom.height || 100);
        return nodeBottom > bottomBottom ? node : bottom;
      }, nodes[0]);
      
      // Place new node below the bottommost node with spacing
      const nodeSpacing = 150; // Vertical spacing between nodes
      const nodeHeight = bottomNode.height || 100;
      position = {
        x: bottomNode.position.x, // Align horizontally with previous node
        y: bottomNode.position.y + nodeHeight + nodeSpacing
      };
    }

    const newNode = {
      id: `${nodeData.id}_${Date.now()}`,
      type: 'custom',
      position,
      data: {
        ...nodeData,
        config: nodeData.config || {},
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setShowNodePanel(false);
    // Don't auto-open config - user must double-click to configure
    
    // If we're adding after an edge, reconnect
    if (window.tempEdgeForNode) {
      const edge = window.tempEdgeForNode;
      setEdges((eds) => {
        // Remove old edge
        const filtered = eds.filter((e) => e.id !== edge.id);
        // Add two new edges
        return [
          ...filtered,
          {
            id: `e${edge.source}-${newNode.id}`,
            source: edge.source,
            target: newNode.id,
            type: 'smoothstep',
            animated: false,
            style: { 
              stroke: '#8b5cf6', 
              strokeWidth: 2,
              strokeDasharray: '6,4',
              strokeLinecap: 'round',
              opacity: 0.7,
            },
            markerEnd: { 
              type: MarkerType.ArrowClosed, 
              color: '#8b5cf6',
              width: 16,
              height: 16,
            },
          },
          {
            id: `e${newNode.id}-${edge.target}`,
            source: newNode.id,
            target: edge.target,
            type: 'smoothstep',
            animated: false,
            style: { 
              stroke: '#8b5cf6', 
              strokeWidth: 2,
              strokeDasharray: '6,4',
              strokeLinecap: 'round',
              opacity: 0.7,
            },
            markerEnd: { 
              type: MarkerType.ArrowClosed, 
              color: '#8b5cf6',
              width: 16,
              height: 16,
            },
          },
        ];
      });
      window.tempEdgeForNode = null;
    }
  };

  const deleteNode = useCallback((nodeId) => {
    saveToHistory();
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  }, [saveToHistory, setNodes, setEdges]);

  // Load Example Workflow - Show confirmation modal
  const loadExampleWorkflow = useCallback(() => {
    setShowLoadExampleConfirm(true);
  }, []);

  // Actually load the example workflow
  const confirmLoadExampleWorkflow = useCallback(() => {
    setShowLoadExampleConfirm(false);
    saveToHistory();

    // Get node definitions
    const ticketCreatedNode = SLA_NODE_CATEGORIES.triggers.nodes.find(n => n.id === 'ticket_created');
    const startSLATimerNode = SLA_NODE_CATEGORIES.sla_timers.nodes.find(n => n.id === 'start_sla_timer');
    const slaWarningNode = SLA_NODE_CATEGORIES.sla_timers.nodes.find(n => n.id === 'sla_warning');
    const conditionNode1 = SLA_NODE_CATEGORIES.logic.nodes.find(n => n.id === 'condition_if');
    const sendEmailNode = SLA_NODE_CATEGORIES.actions.nodes.find(n => n.id === 'send_email');
    const slaBreachNode = SLA_NODE_CATEGORIES.sla_timers.nodes.find(n => n.id === 'sla_breach');
    const conditionNode2 = SLA_NODE_CATEGORIES.logic.nodes.find(n => n.id === 'condition_if');
    const escalationNode = SLA_NODE_CATEGORIES.escalations.nodes.find(n => n.id === 'escalate_level1');

    // Create nodes with positions and configurations
    const exampleNodes = [
      {
        id: 'node_1_ticket_created',
        type: 'custom',
        position: { x: 100, y: 300 },
        data: {
          ...ticketCreatedNode,
          config: {
            priorityFilter: ['Medium'],
            categoryFilter: [],
            departmentFilter: [],
            restartOnUpdate: false,
          },
        },
      },
      {
        id: 'node_2_start_sla',
        type: 'custom',
        position: { x: 350, y: 300 },
        data: {
          ...startSLATimerNode,
          config: {
            policyType: 'preset',
            priority: 'Medium',
            responseSLA: 2,
            responseUnit: 'hours',
            resolutionSLA: 24,
            resolutionUnit: 'hours',
            businessHoursOnly: false,
            pauseOnPending: false,
            timezone: 'UTC',
          },
        },
      },
      {
        id: 'node_3_sla_warning_80',
        type: 'custom',
        position: { x: 600, y: 300 },
        data: {
          ...slaWarningNode,
          config: {
            threshold: 80,
            alertPriority: 'high',
            preventDuplicates: true,
            notifyAgent: true,
            notifyManager: false,
            messageTemplate: 'SLA Warning: Ticket is at {{threshold}}% of SLA time',
          },
        },
      },
      {
        id: 'node_4_condition_status',
        type: 'custom',
        position: { x: 850, y: 300 },
        data: {
          ...conditionNode1,
          config: {
            fieldToCheck: 'status',
            operator: 'equals',
            value: 'Resolved',
            caseSensitive: false,
          },
        },
      },
      {
        id: 'node_5_send_reminder',
        type: 'custom',
        position: { x: 1100, y: 200 },
        data: {
          ...sendEmailNode,
          config: {
            actionType: 'notify',
            notifyTarget: 'agent',
            subject: 'SLA Warning: Ticket Approaching Breach',
            messageTemplate: 'Your ticket {{Ticket ID}} is approaching SLA breach. Time remaining: {{TimeRemaining}}',
            sendEmail: true,
            sendSMS: false,
            sendAppNotification: true,
          },
        },
      },
      {
        id: 'node_6_sla_breach',
        type: 'custom',
        position: { x: 1350, y: 200 },
        data: {
          ...slaBreachNode,
          config: {
            actionOnBreach: 'escalate',
            createEscalationTicket: false,
            sendEmail: true,
            emailRecipient: 'manager',
            emailSubject: 'SLA Breach Alert',
            emailMessage: 'Ticket {{Ticket ID}} has breached SLA',
            reassign: false,
            reassignTo: '',
            changePriority: true,
            newPriority: 'Urgent',
            addTag: 'SLA Breached',
            addNote: true,
            noteText: 'SLA breach detected. Escalation required.',
          },
        },
      },
      {
        id: 'node_7_condition_breach',
        type: 'custom',
        position: { x: 1600, y: 200 },
        data: {
          ...conditionNode2,
          config: {
            fieldToCheck: 'status',
            operator: 'equals',
            value: 'Resolved',
            caseSensitive: false,
          },
        },
      },
      {
        id: 'node_8_escalation',
        type: 'custom',
        position: { x: 1850, y: 200 },
        data: {
          ...escalationNode,
          config: {
            escalationLevel: 1,
            notifyTeamLeader: true,
            notifyManager: true,
            autoReassign: true,
            reassignTo: 'supervisor',
            changePriority: true,
            newPriority: 'Urgent',
            addTag: 'SLA Breached',
            addNote: true,
            noteText: 'Ticket has breached SLA. Escalation Level 1 triggered.',
            sendEmail: true,
            emailSubject: 'SLA Escalation: Level 1',
            emailMessage: 'Ticket {{Ticket ID}} has been escalated due to SLA breach.',
          },
        },
      },
    ];

    // Create edges with dashed lines (n8n style)
    const exampleEdges = [
      {
        id: 'edge_1_2',
        source: 'node_1_ticket_created',
        target: 'node_2_start_sla',
        type: 'smoothstep',
        animated: false,
        style: { 
          stroke: '#8b5cf6', 
          strokeWidth: 2,
          strokeDasharray: '6,4',
          strokeLinecap: 'round',
          opacity: 0.7,
        },
        markerEnd: { 
          type: MarkerType.ArrowClosed, 
          color: '#8b5cf6',
          width: 16,
          height: 16,
        },
      },
      {
        id: 'edge_2_3',
        source: 'node_2_start_sla',
        target: 'node_3_sla_warning_80',
        type: 'smoothstep',
        animated: false,
        style: { 
          stroke: '#8b5cf6', 
          strokeWidth: 2,
          strokeDasharray: '6,4',
          strokeLinecap: 'round',
          opacity: 0.7,
        },
        markerEnd: { 
          type: MarkerType.ArrowClosed, 
          color: '#8b5cf6',
          width: 16,
          height: 16,
        },
      },
      {
        id: 'edge_3_4',
        source: 'node_3_sla_warning_80',
        target: 'node_4_condition_status',
        type: 'smoothstep',
        animated: false,
        style: { 
          stroke: '#8b5cf6', 
          strokeWidth: 2,
          strokeDasharray: '6,4',
          strokeLinecap: 'round',
          opacity: 0.7,
        },
        markerEnd: { 
          type: MarkerType.ArrowClosed, 
          color: '#8b5cf6',
          width: 16,
          height: 16,
        },
      },
      {
        id: 'edge_4_5',
        source: 'node_4_condition_status',
        target: 'node_5_send_reminder',
        type: 'smoothstep',
        animated: false,
        style: { 
          stroke: '#8b5cf6', 
          strokeWidth: 2,
          strokeDasharray: '6,4',
          strokeLinecap: 'round',
          opacity: 0.7,
        },
        markerEnd: { 
          type: MarkerType.ArrowClosed, 
          color: '#8b5cf6',
          width: 16,
          height: 16,
        },
        label: 'No (Not Resolved)',
      },
      {
        id: 'edge_5_6',
        source: 'node_5_send_reminder',
        target: 'node_6_sla_breach',
        type: 'smoothstep',
        animated: false,
        style: { 
          stroke: '#8b5cf6', 
          strokeWidth: 2,
          strokeDasharray: '6,4',
          strokeLinecap: 'round',
          opacity: 0.7,
        },
        markerEnd: { 
          type: MarkerType.ArrowClosed, 
          color: '#8b5cf6',
          width: 16,
          height: 16,
        },
      },
      {
        id: 'edge_6_7',
        source: 'node_6_sla_breach',
        target: 'node_7_condition_breach',
        type: 'smoothstep',
        animated: false,
        style: { 
          stroke: '#8b5cf6', 
          strokeWidth: 2,
          strokeDasharray: '6,4',
          strokeLinecap: 'round',
          opacity: 0.7,
        },
        markerEnd: { 
          type: MarkerType.ArrowClosed, 
          color: '#8b5cf6',
          width: 16,
          height: 16,
        },
      },
      {
        id: 'edge_7_8',
        source: 'node_7_condition_breach',
        target: 'node_8_escalation',
        type: 'smoothstep',
        animated: false,
        style: { 
          stroke: '#8b5cf6', 
          strokeWidth: 2,
          strokeDasharray: '6,4',
          strokeLinecap: 'round',
          opacity: 0.7,
        },
        markerEnd: { 
          type: MarkerType.ArrowClosed, 
          color: '#8b5cf6',
          width: 16,
          height: 16,
        },
        label: 'No (Not Resolved)',
      },
    ];

    setNodes(exampleNodes);
    setEdges(exampleEdges);
    setWorkflowName('Basic SLA Workflow Example');
    setSelectedNode(null);
    
    // Fit view to show all nodes
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2 });
      }
    }, 100);

    showToast('Example workflow loaded! Double-click nodes to view configurations.', 'success');
  }, [saveToHistory, setNodes, setEdges, reactFlowInstance, showToast]);

  // Undo
  const undo = useCallback(() => {
    if (history.past.length === 0) {
      showToast('Nothing to undo', 'info');
      return;
    }
    
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    
    setHistory({
      past: newPast,
      future: [{ nodes, edges }, ...history.future],
    });
    
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setSelectedNode(null);
    showToast('Action undone', 'success');
  }, [history, nodes, edges, setNodes, setEdges, showToast]);

  // Redo
  const redo = useCallback(() => {
    if (history.future.length === 0) {
      showToast('Nothing to redo', 'info');
      return;
    }
    
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    
    setHistory({
      past: [...history.past, { nodes, edges }],
      future: newFuture,
    });
    
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelectedNode(null);
    showToast('Action redone', 'success');
  }, [history, nodes, edges, setNodes, setEdges, showToast]);

  // Copy node(s) - supports multi-select
  const copyNode = useCallback(() => {
    // Get all selected nodes from React Flow
    const selectedNodes = nodes.filter((node) => node.selected);
    
    if (selectedNodes.length === 0 && selectedNode) {
      // Fallback to selectedNode state if no React Flow selection
      setCopiedNode({ nodes: [selectedNode], edges: [] });
      showToast('Node copied', 'success');
      return;
    }
    
    if (selectedNodes.length === 0) {
      showToast('No nodes selected', 'info');
      return;
    }
    
    // Get all edges between selected nodes (internal connections)
    const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
    const internalEdges = edges.filter(edge => 
      selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
    );
    
    // Store copied nodes and edges
    setCopiedNode({ 
      nodes: selectedNodes, 
      edges: internalEdges 
    });
    
    showToast(`${selectedNodes.length} node(s) copied`, 'success');
  }, [nodes, edges, selectedNode, showToast]);

  // Paste node(s) - supports multi-select
  const pasteNode = useCallback(() => {
    if (!copiedNode) {
      showToast('No nodes to paste', 'info');
      return;
    }
    
    saveToHistory();
    
    // Handle both old format (single node) and new format (multiple nodes)
    const nodesToPaste = copiedNode.nodes || [copiedNode];
    const edgesToPaste = copiedNode.edges || [];
    
    if (nodesToPaste.length === 0) {
      showToast('No nodes to paste', 'info');
      return;
    }
    
    // Calculate offset for pasted nodes
    const offsetX = 100;
    const offsetY = 100;
    
    // Create mapping from old IDs to new IDs
    const idMapping = new Map();
    const newNodes = nodesToPaste.map((node) => {
      const newId = `${node.data.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      idMapping.set(node.id, newId);
      
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        },
        selected: false, // Deselect pasted nodes
      };
    });
    
    // Create new edges with updated source/target IDs
    const newEdges = edgesToPaste.map((edge) => {
      const newSourceId = idMapping.get(edge.source);
      const newTargetId = idMapping.get(edge.target);
      
      if (!newSourceId || !newTargetId) return null;
      
      return {
        ...edge,
        id: `e${newSourceId}-${newTargetId}_${Date.now()}`,
        source: newSourceId,
        target: newTargetId,
        animated: false,
        style: { 
          stroke: '#8b5cf6', 
          strokeWidth: 2,
          strokeDasharray: '6,4',
          strokeLinecap: 'round',
          opacity: 0.7,
        },
        markerEnd: { 
          type: MarkerType.ArrowClosed, 
          color: '#8b5cf6',
          width: 16,
          height: 16,
        },
      };
    }).filter(edge => edge !== null);
    
    // Add new nodes and edges
    setNodes((nds) => [...nds, ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
    
    showToast(`${newNodes.length} node(s) pasted`, 'success');
  }, [copiedNode, nodes, edges, setNodes, setEdges, saveToHistory, showToast]);

  // Delete selected - supports multi-select
  const deleteSelected = useCallback(() => {
    // Get all selected nodes and edges from React Flow
    const selectedNodes = nodes.filter((node) => node.selected);
    const selectedEdges = edges.filter((edge) => edge.selected);
    
    // Check if we have a selected node in state (fallback)
    if (selectedNode && selectedNodes.length === 0) {
      saveToHistory();
      deleteNode(selectedNode.id);
      showToast('Node deleted', 'success');
      setSelectedNode(null);
      return;
    } 
    // Check if we have a selected edge in state (fallback)
    else if (selectedEdge && selectedEdges.length === 0) {
      deleteEdge(selectedEdge.id);
      showToast('Connection deleted', 'success');
      setSelectedEdge(null);
      return;
    }
    
    // Delete multiple selected nodes
    if (selectedNodes.length > 0) {
      saveToHistory();
      const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
      
      // Delete all selected nodes
      setNodes((nds) => nds.filter((n) => !selectedNodeIds.has(n.id)));
      
      // Delete all edges connected to selected nodes
      setEdges((eds) => eds.filter((e) => 
        !selectedNodeIds.has(e.source) && !selectedNodeIds.has(e.target)
      ));
      
      // Clear selection
      setSelectedNode(null);
      showToast(`${selectedNodes.length} node(s) deleted`, 'success');
    } 
    // Delete multiple selected edges
    else if (selectedEdges.length > 0) {
      const selectedEdgeIds = new Set(selectedEdges.map(e => e.id));
      setEdges((eds) => eds.filter((e) => !selectedEdgeIds.has(e.id)));
      setSelectedEdge(null);
      showToast(`${selectedEdges.length} connection(s) deleted`, 'success');
    }
  }, [selectedNode, selectedEdge, nodes, edges, setNodes, setEdges, saveToHistory, deleteNode, deleteEdge, showToast]);

  // Save workflow (as draft or update existing)
  const saveWorkflow = useCallback(async (asDraft = true) => {
    if (!workflowName.trim()) {
      showToast('Please enter a workflow name', 'error');
      return;
    }

    if (nodes.length === 0) {
      showToast('Please add at least one node to the workflow', 'error');
      return;
    }

    setSaving(true);
    try {
      const workflowData = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
        })),
      };

      const payload = {
        policyId: router.query.policyId || 'default-policy', // Get from URL or use default
        name: workflowName,
        description: `SLA Workflow with ${nodes.length} nodes`,
        workflowData,
        isDraft: asDraft,
        isActive: false,
      };

      const method = workflowId ? 'PUT' : 'POST';
      const url = workflowId 
        ? `/api/admin/sla/workflows/${workflowId}`
        : '/api/admin/sla/workflows';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setWorkflowId(data.workflow.id);
        setIsDraft(asDraft);
        showToast(workflowId ? 'Workflow updated!' : 'Workflow saved!', 'success');
      } else {
        showToast(data.message || 'Failed to save workflow', 'error');
      }
    } catch (error) {
      console.error('Save workflow error:', error);
      showToast('Error saving workflow', 'error');
    } finally {
      setSaving(false);
    }
  }, [workflowName, nodes, edges, workflowId, router.query.policyId, showToast]);

  // Publish workflow (make it active)
  const publishWorkflow = useCallback(async () => {
    if (!workflowName.trim()) {
      showToast('Please enter a workflow name', 'error');
      return;
    }

    if (nodes.length === 0) {
      showToast('Please add at least one node to the workflow', 'error');
      return;
    }

    // Validate workflow has a trigger
    const hasTrigger = nodes.some(node => 
      node.data.id === 'ticket_created' || 
      node.data.id === 'ticket_updated' || 
      node.data.id === 'time_scheduler'
    );

    if (!hasTrigger) {
      showToast('Workflow must have at least one trigger node', 'error');
      return;
    }

    setPublishing(true);
    try {
      // First save as draft if not saved
      if (!workflowId) {
        await saveWorkflow(true);
      }

      // Then publish
      const workflowData = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data,
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
        })),
      };

      const payload = {
        policyId: router.query.policyId || 'default-policy',
        name: workflowName,
        description: `SLA Workflow with ${nodes.length} nodes`,
        workflowData,
        isDraft: false,
        isActive: true,
      };

      const method = workflowId ? 'PUT' : 'POST';
      const url = workflowId 
        ? `/api/admin/sla/workflows/${workflowId}`
        : '/api/admin/sla/workflows';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setWorkflowId(data.workflow.id);
        setIsDraft(false);
        showToast('Workflow published successfully!', 'success');
        
        // Redirect after 1 second
        setTimeout(() => {
          router.push('/admin/sla');
        }, 1000);
      } else {
        showToast(data.message || 'Failed to publish workflow', 'error');
      }
    } catch (error) {
      console.error('Publish workflow error:', error);
      showToast('Error publishing workflow', 'error');
    } finally {
      setPublishing(false);
    }
  }, [workflowName, nodes, edges, workflowId, router, showToast, saveWorkflow]);

  // Auto-arrange nodes in vertical stack (n8n style)
  const autoArrangeNodes = useCallback(() => {
    if (nodes.length === 0) return;

    saveToHistory();

    // Find starting nodes (nodes with no incoming edges, typically triggers)
    const nodeIds = new Set(nodes.map(n => n.id));
    const nodesWithIncoming = new Set(edges.map(e => e.target));
    const startNodes = nodes.filter(n => !nodesWithIncoming.has(n.id));

    // If no start nodes found, use the first node
    const roots = startNodes.length > 0 ? startNodes : [nodes[0]];

    // Build adjacency list for BFS traversal
    const adjacencyList = new Map();
    nodes.forEach(node => {
      adjacencyList.set(node.id, []);
    });
    edges.forEach(edge => {
      const list = adjacencyList.get(edge.source) || [];
      list.push(edge.target);
      adjacencyList.set(edge.source, list);
    });

    // BFS to determine node levels
    const nodeLevels = new Map();
    const visited = new Set();
    const queue = [];

    roots.forEach(root => {
      queue.push({ id: root.id, level: 0 });
      nodeLevels.set(root.id, 0);
      visited.add(root.id);
    });

    while (queue.length > 0) {
      const { id, level } = queue.shift();
      const children = adjacencyList.get(id) || [];

      children.forEach(childId => {
        if (!visited.has(childId)) {
          visited.add(childId);
          nodeLevels.set(childId, level + 1);
          queue.push({ id: childId, level: level + 1 });
        } else {
          // If already visited, use the maximum level
          const currentLevel = nodeLevels.get(childId) || 0;
          nodeLevels.set(childId, Math.max(currentLevel, level + 1));
        }
      });
    }

    // Assign levels to unvisited nodes (disconnected nodes)
    nodes.forEach(node => {
      if (!nodeLevels.has(node.id)) {
        nodeLevels.set(node.id, Math.max(...Array.from(nodeLevels.values())) + 1);
      }
    });

    // Group nodes by level
    const nodesByLevel = new Map();
    nodes.forEach(node => {
      const level = nodeLevels.get(node.id) || 0;
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level).push(node);
    });

    // Calculate positions
    const nodeSpacing = 150; // Vertical spacing
    const horizontalSpacing = 300; // Horizontal spacing for nodes at same level
    const startX = 400; // Center X position
    const startY = 200; // Start Y position

    const newNodes = nodes.map(node => {
      const level = nodeLevels.get(node.id) || 0;
      const nodesAtLevel = nodesByLevel.get(level) || [];
      const indexInLevel = nodesAtLevel.findIndex(n => n.id === node.id);
      
      // For vertical stacking, we'll use level for Y and keep X centered
      // If multiple nodes at same level, arrange them horizontally
      let x = startX;
      let y = startY + (level * nodeSpacing);

      // If multiple nodes at same level, arrange horizontally
      if (nodesAtLevel.length > 1) {
        const totalWidth = (nodesAtLevel.length - 1) * horizontalSpacing;
        x = startX - (totalWidth / 2) + (indexInLevel * horizontalSpacing);
      }

      return {
        ...node,
        position: { x, y },
      };
    });

    setNodes(newNodes);
    
    // Fit view after arranging
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2 });
      }
    }, 100);

    showToast('Nodes auto-arranged in vertical stack', 'success');
  }, [nodes, edges, saveToHistory, setNodes, reactFlowInstance, showToast]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? event.metaKey : event.ctrlKey;

      // Delete - Delete or Backspace
      if ((event.key === 'Delete' || event.key === 'Backspace') && !event.target.matches('input, textarea, select')) {
        event.preventDefault();
        // If config panel is open, close it first
        if (selectedNode && !showNodePanel) {
          setSelectedNode(null);
        } else {
          // Otherwise delete the selected nodes/edges
          deleteSelected();
        }
      }

      // Undo - Ctrl/Cmd + Z
      if (cmdKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }

      // Redo - Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((cmdKey && event.shiftKey && event.key === 'z') || (cmdKey && event.key === 'y')) {
        event.preventDefault();
        redo();
      }

      // Copy - Ctrl/Cmd + C
      if (cmdKey && event.key === 'c' && !event.target.matches('input, textarea')) {
        event.preventDefault();
        copyNode();
      }

      // Paste - Ctrl/Cmd + V
      if (cmdKey && event.key === 'v' && !event.target.matches('input, textarea')) {
        event.preventDefault();
        pasteNode();
      }

      // Deselect - Escape
      if (event.key === 'Escape') {
        setSelectedNode(null);
        setSelectedEdge(null);
        setShowNodePanel(false);
        setShowKeyboardShortcuts(false);
      }

      // Select All - Ctrl/Cmd + A
      if (cmdKey && event.key === 'a' && !event.target.matches('input, textarea')) {
        event.preventDefault();
        setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
      }

      // Show keyboard shortcuts - ?
      if (event.key === '?' && !event.target.matches('input, textarea')) {
        event.preventDefault();
        setShowKeyboardShortcuts(!showKeyboardShortcuts);
      }

      // Add node - A key
      if (event.key === 'a' && !cmdKey && !event.target.matches('input, textarea')) {
        event.preventDefault();
        setShowNodePanel(true);
      }

      // Save - Ctrl/Cmd + S
      if (cmdKey && event.key === 's') {
        event.preventDefault();
        saveWorkflow(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, selectedEdge, showNodePanel, history, deleteSelected, undo, redo, copyNode, pasteNode, showKeyboardShortcuts, setNodes, saveWorkflow]);

  // Custom edge with add/delete buttons
  const CustomEdge = ({ 
    id, 
    sourceX, 
    sourceY, 
    targetX, 
    targetY, 
    sourcePosition, 
    targetPosition, 
    style = {}, 
    markerEnd,
    source,
    target,
    selected
  }) => {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    return (
      <>
        {/* Main path - dashed line like n8n */}
        <path
          id={id}
          className="react-flow__edge-path"
          d={edgePath}
          markerEnd={markerEnd}
          fill="none"
          stroke={selected ? '#a78bfa' : '#8b5cf6'}
          strokeWidth={selected ? 2.5 : 2}
          strokeDasharray={selected ? '8,4' : '6,4'}
          strokeLinecap="round"
          style={{ 
            opacity: selected ? 1 : 0.7,
            transition: 'all 0.2s ease'
          }}
        />
        {/* Buttons */}
        <g transform={`translate(${labelX}, ${labelY})`}>
          <foreignObject width="70" height="28" x="-35" y="-14" className="overflow-visible">
            <div className="flex items-center gap-0.5 bg-slate-800 border border-slate-700 rounded-md p-0.5 shadow-xl" style={{ pointerEvents: 'all' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addNodeAfterEdge({ id, source, target });
                }}
                className="w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-violet-600 rounded text-white transition-all hover:scale-110"
                title="Add node"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteEdge(id);
                }}
                className="w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-red-600 rounded text-white transition-all hover:scale-110"
                title="Delete connection"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </foreignObject>
        </g>
      </>
    );
  };

  const edgeTypes = {
    smoothstep: CustomEdge,
  };

  const filteredCategories = Object.entries(SLA_NODE_CATEGORIES).map(([key, category]) => ({
    key,
    ...category,
    nodes: category.nodes.filter(node => 
      !searchQuery || 
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.nodes.length > 0);

  return (
    <div className="fixed inset-0 bg-slate-950 text-white">
      {/* Loading Overlay */}
      {loadingWorkflow && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-[100]">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
            <p className="text-white text-lg font-medium">Loading workflow...</p>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="h-14 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-0 text-white w-64"
            placeholder="Workflow Name"
          />
          <div className="ml-4 flex items-center gap-4 text-xs text-slate-500">
            <span>{nodes.length} nodes</span>
            <span>•</span>
            <span>{edges.length} connections</span>
          </div>
          {/* Node Search Box */}
          <div className="ml-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={nodeSearchQuery}
              onChange={(e) => setNodeSearchQuery(e.target.value)}
              placeholder="Search nodes on canvas..."
              className={`pl-10 ${nodeSearchQuery ? 'pr-20' : 'pr-4'} py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent w-64`}
            />
            {nodeSearchQuery && (() => {
              const matchCount = nodes.filter(n => n.data?.highlighted).length;
              return (
                <>
                  {matchCount > 0 && (
                    <span className="absolute right-10 top-1/2 transform -translate-y-1/2 text-xs text-yellow-400 font-medium">
                      {matchCount} found
                    </span>
                  )}
                  <button
                    onClick={() => setNodeSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-700 rounded transition-colors"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </>
              );
            })()}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Undo/Redo buttons */}
          <button 
            onClick={undo}
            disabled={history.past.length === 0}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button 
            onClick={redo}
            disabled={history.future.length === 0}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Shift+Z)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
          <div className="w-px h-6 bg-slate-700 mx-1"></div>
          <button 
            onClick={loadExampleWorkflow}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
            title="Load Example Workflow"
          >
            <PlayCircle className="w-4 h-4" />
            Load Example
          </button>
          <button 
            onClick={() => setShowGuide(true)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
            title="Workflow Builder Guide"
          >
            <FileText className="w-4 h-4" />
            Guide
          </button>
          <button 
            onClick={autoArrangeNodes}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2"
            title="Auto-arrange nodes in vertical stack"
          >
            <Layout className="w-4 h-4" />
            Arrange
          </button>
          <button 
            onClick={() => saveWorkflow(true)}
            disabled={saving}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save (Ctrl+S)"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : isDraft ? 'Save Draft' : 'Update'}
          </button>
          <button 
            onClick={publishWorkflow}
            disabled={publishing}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Publish Workflow"
          >
            <Play className="w-4 h-4" />
            {publishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative" style={{ height: 'calc(100vh - 56px)' }}>
        <div ref={reactFlowWrapper} className="w-full h-full">
           <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onNodeDoubleClick={onNodeDoubleClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            connectionLineStyle={{ 
              stroke: '#8b5cf6', 
              strokeWidth: 2,
              strokeLinecap: 'round',
              strokeDasharray: '6,4',
              opacity: 0.7,
            }}
            connectionLineType="default"
            connectionMode="loose"
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: false,
              style: { 
                stroke: '#8b5cf6', 
                strokeWidth: 2,
                strokeDasharray: '6,4',
                strokeLinecap: 'round',
                opacity: 0.7,
              },
              markerEnd: { 
                type: MarkerType.ArrowClosed, 
                color: '#8b5cf6', 
                width: 16, 
                height: 16 
              },
            }}
            minZoom={0.2}
            maxZoom={2}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            multiSelectKeyCode={['Meta', 'Control']}
          >
            <Background color="#475569" gap={16} size={1} />
            <Controls className="!bottom-4 !left-4" />
            <MiniMap
              className="!bottom-4 !right-4"
              nodeColor={(node) => node.data.color}
              maskColor="rgba(0, 0, 0, 0.2)"
            />
          </ReactFlow>
        </div>

         {/* Floating Add Node Button */}
        {!showNodePanel && nodes.length === 0 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <button
              onClick={() => setShowNodePanel(true)}
              className="px-6 py-4 bg-violet-600 hover:bg-violet-700 rounded-xl shadow-xl transition-all flex items-center gap-3"
            >
              <Plus className="w-6 h-6" />
              <span className="text-lg font-semibold">Add First Node</span>
            </button>
            <p className="text-slate-400 mt-4 text-sm">Start building your SLA workflow</p>
            <p className="text-slate-500 mt-2 text-xs">💡 Double-click any node to configure it</p>
          </div>
        )}

        {/* Add Node Button (Top Right) */}
        {nodes.length > 0 && (
          <button
            onClick={() => setShowNodePanel(!showNodePanel)}
            className="absolute top-4 right-4 w-10 h-10 bg-violet-600 hover:bg-violet-700 rounded-lg shadow-lg flex items-center justify-center transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}

        {/* "What happens next?" Panel */}
        {showNodePanel && (
          <div className="absolute top-0 right-0 w-96 h-full bg-slate-900 border-l border-slate-800 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 z-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">What happens next?</h2>
                <button
                  onClick={() => setShowNodePanel(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <div className="p-4 space-y-6">
              {filteredCategories.map((category) => {
                const CategoryIcon = category.icon;
                return (
                  <div key={category.key}>
                    <div className="flex items-center gap-2 mb-3">
                      <CategoryIcon className="w-5 h-5 text-slate-400" />
                      <div>
                        <h3 className="font-semibold text-white">{category.title}</h3>
                        <p className="text-xs text-slate-400">{category.subtitle}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {category.nodes.map((node) => {
                        const NodeIcon = node.icon;
                        return (
                          <button
                            key={node.id}
                            onClick={() => addNodeToCanvas(node)}
                            className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-left group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg" style={{ backgroundColor: `${node.color}20` }}>
                                <NodeIcon className="w-5 h-5" style={{ color: node.color }} />
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold text-white group-hover:text-violet-400 transition-colors">
                                  {node.label}
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {node.description}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* Full-Screen Inspector Panel - Node Configuration (Clean, theme-matched) */}
        {selectedNode && !showNodePanel && (
          <div className="absolute inset-0 bg-white dark:bg-slate-950 z-50 flex flex-col">
            {/* Top Bar - Node Header */}
            <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between bg-white dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setSelectedNode(null);
                    setShowNodeHelp(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm text-slate-900 dark:text-white"
                  title="Back to canvas (Esc)"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to canvas</span>
                </button>
                <div className="w-px h-6 bg-slate-300 dark:bg-slate-700"></div>
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2.5 rounded-lg" 
                    style={{ 
                      backgroundColor: `${selectedNode.data.color}20`,
                      border: `1px solid ${selectedNode.data.color}60`,
                      boxShadow: `0 0 10px ${selectedNode.data.color}20`
                    }}
                  >
                    {React.createElement(selectedNode.data.icon, { 
                      className: "w-5 h-5", 
                      style: { color: selectedNode.data.color } 
                    })}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{selectedNode.data.label}</h3>
                    <p className="text-xs text-slate-400">{selectedNode.data.description}</p>
                  </div>
                  {selectedNode.data.config && Object.keys(selectedNode.data.config).length > 0 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600/10 border border-green-600/30 rounded-full">
                      <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400 text-xs font-medium">Configured</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNodeHelp(!showNodeHelp)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  title="Show Configuration Guide"
                >
                  <FileText className="w-4 h-4" />
                  {showNodeHelp ? 'Hide' : 'Show'} Guide
                </button>
                <button
                  onClick={() => deleteNode(selectedNode.id)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                  title="Delete Node (Del)"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Node
                </button>
              </div>
            </div>

            {/* Configuration Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900">
                <div className="flex gap-1">
                  <button className="px-4 py-3 text-sm font-medium border-b-2 border-violet-500 text-slate-900 dark:text-white">
                    <Settings className="w-4 h-4 inline mr-2" />
                    Configuration
                  </button>
                </div>
              </div>

              {/* Configuration Area - Split Layout */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left: Configuration Form - Scrollable */}
                <div className={`flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-all ${showNodeHelp ? 'mr-0' : ''}`}>
                  <div className="p-8">
                    <NodeConfigForm 
                      node={selectedNode} 
                      onUpdate={(config) => {
                        setNodes((nds) => nds.map((n) => 
                          n.id === selectedNode.id 
                            ? { ...n, data: { ...n.data, config } }
                            : n
                        ));
                      }}
                    />
                    
                    {/* Node Info Card */}
                    <Card className="mt-8 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wide">Node Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-600 dark:text-slate-400">Node ID:</span>
                            <p className="text-slate-900 dark:text-slate-100 font-mono text-xs mt-1">{selectedNode.id}</p>
                          </div>
                          <div>
                            <span className="text-slate-600 dark:text-slate-400">Node Type:</span>
                            <p className="text-slate-900 dark:text-slate-100 mt-1">{selectedNode.data.id}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Right: Help Sidebar - Sticky */}
                {showNodeHelp && (
                  <div className="w-[400px] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto">
                    <div className="sticky top-0 p-6">
                      <NodeHelpSidebar nodeType={selectedNode.data.id} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Help Panel */}
        {showKeyboardShortcuts && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50">
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">⌨️ Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 max-h-[500px] overflow-y-auto">
              <div className="space-y-4">
                <div className="mb-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Editing</h4>
                  <div className="space-y-2">
                    <ShortcutItem keys={['Delete']} description="Delete selected" />
                    <ShortcutItem keys={['Ctrl', 'Z']} description="Undo" />
                    <ShortcutItem keys={['Ctrl', 'Y']} description="Redo" />
                    <ShortcutItem keys={['Ctrl', 'C']} description="Copy node(s)" />
                    <ShortcutItem keys={['Ctrl', 'V']} description="Paste node(s)" />
                    <ShortcutItem keys={['Ctrl', 'S']} description="Save workflow" />
                  </div>
                </div>
                <div className="mb-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Selection</h4>
                  <div className="space-y-2">
                    <ShortcutItem keys={['Ctrl', 'Click']} description="Multi-select nodes" />
                    <ShortcutItem keys={['A']} description="Add new node" />
                    <ShortcutItem keys={['Ctrl', 'A']} description="Select all" />
                    <ShortcutItem keys={['Esc']} description="Deselect / Close" />
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Help</h4>
                  <div className="space-y-2">
                    <ShortcutItem keys={['?']} description="Show shortcuts" />
                  </div>
                </div>
                <div className="border-t border-slate-700 pt-4 mt-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Quick Tips</h4>
                  <div className="space-y-2 text-xs text-slate-400">
                    <p>• Use <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white">Ctrl</kbd> (⌘ on Mac) for shortcuts</p>
                    <p>• <strong className="text-violet-400">Ctrl+Click nodes</strong> to select multiple nodes</p>
                    <p>• <strong className="text-violet-400">Double-click nodes</strong> to configure in full-screen</p>
                    <p>• Drag from connection dots to connect nodes</p>
                    <p>• Click <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white">+</kbd> on connection to add node between</p>
                    <p>• Drag selected nodes together to move them as a group</p>
                    <p>• Drag canvas background to pan around</p>
                    <p>• <strong className="text-green-400">Green badge</strong> means node is configured</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Load Example Workflow Confirmation Modal */}
        {showLoadExampleConfirm && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="w-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-white" />
                  <h3 className="text-xl font-bold text-white">Load Example Workflow</h3>
                </div>
                <button
                  onClick={() => setShowLoadExampleConfirm(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      This will replace your current workflow with a complete example workflow. 
                      All unsaved changes will be lost.
                    </p>
                  </div>
                </div>
                
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Example Includes:</p>
                  <ul className="space-y-1 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span>8 pre-configured nodes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span>Complete workflow connections</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span>
                      <span>Basic SLA workflow pattern</span>
                    </li>
                  </ul>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setShowLoadExampleConfirm(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmLoadExampleWorkflow}
                    className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Load Example
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard shortcut hint (bottom right) */}
        <button
          onClick={() => setShowKeyboardShortcuts(true)}
          className="absolute bottom-4 right-4 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg shadow-lg hover:bg-slate-800 transition-colors flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-white z-10"
          title="Show keyboard shortcuts (?)"
        >
          <span className="font-mono text-base">?</span>
          <span>Shortcuts</span>
        </button>

        {/* Comprehensive SLA Workflow Guide */}
        {showGuide && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="w-[900px] max-h-[90vh] bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              {/* Guide Header */}
              <div className="bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-white" />
                  <h2 className="text-2xl font-bold text-white">SLA Workflow Builder Guide</h2>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Guide Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Introduction */}
                <div className="bg-gradient-to-r from-blue-600/20 to-violet-600/20 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-blue-400 mb-2">🎯 Welcome to SLA Workflow Builder</h3>
                  <p className="text-sm text-slate-300 mb-3">
                    Create visual workflows to automate SLA management, escalations, and ticket routing. 
                    Drag nodes from the panel, connect them, and double-click any node to configure its settings in full-screen.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-blue-300 bg-blue-600/10 px-3 py-2 rounded-lg">
                    <span className="font-semibold">💡 Pro Tip:</span>
                    <span>Double-click nodes for full-screen configuration just like n8n!</span>
                  </div>
                </div>

                {/* Node Categories */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">📚 Node Categories & Usage</h3>
                  
                  {/* Triggers */}
                  <div className="mb-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="text-lg font-semibold text-green-400 mb-2 flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      🎯 Trigger Nodes
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Start workflows when specific events occur</p>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 font-bold">•</span>
                        <div>
                          <strong>Ticket Created:</strong> Starts when a new ticket is created. Configure filters for priority, category, or department.
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 font-bold">•</span>
                        <div>
                          <strong>Ticket Updated:</strong> Triggers when ticket fields change (priority, status, assignment). Useful for SLA resets.
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400 font-bold">•</span>
                        <div>
                          <strong>Time-Based Trigger:</strong> Runs periodically (every 1-5 minutes) to monitor SLA expiry.
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Logic */}
                  <div className="mb-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                      <GitBranch className="w-5 h-5" />
                      🔀 Logic & Decision Nodes
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Branch workflows based on conditions</p>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-400 font-bold">•</span>
                        <div>
                          <strong>IF Condition:</strong> Check any field (priority, status, time remaining) and route to True/False paths.
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-400 font-bold">•</span>
                        <div>
                          <strong>Switch (Multi-branch):</strong> Multiple branches based on department, category, or priority levels.
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-400 font-bold">•</span>
                        <div>
                          <strong>Wait/Delay:</strong> Pause workflow until event occurs or time elapses (e.g., wait 30 min before breach).
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* SLA Timers */}
                  <div className="mb-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="text-lg font-semibold text-blue-400 mb-2 flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      ⏱️ SLA Timer Nodes
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Core SLA management</p>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 font-bold">•</span>
                        <div>
                          <strong>Start SLA Timer:</strong> Begins countdown for response or resolution based on SLA policy.
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 font-bold">•</span>
                        <div>
                          <strong>Check SLA Time:</strong> Get remaining time, elapsed time, at-risk status, breach status.
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 font-bold">•</span>
                        <div>
                          <strong>SLA Warning:</strong> Trigger actions at 50% or 80% of SLA time to prevent breaches.
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 font-bold">•</span>
                        <div>
                          <strong>Pause/Resume:</strong> Pause when waiting for customer, resume when ticket becomes active.
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-400 font-bold">•</span>
                        <div>
                          <strong>SLA Breach:</strong> Execute breach actions (notify, escalate, update priority).
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Escalations */}
                  <div className="mb-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="text-lg font-semibold text-orange-400 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      🚨 Escalation Nodes
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Multi-level escalations based on SLA state</p>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400 font-bold">•</span>
                        <div>
                          <strong>SLA Escalation:</strong> Configure multi-level escalation with thresholds (50%, 80%, breach).
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-400 font-bold">•</span>
                        <div>
                          <strong>Escalate Level 1-2:</strong> Notify supervisors, managers, reassign tickets automatically.
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="mb-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="text-lg font-semibold text-purple-400 mb-2 flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      ⚡ Action Nodes
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Perform automated actions</p>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 font-bold">•</span>
                        <div>
                          <strong>Send Email/SMS:</strong> Notify customers, agents, or managers with custom templates.
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 font-bold">•</span>
                        <div>
                          <strong>Update Ticket Field:</strong> Change priority, status, add tags, modify fields automatically.
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 font-bold">•</span>
                        <div>
                          <strong>Assign Ticket:</strong> Auto-assign to specific users, teams, or round-robin.
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-purple-400 font-bold">•</span>
                        <div>
                          <strong>Webhook:</strong> Integrate with external tools (Slack, Teams, custom APIs).
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Utilities */}
                  <div className="mb-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="text-lg font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      🛠️ Utility Nodes
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Advanced workflow helpers</p>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold">•</span>
                        <div>
                          <strong>Run Code:</strong> Execute custom JavaScript for complex calculations or data transformations.
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold">•</span>
                        <div>
                          <strong>Merge Branches:</strong> Combine multiple workflow paths into one.
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold">•</span>
                        <div>
                          <strong>Note:</strong> Add documentation and comments to your workflow canvas.
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Best Practices */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">💡 Best Practices</h3>
                  <div className="space-y-3 text-sm text-slate-300">
                    <div className="flex items-start gap-3 p-3 bg-green-600/10 border border-green-600/20 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-green-400">Always start with a Trigger:</strong> Every workflow must begin with a trigger node (Ticket Created, Updated, or Time-Based).
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-blue-400">Configure all nodes:</strong> Nodes with a green badge are configured. Double-click any node to configure in full-screen.
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-purple-400">Use conditions wisely:</strong> Branch your workflow based on priority, department, or time remaining to create smart escalations.
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-orange-400">Test before publishing:</strong> Save drafts and test with sample tickets before activating.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Example Workflows */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">📋 Real-World Workflow Examples</h3>
                  
                  {/* Example 1: High Priority Auto-SLA */}
                  <div className="mb-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="text-base font-semibold text-violet-400 mb-2">Example 1: High Priority Auto-SLA</h4>
                    <p className="text-xs text-slate-400 mb-3">Automatically start SLA timers for urgent tickets</p>
                    <div className="space-y-1.5 text-sm text-slate-300 font-mono">
                      <div>🎯 Ticket Created (Priority = High/Urgent)</div>
                      <div className="ml-4">↓</div>
                      <div>⏱️ Start SLA Timer (2h response, 8h resolution)</div>
                      <div className="ml-4">↓</div>
                      <div>📧 Send Email (Notify assigned agent)</div>
                    </div>
                    <div className="mt-3 p-2 bg-green-600/10 border border-green-600/30 rounded text-xs text-green-300">
                      ✅ Use this to ensure every high-priority ticket gets SLA tracking automatically
                    </div>
                  </div>

                  {/* Example 2: Escalation Chain */}
                  <div className="mb-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="text-base font-semibold text-violet-400 mb-2">Example 2: Progressive Escalation</h4>
                    <p className="text-xs text-slate-400 mb-3">Escalate at 50%, 80%, and breach thresholds</p>
                    <div className="space-y-1.5 text-sm text-slate-300 font-mono">
                      <div>⏱️ Check SLA Time</div>
                      <div className="ml-4">↓</div>
                      <div>❓ IF Time Remaining &lt; 50% → Notify Agent</div>
                      <div className="ml-4">↓</div>
                      <div>❓ IF Time Remaining &lt; 20% → Notify Supervisor</div>
                      <div className="ml-4">↓</div>
                      <div>🚨 IF Breached → Escalate to Manager + Change Priority</div>
                    </div>
                    <div className="mt-3 p-2 bg-orange-600/10 border border-orange-600/30 rounded text-xs text-orange-300">
                      ⚠️ Creates a safety net with multiple checkpoints before breach
                    </div>
                  </div>

                  {/* Example 3: Auto-Pause on Customer Wait */}
                  <div className="mb-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="text-base font-semibold text-violet-400 mb-2">Example 3: Auto-Pause/Resume SLA</h4>
                    <p className="text-xs text-slate-400 mb-3">Pause SLA when waiting for customer, resume when active</p>
                    <div className="space-y-1.5 text-sm text-slate-300 font-mono">
                      <div>🔄 Ticket Updated (Status changed)</div>
                      <div className="ml-4">↓</div>
                      <div>❓ IF Status = "Waiting on Customer"</div>
                      <div className="ml-4">├─ True → ⏸️ Pause SLA + Add Note</div>
                      <div className="ml-4">└─ False → ▶️ Resume SLA</div>
                    </div>
                    <div className="mt-3 p-2 bg-blue-600/10 border border-blue-600/30 rounded text-xs text-blue-300">
                      💡 Ensures SLA only counts time when ticket is actively being worked on
                    </div>
                  </div>

                  {/* Example 4: Department Routing */}
                  <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                    <h4 className="text-base font-semibold text-violet-400 mb-2">Example 4: Smart Department Routing</h4>
                    <p className="text-xs text-slate-400 mb-3">Route tickets to correct teams based on category</p>
                    <div className="space-y-1.5 text-sm text-slate-300 font-mono">
                      <div>🎯 Ticket Created</div>
                      <div className="ml-4">↓</div>
                      <div>🔀 Switch (Category)</div>
                      <div className="ml-4">├─ Technical → Assign to Tech Team</div>
                      <div className="ml-4">├─ Billing → Assign to Finance Team</div>
                      <div className="ml-4">└─ Other → Assign Round-Robin</div>
                    </div>
                    <div className="mt-3 p-2 bg-purple-600/10 border border-purple-600/30 rounded text-xs text-purple-300">
                      🎯 Automatically distributes workload to correct departments
                    </div>
                  </div>
                </div>

                {/* Quick Tips */}
                <div className="bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-violet-500/30 rounded-lg p-5">
                  <h3 className="text-lg font-bold text-white mb-3">🚀 Quick Tips</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-slate-300">
                        <span className="text-violet-400">▸</span>
                        <span><strong>Double-click</strong> nodes to configure</span>
                      </div>
                      <div className="flex items-start gap-2 text-slate-300">
                        <span className="text-violet-400">▸</span>
                        <span><strong>Drag from dots</strong> to connect nodes</span>
                      </div>
                      <div className="flex items-start gap-2 text-slate-300">
                        <span className="text-violet-400">▸</span>
                        <span><strong>Press Delete</strong> to remove nodes</span>
                      </div>
                      <div className="flex items-start gap-2 text-slate-300">
                        <span className="text-violet-400">▸</span>
                        <span><strong>Ctrl+Z/Y</strong> for undo/redo</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-slate-300">
                        <span className="text-violet-400">▸</span>
                        <span><strong>Green badge</strong> = node configured</span>
                      </div>
                      <div className="flex items-start gap-2 text-slate-300">
                        <span className="text-violet-400">▸</span>
                        <span><strong>Save Draft</strong> to test safely</span>
                      </div>
                      <div className="flex items-start gap-2 text-slate-300">
                        <span className="text-violet-400">▸</span>
                        <span><strong>Publish</strong> to activate workflow</span>
                      </div>
                      <div className="flex items-start gap-2 text-slate-300">
                        <span className="text-violet-400">▸</span>
                        <span><strong>Each node</strong> has its own help guide</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guide Footer */}
              <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  💡 Tip: Press <kbd className="px-2 py-1 bg-slate-800 rounded text-xs">?</kbd> for keyboard shortcuts
                </p>
                <button
                  onClick={() => setShowGuide(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast.show && (
          <div className="absolute top-20 right-4 z-50 animate-slide-in-right">
            <div className={`px-4 py-3 rounded-lg shadow-xl border flex items-center gap-3 ${
              toast.type === 'success' 
                ? 'bg-green-600 border-green-500' 
                : toast.type === 'error'
                ? 'bg-red-600 border-red-500'
                : 'bg-blue-600 border-blue-500'
            }`}>
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-white" />}
              {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-white" />}
              {toast.type === 'info' && <Settings className="w-5 h-5 text-white" />}
              <span className="text-white font-medium">{toast.message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Keyboard shortcut item component
function ShortcutItem({ keys, description }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300">{description}</span>
      <div className="flex items-center gap-1">
        {keys.map((key, index) => (
          <React.Fragment key={key}>
            {index > 0 && <span className="text-slate-500 text-xs">+</span>}
            <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-white shadow-sm">
              {key}
            </kbd>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// Styled Checkbox Component (matching policies page)
function StyledCheckbox({ checked, onChange, label, description }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
          checked
            ? 'bg-violet-600 border-violet-600 dark:bg-violet-500 dark:border-violet-500 shadow-md shadow-violet-500/30' 
            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-violet-400 dark:group-hover:border-violet-500 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/20'
        }`}>
          {checked && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M5 13l4 4L19 7"></path>
            </svg>
          )}
        </div>
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</div>
        {description && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</div>}
      </div>
    </label>
  );
}

// Node Help Guide Component
function NodeHelpGuide({ nodeType }) {
  const [showHelp, setShowHelp] = React.useState(false);

  const helpContent = {
    ticket_created: {
      title: "Ticket Created Trigger",
      description: "This node starts the workflow when a new ticket is created that matches your filters.",
      fields: [
        { name: "Department Filter", desc: "Only trigger for tickets from specific departments. Leave empty for all departments." },
        { name: "Priority Filter", desc: "Select one or more priorities to trigger on. Empty = all priorities." },
        { name: "Category Filter", desc: "Filter by ticket category. Useful for department-specific workflows." },
      ],
      tips: [
        "Use filters to create targeted workflows (e.g., high-priority technical tickets)",
        "Leave all filters empty to trigger for ALL new tickets",
        "You can combine multiple filters (e.g., Technical dept + High priority)",
      ],
    },
    ticket_updated: {
      title: "Ticket Updated Trigger",
      description: "Triggers when specific ticket fields change. Essential for SLA resets and status tracking.",
      fields: [
        { name: "Watch Fields", desc: "Select which field changes should trigger this workflow." },
        { name: "Priority Changed", desc: "Triggers when ticket priority is updated (useful for SLA adjustments)." },
        { name: "Status Changed", desc: "Triggers on status changes (e.g., Open → Waiting for Customer)." },
        { name: "Assigned User Changed", desc: "Triggers when ticket is reassigned to different agent." },
      ],
      tips: [
        "Select ONLY the fields you care about to avoid unnecessary triggers",
        "Great for pausing SLA when status changes to 'Waiting on Customer'",
        "Can trigger multiple workflows from the same update",
      ],
    },
    start_sla_timer: {
      title: "Start SLA Timer",
      description: "Creates response and resolution SLA timers based on your policy or custom durations.",
      fields: [
        { name: "SLA Policy", desc: "Choose preset (High/Medium/Low) or Custom with your own durations." },
        { name: "Response Duration", desc: "How long until first agent response is required." },
        { name: "Resolution Duration", desc: "How long until ticket must be fully resolved." },
        { name: "Timer Mode", desc: "24/7 = counts all hours. Business Hours = only counts Mon-Fri 9-5." },
      ],
      tips: [
        "Use preset policies for consistency across your helpdesk",
        "Custom durations give flexibility for special cases",
        "Business Hours mode automatically pauses overnight and weekends",
        "Creates TWO timers: one for response, one for resolution",
      ],
    },
    condition_if: {
      title: "IF Condition (Branch Logic)",
      description: "Check any field and route workflow to different paths based on True/False result.",
      fields: [
        { name: "Field to Check", desc: "Which ticket field to evaluate (priority, status, time remaining, etc.)." },
        { name: "Operator", desc: "How to compare: Equals, Not Equals, Greater Than, Less Than, Contains, etc." },
        { name: "Comparison Value", desc: "The value to compare against (e.g., 'High', '10', 'Resolved')." },
      ],
      tips: [
        "Connect two paths from this node: one for True, one for False",
        "Example: IF Priority = High → Send urgent notification (True path)",
        "Can check SLA time remaining: IF time_remaining < 10 → Escalate",
        "Great for routing tickets to different teams based on criteria",
      ],
    },
    send_email: {
      title: "Send Notification",
      description: "Automatically send email, SMS, or app notifications to agents, customers, or managers.",
      fields: [
        { name: "Recipient", desc: "Who receives the notification: Customer, Assigned Agent, Manager, Custom email." },
        { name: "Subject/Title", desc: "The notification subject line or title." },
        { name: "Message Template", desc: "The notification body. Use variables like {{ticketId}}, {{priority}}." },
      ],
      tips: [
        "Use variables for dynamic content: {{ticketId}}, {{priority}}, {{timeRemaining}}",
        "Example: 'Ticket #{{ticketId}} SLA has {{timeRemaining}} minutes remaining'",
        "Notifications send immediately (non-blocking)",
        "Can send to multiple recipients by using multiple nodes",
      ],
    },
    pause_sla: {
      title: "Pause SLA Timer",
      description: "Temporarily stops SLA timers when ticket is waiting for customer or on hold.",
      fields: [
        { name: "Pause When Status", desc: "Which status should trigger the pause (e.g., Waiting for Customer)." },
        { name: "Reason", desc: "Optional: Why the timer is being paused (logged for reference)." },
        { name: "Add Note", desc: "Automatically add an internal note to the ticket." },
      ],
      tips: [
        "Commonly used when ticket status = 'Waiting on Customer'",
        "Timer countdown stops - remaining time is preserved",
        "Must use 'Resume SLA' node to restart the timer",
        "Great for compliance - shows SLA was paused legitimately",
      ],
    },
    update_field: {
      title: "Update Ticket Field",
      description: "Automatically change ticket fields like priority, status, category, or tags.",
      fields: [
        { name: "Field to Update", desc: "Which field to modify: Priority, Status, Category, Tags, or Custom Field." },
        { name: "New Value", desc: "What value to set the field to." },
        { name: "Update Mode", desc: "Overwrite (replace) or Append (add to existing value)." },
      ],
      tips: [
        "Use to auto-escalate: Priority changed to 'Urgent' on SLA breach",
        "Can add tags for tracking: Add 'SLA_BREACHED' tag",
        "Append mode useful for tags: keeps existing + adds new",
        "Changes trigger 'Ticket Updated' workflows - be careful of loops!",
      ],
    },
    assign_ticket: {
      title: "Assign Ticket",
      description: "Automatically assign or reassign tickets to users, teams, or departments.",
      fields: [
        { name: "Assign To", desc: "Choose: Specific User, Team, Department, or Round-Robin." },
        { name: "User/Team Selection", desc: "Pick the specific user or team (if not using round-robin)." },
        { name: "Notify Assignee", desc: "Send notification to newly assigned agent." },
      ],
      tips: [
        "Round-robin distributes tickets evenly across team",
        "Great for after-hours: Assign to on-call team",
        "Can route based on priority: High → Senior agents",
        "Notification ensures agent knows they were assigned",
      ],
    },
    sla_breach: {
      title: "SLA Breach Handler",
      description: "Execute actions when SLA time is exceeded. Final safety net for missed deadlines.",
      fields: [
        { name: "Breach Actions", desc: "Select what happens: Create escalation, Send alerts, Change priority, Add tags." },
        { name: "Create Escalation Ticket", desc: "Opens a separate high-priority escalation ticket." },
        { name: "Send Email Alert", desc: "Notifies management of the breach." },
        { name: "Add Tag", desc: "Marks ticket as 'SLA_BREACHED' for reporting." },
      ],
      tips: [
        "Usually placed at END of SLA monitoring flow",
        "Multiple actions can be selected simultaneously",
        "Records breach in database for compliance reporting",
        "Consider adding multiple notification recipients",
      ],
    },
    sla_warning: {
      title: "SLA Warning/Threshold Alert",
      description: "Send warnings BEFORE SLA breaches at 50%, 75%, 80%, or 90% of time elapsed.",
      fields: [
        { name: "Alert Threshold", desc: "When to send warning: 50%, 75%, 80%, or 90% of SLA time used." },
        { name: "Alert Priority", desc: "Low (FYI), Medium (Warning), High (Urgent)." },
        { name: "Prevent Duplicates", desc: "Only send this warning once per ticket." },
      ],
      tips: [
        "Create multiple warning nodes for escalating alerts (50% → 80% → 90%)",
        "80% is common: gives time to act before breach",
        "Duplicate prevention avoids spam if workflow runs multiple times",
        "Can connect to notification nodes for actual alerting",
      ],
    },
    escalation: {
      title: "Escalation Action",
      description: "Escalate tickets through levels (L1 → L2 → L3) with increasing urgency and visibility.",
      fields: [
        { name: "Escalation Level", desc: "Level 1 (Supervisor), Level 2 (Manager), Level 3 (Director)." },
        { name: "Trigger Threshold", desc: "When to escalate: At 50%, 80%, or on breach." },
        { name: "Escalation Actions", desc: "What happens: Notify supervisor, Auto-reassign, Mark urgent, Add note." },
      ],
      tips: [
        "Level 1 = Supervisor notification (early warning)",
        "Level 2 = Manager involvement (serious concern)",
        "Level 3 = Director escalation (critical issue)",
        "Records escalation in database for audit trail",
      ],
    },
  };

  const help = helpContent[nodeType];
  if (!help) return null;

  return (
    <div className="mb-6">
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors w-full text-left"
      >
        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
          {showHelp ? 'Hide' : 'Show'} Configuration Guide
        </span>
      </button>

      {showHelp && (
        <div className="mt-4 p-5 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{help.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{help.description}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Fields Explained:</h4>
            <div className="space-y-2">
              {help.fields.map((field, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <div className="font-medium text-sm text-slate-900 dark:text-white">{field.name}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">{field.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">💡 Tips:</h4>
            <ul className="space-y-1.5">
              {help.tips.map((tip, idx) => (
                <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                  <span className="text-violet-500 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// Node Help Sidebar Component (Always visible, no toggle)
function NodeHelpSidebar({ nodeType }) {
  const helpContent = {
    ticket_created: {
      title: "Ticket Created Trigger",
      description: "This node starts the workflow when a new ticket is created that matches your filters.",
      fields: [
        { name: "Department Filter", desc: "Only trigger for tickets from specific departments. Leave empty for all departments." },
        { name: "Priority Filter", desc: "Select one or more priorities to trigger on. Empty = all priorities." },
        { name: "Category Filter", desc: "Filter by ticket category. Useful for department-specific workflows." },
      ],
      tips: [
        "Use filters to create targeted workflows (e.g., high-priority technical tickets)",
        "Leave all filters empty to trigger for ALL new tickets",
        "You can combine multiple filters (e.g., Technical dept + High priority)",
      ],
    },
    ticket_updated: {
      title: "Ticket Updated Trigger",
      description: "Triggers when specific ticket fields change. Essential for SLA resets and status tracking.",
      fields: [
        { name: "Watch Fields", desc: "Select which field changes should trigger this workflow." },
        { name: "Priority Changed", desc: "Triggers when ticket priority is updated (useful for SLA adjustments)." },
        { name: "Status Changed", desc: "Triggers on status changes (e.g., Open → Waiting for Customer)." },
        { name: "Assigned User Changed", desc: "Triggers when ticket is reassigned to different agent." },
      ],
      tips: [
        "Select ONLY the fields you care about to avoid unnecessary triggers",
        "Great for pausing SLA when status changes to 'Waiting on Customer'",
        "Can trigger multiple workflows from the same update",
      ],
    },
    start_sla_timer: {
      title: "Start SLA Timer",
      description: "Creates response and resolution SLA timers based on your policy or custom durations.",
      fields: [
        { name: "SLA Policy", desc: "Choose preset (High/Medium/Low) or Custom with your own durations." },
        { name: "Response Duration", desc: "How long until first agent response is required." },
        { name: "Resolution Duration", desc: "How long until ticket must be fully resolved." },
        { name: "Timer Mode", desc: "24/7 = counts all hours. Business Hours = only counts Mon-Fri 9-5." },
      ],
      tips: [
        "Use preset policies for consistency across your helpdesk",
        "Custom durations give flexibility for special cases",
        "Business Hours mode automatically pauses overnight and weekends",
        "Creates TWO timers: one for response, one for resolution",
      ],
    },
    condition_if: {
      title: "IF Condition (Branch Logic)",
      description: "Check any field and route workflow to different paths based on True/False result.",
      fields: [
        { name: "Field to Check", desc: "Which ticket field to evaluate (priority, status, time remaining, etc.)." },
        { name: "Operator", desc: "How to compare: Equals, Not Equals, Greater Than, Less Than, Contains, etc." },
        { name: "Comparison Value", desc: "The value to compare against (e.g., 'High', '10', 'Resolved')." },
      ],
      tips: [
        "Connect two paths from this node: one for True, one for False",
        "Example: IF Priority = High → Send urgent notification (True path)",
        "Can check SLA time remaining: IF time_remaining < 10 → Escalate",
        "Great for routing tickets to different teams based on criteria",
      ],
    },
    send_email: {
      title: "Send Notification",
      description: "Automatically send email, SMS, or app notifications to agents, customers, or managers.",
      fields: [
        { name: "Recipient", desc: "Who receives the notification: Customer, Assigned Agent, Manager, Custom email." },
        { name: "Subject/Title", desc: "The notification subject line or title." },
        { name: "Message Template", desc: "The notification body. Use variables like {{ticketId}}, {{priority}}." },
      ],
      tips: [
        "Use variables for dynamic content: {{ticketId}}, {{priority}}, {{timeRemaining}}",
        "Example: 'Ticket #{{ticketId}} SLA has {{timeRemaining}} minutes remaining'",
        "Notifications send immediately (non-blocking)",
        "Can send to multiple recipients by using multiple nodes",
      ],
    },
    pause_sla: {
      title: "Pause SLA Timer",
      description: "Temporarily stops SLA timers when ticket is waiting for customer or on hold.",
      fields: [
        { name: "Pause When Status", desc: "Which status should trigger the pause (e.g., Waiting for Customer)." },
        { name: "Reason", desc: "Optional: Why the timer is being paused (logged for reference)." },
        { name: "Add Note", desc: "Automatically add an internal note to the ticket." },
      ],
      tips: [
        "Commonly used when ticket status = 'Waiting on Customer'",
        "Timer countdown stops - remaining time is preserved",
        "Must use 'Resume SLA' node to restart the timer",
        "Great for compliance - shows SLA was paused legitimately",
      ],
    },
    update_field: {
      title: "Update Ticket Field",
      description: "Automatically change ticket fields like priority, status, category, or tags.",
      fields: [
        { name: "Field to Update", desc: "Which field to modify: Priority, Status, Category, Tags, or Custom Field." },
        { name: "New Value", desc: "What value to set the field to." },
        { name: "Update Mode", desc: "Overwrite (replace) or Append (add to existing value)." },
      ],
      tips: [
        "Use to auto-escalate: Priority changed to 'Urgent' on SLA breach",
        "Can add tags for tracking: Add 'SLA_BREACHED' tag",
        "Append mode useful for tags: keeps existing + adds new",
        "Changes trigger 'Ticket Updated' workflows - be careful of loops!",
      ],
    },
    assign_ticket: {
      title: "Assign Ticket",
      description: "Automatically assign or reassign tickets to users, teams, or departments.",
      fields: [
        { name: "Assign To", desc: "Choose: Specific User, Team, Department, or Round-Robin." },
        { name: "User/Team Selection", desc: "Pick the specific user or team (if not using round-robin)." },
        { name: "Notify Assignee", desc: "Send notification to newly assigned agent." },
      ],
      tips: [
        "Round-robin distributes tickets evenly across team",
        "Great for after-hours: Assign to on-call team",
        "Can route based on priority: High → Senior agents",
        "Notification ensures agent knows they were assigned",
      ],
    },
    sla_breach: {
      title: "SLA Breach Handler",
      description: "Execute actions when SLA time is exceeded. Final safety net for missed deadlines.",
      fields: [
        { name: "Breach Actions", desc: "Select what happens: Create escalation, Send alerts, Change priority, Add tags." },
        { name: "Create Escalation Ticket", desc: "Opens a separate high-priority escalation ticket." },
        { name: "Send Email Alert", desc: "Notifies management of the breach." },
        { name: "Add Tag", desc: "Marks ticket as 'SLA_BREACHED' for reporting." },
      ],
      tips: [
        "Usually placed at END of SLA monitoring flow",
        "Multiple actions can be selected simultaneously",
        "Records breach in database for compliance reporting",
        "Consider adding multiple notification recipients",
      ],
    },
    sla_warning: {
      title: "SLA Warning/Threshold Alert",
      description: "Send warnings BEFORE SLA breaches at 50%, 75%, 80%, or 90% of time elapsed.",
      fields: [
        { name: "Alert Threshold", desc: "When to send warning: 50%, 75%, 80%, or 90% of SLA time used." },
        { name: "Alert Priority", desc: "Low (FYI), Medium (Warning), High (Urgent)." },
        { name: "Prevent Duplicates", desc: "Only send this warning once per ticket." },
      ],
      tips: [
        "Create multiple warning nodes for escalating alerts (50% → 80% → 90%)",
        "80% is common: gives time to act before breach",
        "Duplicate prevention avoids spam if workflow runs multiple times",
        "Can connect to notification nodes for actual alerting",
      ],
    },
    escalation: {
      title: "Escalation Action",
      description: "Escalate tickets through levels (L1 → L2 → L3) with increasing urgency and visibility.",
      fields: [
        { name: "Escalation Level", desc: "Level 1 (Supervisor), Level 2 (Manager), Level 3 (Director)." },
        { name: "Trigger Threshold", desc: "When to escalate: At 50%, 80%, or on breach." },
        { name: "Escalation Actions", desc: "What happens: Notify supervisor, Auto-reassign, Mark urgent, Add note." },
      ],
      tips: [
        "Level 1 = Supervisor notification (early warning)",
        "Level 2 = Manager involvement (serious concern)",
        "Level 3 = Director escalation (critical issue)",
        "Records escalation in database for audit trail",
      ],
    },
  };

  const help = helpContent[nodeType];
  if (!help) {
    return (
      <div className="p-6">
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">No help guide available for this node type yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
          <FileText className="w-5 h-5" />
          <span className="text-xs font-semibold uppercase tracking-wide">Configuration Guide</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{help.title}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{help.description}</p>
      </div>

      {/* Fields Section */}
      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4 text-violet-500" />
          Fields Explained
        </h4>
        <div className="space-y-3">
          {help.fields.map((field, idx) => (
            <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="font-semibold text-sm text-slate-900 dark:text-white mb-1">{field.name}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{field.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      <div>
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          Pro Tips
        </h4>
        <div className="space-y-2">
          {help.tips.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <span className="text-violet-500 font-bold mt-0.5 flex-shrink-0">•</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Reference Card */}
      <div className="p-4 bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 border border-violet-200 dark:border-violet-800/50 rounded-lg">
        <div className="flex items-start gap-2 mb-2">
          <CheckCircle className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold text-violet-900 dark:text-violet-300 mb-1">Remember:</div>
            <div className="text-xs text-violet-700 dark:text-violet-400">
              Configure all fields carefully. A green badge will appear on the node when it's properly configured.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Node Configuration Form Component
function NodeConfigForm({ node, onUpdate }) {
  const [config, setConfig] = React.useState(node.data.config || {});
  
  const updateConfig = (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate(newConfig);
  };

  const nodeType = node.data.id;

  // 1. TICKET CREATED TRIGGER
  if (nodeType === 'ticket_created') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">
            🎯 This workflow will start when a new ticket is created that matches the filters below.
          </p>
        </div>

        <Card className="bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100">Filter Criteria (Optional)</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Leave empty to trigger for all new tickets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Department Filter
                </label>
                <select
                  value={config.department || ''}
                  onChange={(e) => updateConfig('department', e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 dark:focus:border-violet-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-all duration-200 hover:border-violet-400 dark:hover:border-violet-600 cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2">All Departments</option>
                  <option value="technical" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Technical Support</option>
                  <option value="billing" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Billing</option>
                  <option value="sales" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Sales</option>
                  <option value="general" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">General Support</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Priority Filter
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'low', label: 'Low', color: 'slate' },
                    { value: 'medium', label: 'Medium', color: 'blue' },
                    { value: 'high', label: 'High', color: 'orange' },
                    { value: 'urgent', label: 'Urgent', color: 'red' }
                  ].map((priority) => (
                    <StyledCheckbox
                      key={priority.value}
                      checked={(config.priorities || []).includes(priority.value)}
                      onChange={(e) => {
                        const priorities = config.priorities || [];
                        updateConfig('priorities', e.target.checked 
                          ? [...priorities, priority.value]
                          : priorities.filter(p => p !== priority.value)
                        );
                      }}
                      label={priority.label}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Category Filter
                </label>
                <input 
                  type="text"
                  value={config.category || ''}
                  onChange={(e) => updateConfig('category', e.target.value)}
                  placeholder="e.g., Technical, Billing"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. TICKET UPDATED TRIGGER
  if (nodeType === 'ticket_updated') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-lg">
          <p className="text-sm text-orange-700 dark:text-orange-300">
            🔄 This workflow triggers when ticket fields change. Important for SLA resets!
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Watch These Fields</h3>
          <p className="text-xs text-slate-400 mb-4">Select which field changes should trigger this workflow</p>
          
          <div className="space-y-2.5">
            {[
              { id: 'priority', label: 'Priority Changed', desc: 'When ticket priority is updated' },
              { id: 'status', label: 'Status Changed', desc: 'When ticket status changes' },
              { id: 'department', label: 'Department Changed', desc: 'When moved to different department' },
              { id: 'assignee', label: 'Assigned User Changed', desc: 'When reassigned to another agent' },
              { id: 'comment', label: 'Comment Added', desc: 'When new comment is posted' },
            ].map((field) => (
              <div key={field.id} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div 
                  onClick={() => {
                    const fields = config.watchFields || [];
                    updateConfig('watchFields', fields.includes(field.id) 
                      ? fields.filter(f => f !== field.id)
                      : [...fields, field.id]
                    );
                  }}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0 mt-0.5 ${
                    (config.watchFields || []).includes(field.id)
                      ? 'bg-violet-600 border-violet-600' 
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                  }`}
                >
                  {(config.watchFields || []).includes(field.id) && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{field.label}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{field.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. TIME-BASED TRIGGER (SCHEDULER)
  if (nodeType === 'time_scheduler') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            ⏰ Runs periodically to evaluate SLA expiry and trigger actions
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Schedule Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Run Every</label>
              <div className="flex gap-2">
                <input 
                  type="number"
                  value={config.interval || 5}
                  onChange={(e) => updateConfig('interval', parseInt(e.target.value))}
                  className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  min="1"
                />
                <select
                  value={config.intervalUnit || 'minutes'}
                  onChange={(e) => updateConfig('intervalUnit', e.target.value)}
                  className="flex-1 px-3 py-2.5 border-2 border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 dark:focus:border-violet-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-all duration-200 hover:border-violet-400 dark:hover:border-violet-600 cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="minutes" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2">Minutes</option>
                  <option value="hours" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Hours</option>
                </select>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Recommended: 1-5 minutes for SLA monitoring</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Execution Mode</label>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <input
                    type="radio"
                    id="mode-24x7"
                    checked={config.executionMode === '24x7' || !config.executionMode}
                    onChange={() => updateConfig('executionMode', '24x7')}
                    className="w-4 h-4 text-violet-600"
                  />
                  <label htmlFor="mode-24x7" className="flex-1 cursor-pointer">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">24/7 Mode</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Run continuously</div>
                  </label>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <input
                    type="radio"
                    id="mode-business"
                    checked={config.executionMode === 'business_hours'}
                    onChange={() => updateConfig('executionMode', 'business_hours')}
                    className="w-4 h-4 text-violet-600"
                  />
                  <label htmlFor="mode-business" className="flex-1 cursor-pointer">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">Business Hours Only</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Run during business hours only</div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. TRIGGER (OTHER TYPES - GENERIC)
  if (nodeType.includes('trigger') || nodeType.includes('changed') || nodeType.includes('response')) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Trigger Conditions</h3>
          <p className="text-xs text-slate-400 mb-4">Define when this trigger should activate</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Priority Filter</label>
              <div className="space-y-2">
                {[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' }
                ].map((priority) => (
                  <StyledCheckbox
                    key={priority.value}
                    checked={(config.priorities || []).includes(priority.value)}
                    onChange={(e) => {
                      const priorities = config.priorities || [];
                      updateConfig('priorities', e.target.checked 
                        ? [...priorities, priority.value]
                        : priorities.filter(p => p !== priority.value)
                      );
                    }}
                    label={priority.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category Filter</label>
              <input 
                type="text"
                value={config.category || ''}
                onChange={(e) => updateConfig('category', e.target.value)}
                placeholder="e.g., Technical, Billing"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. START SLA TIMER
  if (nodeType === 'start_sla_timer') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300">
            ▶️ Starts a countdown timer based on SLA policy rules
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">SLA Policy Selection</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select SLA Policy</label>
              <select
                value={config.slaPolicy || ''}
                onChange={(e) => updateConfig('slaPolicy', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">Select policy...</option>
                <option value="high">High Priority (2 hours response, 8 hours resolution)</option>
                <option value="medium">Medium Priority (4 hours response, 24 hours resolution)</option>
                <option value="low">Low Priority (8 hours response, 48 hours resolution)</option>
                <option value="custom">Custom Policy</option>
              </select>
            </div>

            {config.slaPolicy === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Response SLA Duration</label>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      value={config.responseDuration || 0}
                      onChange={(e) => updateConfig('responseDuration', parseInt(e.target.value))}
                      className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      min="0"
                    />
                    <select
                      value={config.responseDurationUnit || 'hours'}
                      onChange={(e) => updateConfig('responseDurationUnit', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Resolution SLA Duration</label>
                  <div className="flex gap-2">
                    <input 
                      type="number"
                      value={config.resolutionDuration || 0}
                      onChange={(e) => updateConfig('resolutionDuration', parseInt(e.target.value))}
                      className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                      min="0"
                    />
                    <select
                      value={config.resolutionDurationUnit || 'hours'}
                      onChange={(e) => updateConfig('resolutionDurationUnit', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Timer Mode</label>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <input
                    type="radio"
                    id="timer-24x7"
                    checked={config.timerMode === '24x7' || !config.timerMode}
                    onChange={() => updateConfig('timerMode', '24x7')}
                    className="w-4 h-4 text-violet-600"
                  />
                  <label htmlFor="timer-24x7" className="flex-1 cursor-pointer">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">24/7 Timer</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Count all hours</div>
                  </label>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <input
                    type="radio"
                    id="timer-business"
                    checked={config.timerMode === 'business_hours'}
                    onChange={() => updateConfig('timerMode', 'business_hours')}
                    className="w-4 h-4 text-violet-600"
                  />
                  <label htmlFor="timer-business" className="flex-1 cursor-pointer">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">Business Hours Only</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Count only business hours</div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 6. PAUSE/RESUME SLA
  if (nodeType === 'pause_sla' || nodeType === 'resume_sla') {
    const isPause = nodeType === 'pause_sla';
    return (
      <div className="space-y-6">
        <div className={`p-4 ${isPause ? 'bg-orange-600/10 border-orange-600/20' : 'bg-green-600/10 border-green-600/20'} border rounded-lg`}>
          <p className={`text-sm ${isPause ? 'text-orange-300' : 'text-green-300'}`}>
            {isPause ? '⏸️ Pause the SLA timer when specific conditions are met' : '▶️ Resume the SLA timer from paused state'}
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">{isPause ? 'Pause' : 'Resume'} Conditions</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{isPause ? 'Pause When Status' : 'Resume When Status'}</label>
              <select
                value={config.statusCondition || ''}
                onChange={(e) => updateConfig('statusCondition', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">Select status...</option>
                <option value="waiting_customer">Waiting for Customer</option>
                <option value="on_hold">On Hold</option>
                <option value="pending_third_party">Pending Third Party</option>
                {!isPause && <option value="active">Active / Open</option>}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Reason (Optional)</label>
              <input 
                type="text"
                value={config.reason || ''}
                onChange={(e) => updateConfig('reason', e.target.value)}
                placeholder={isPause ? "e.g., Waiting for customer response" : "e.g., Customer responded"}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div 
                onClick={() => updateConfig('addNote', !config.addNote)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0 mt-0.5 ${
                  config.addNote 
                    ? 'bg-violet-600 border-violet-600' 
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                }`}
              >
                {config.addNote && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
              <label className="cursor-pointer flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">Add internal note to ticket</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Log this action in ticket history</div>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 7. CHECK SLA REMAINING TIME
  if (nodeType === 'check_sla_time') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            ⏱️ Calculates SLA metrics: time elapsed, remaining, at-risk status, breach status
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Output Configuration</h3>
          <p className="text-xs text-slate-400 mb-4">This node automatically calculates and outputs:</p>
          
          <div className="space-y-2">
            {[
              { label: 'Time Elapsed', desc: 'How much time has passed' },
              { label: 'Time Remaining', desc: 'Time left until SLA breach' },
              { label: 'Time Since Last Pause', desc: 'Time since timer was paused' },
              { label: 'At-Risk Status', desc: 'True if < 20% time remaining' },
              { label: 'Breached Status', desc: 'True if SLA time exceeded' },
            ].map((item, idx) => (
              <div key={idx} className="p-3 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="text-sm font-medium text-slate-900 dark:text-white">{item.label}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{item.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/50 rounded-lg">
            <p className="text-xs text-violet-700 dark:text-violet-300">
              💡 Use these values in subsequent condition nodes to trigger escalations
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 8. SLA WARNING THRESHOLD
  if (nodeType === 'sla_warning') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            ⚠️ Trigger actions at 50% or 80% of SLA time to prevent breaches
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Warning Thresholds</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Alert at</label>
              <select
                value={config.threshold || '80'}
                onChange={(e) => updateConfig('threshold', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="50">50% of SLA time</option>
                <option value="75">75% of SLA time</option>
                <option value="80">80% of SLA time</option>
                <option value="90">90% of SLA time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Alert Priority Level</label>
              <select
                value={config.alertPriority || 'medium'}
                onChange={(e) => updateConfig('alertPriority', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="low">Low - Information</option>
                <option value="medium">Medium - Warning</option>
                <option value="high">High - Urgent Attention</option>
              </select>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div 
                onClick={() => updateConfig('preventDuplicates', !config.preventDuplicates)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0 mt-0.5 ${
                  config.preventDuplicates !== false
                    ? 'bg-violet-600 border-violet-600' 
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                }`}
              >
                {config.preventDuplicates !== false && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
              <label className="cursor-pointer flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">Prevent duplicate alerts</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Only fire this warning once per ticket</div>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 9. SLA BREACH NODE
  if (nodeType === 'sla_breach') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">
            🚨 Execute actions when SLA time is exceeded (breached)
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Breach Actions</h3>
          <p className="text-xs text-slate-400 mb-4">Select what happens when SLA is breached</p>
          
          <div className="space-y-2.5">
            {[
              { id: 'create_escalation', label: 'Create Escalation Ticket', desc: 'Open high-priority escalation ticket' },
              { id: 'send_email', label: 'Send Email Alert', desc: 'Notify management of breach' },
              { id: 'reassign', label: 'Auto-Reassign Ticket', desc: 'Escalate to senior agent/supervisor' },
              { id: 'change_priority', label: 'Change Priority to Urgent', desc: 'Mark ticket as urgent' },
              { id: 'add_tag', label: 'Add "SLA Breached" Tag', desc: 'Tag for reporting and tracking' },
            ].map((action) => (
              <div key={action.id} className="flex items-start gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">
                <div 
                  onClick={() => {
                    const actions = config.breachActions || [];
                    updateConfig('breachActions', actions.includes(action.id) 
                      ? actions.filter(a => a !== action.id)
                      : [...actions, action.id]
                    );
                  }}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0 mt-0.5 ${
                    (config.breachActions || []).includes(action.id)
                      ? 'bg-violet-600 border-violet-600' 
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                  }`}
                >
                  {(config.breachActions || []).includes(action.id) && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">{action.label}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{action.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 10. CONDITION / IF NODE
  if (nodeType === 'condition_if' || (nodeType.includes('condition') && !nodeType.includes('check'))) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            🔀 Check any field and route workflow to True/False paths
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Condition Logic</h3>
          <p className="text-xs text-slate-400 mb-4">Define the condition to check</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Field to Check</label>
              <select
                value={config.field || ''}
                onChange={(e) => updateConfig('field', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">Select field...</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
                <option value="category">Category</option>
                <option value="department">Department</option>
                <option value="assignee">Assignee</option>
                <option value="time_remaining">SLA Time Remaining (minutes)</option>
                <option value="time_elapsed">SLA Time Elapsed (minutes)</option>
                <option value="at_risk">At-Risk Status (boolean)</option>
                <option value="breached">Breached Status (boolean)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Operator</label>
              <select
                value={config.operator || ''}
                onChange={(e) => updateConfig('operator', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="equals">Equals (=)</option>
                <option value="not_equals">Not Equals (!=)</option>
                <option value="greater_than">Greater Than (&gt;)</option>
                <option value="less_than">Less Than (&lt;)</option>
                <option value="greater_or_equal">Greater or Equal (≥)</option>
                <option value="less_or_equal">Less or Equal (≤)</option>
                <option value="contains">Contains</option>
                <option value="not_contains">Does Not Contain</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Comparison Value</label>
              <input 
                type="text"
                value={config.value || ''}
                onChange={(e) => updateConfig('value', e.target.value)}
                placeholder={config.field === 'priority' ? "e.g., High" : config.field === 'time_remaining' ? "e.g., 10" : "Comparison value"}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/50 rounded-lg">
          <h4 className="text-sm font-semibold text-violet-300 mb-2">How It Works:</h4>
          <ul className="text-xs text-violet-200 space-y-1">
            <li>• If condition is <strong>TRUE</strong> → Follow right output path</li>
            <li>• If condition is <strong>FALSE</strong> → Follow alternate path</li>
            <li>• Example: IF priority = "High" → Escalate immediately</li>
          </ul>
        </div>
      </div>
    );
  }

  // 11. CHECK NODES (Business Hours, Time Remaining, etc.)
  if (nodeType.includes('check_') || nodeType.includes('business_hours')) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/50 rounded-lg">
          <p className="text-sm text-teal-700 dark:text-teal-300">
            ✅ Check specific conditions and output True/False
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Check Configuration</h3>
          <p className="text-xs text-slate-400 mb-4">This node automatically evaluates the condition and returns True/False</p>
          
          {nodeType === 'check_business_hours' && (
            <div className="p-3 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <p className="text-sm text-white mb-2">Checks if current time is within business hours</p>
              <p className="text-xs text-slate-400">Business hours are defined in your SLA policy settings</p>
            </div>
          )}

          {nodeType === 'check_time_remaining' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Alert If Time Remaining</label>
                <div className="flex gap-2">
                  <select
                    value={config.operator || 'less_than'}
                    onChange={(e) => updateConfig('operator', e.target.value)}
                    className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="less_than">&lt;</option>
                    <option value="greater_than">&gt;</option>
                  </select>
                  <input 
                    type="number"
                    value={config.threshold || 10}
                    onChange={(e) => updateConfig('threshold', parseInt(e.target.value))}
                    className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    min="1"
                  />
                  <select
                    value={config.unit || 'minutes'}
                    onChange={(e) => updateConfig('unit', e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }


  // 10. ESCALATION NODE
  if (nodeType.includes('escalation') || nodeType.includes('escalate')) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-lg">
          <p className="text-sm text-orange-700 dark:text-orange-300">
            📈 Configure multi-level escalation based on SLA state
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Escalation Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Escalation Level</label>
              <select
                value={config.escalationLevel || '1'}
                onChange={(e) => updateConfig('escalationLevel', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="1">Level 1 - Supervisor</option>
                <option value="2">Level 2 - Manager</option>
                <option value="3">Level 3 - Management/Director</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Trigger Threshold</label>
              <select
                value={config.triggerThreshold || '80'}
                onChange={(e) => updateConfig('triggerThreshold', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="50">At 50% of SLA time</option>
                <option value="80">At 80% of SLA time</option>
                <option value="breach">On SLA Breach</option>
              </select>
            </div>

            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-2">Escalation Actions</h4>
              <div className="space-y-2">
                {[
                  { id: 'notify_agent', label: 'Notify Agent' },
                  { id: 'notify_supervisor', label: 'Notify Supervisor' },
                  { id: 'auto_reassign', label: 'Auto-Reassign to Senior Agent' },
                  { id: 'mark_urgent', label: 'Mark as Urgent' },
                  { id: 'internal_note', label: 'Post Internal Note' },
                ].map((action) => (
                  <div key={action.id} className="flex items-center gap-3 p-2.5 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <div 
                      onClick={() => {
                        const actions = config.escalationActions || [];
                        updateConfig('escalationActions', actions.includes(action.id) 
                          ? actions.filter(a => a !== action.id)
                          : [...actions, action.id]
                        );
                      }}
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                        (config.escalationActions || []).includes(action.id)
                          ? 'bg-violet-600 border-violet-600' 
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {(config.escalationActions || []).includes(action.id) && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <label className="text-sm cursor-pointer text-white">{action.label}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 11. SEND EMAIL/SMS/WHATSAPP
  if (nodeType.includes('send_email') || nodeType.includes('send_sms') || nodeType.includes('send_notification')) {
    const isEmail = nodeType.includes('email');
    const isSMS = nodeType.includes('sms');
    return (
      <div className="space-y-6">
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-lg">
          <p className="text-sm text-purple-700 dark:text-purple-300">
            📧 {isEmail ? 'Send email notifications' : isSMS ? 'Send SMS/WhatsApp alerts' : 'Send app/Slack/Teams notifications'}
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Notification Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Recipient</label>
              <select
                value={config.recipient || ''}
                onChange={(e) => updateConfig('recipient', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">Select recipient...</option>
                <option value="customer">Customer</option>
                <option value="assignee">Assigned Agent</option>
                <option value="team_lead">Team Lead</option>
                <option value="manager">Manager</option>
                <option value="department_head">Department Head</option>
                <option value="custom">Custom Email/Phone</option>
              </select>
            </div>

            {config.recipient === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{isEmail ? 'Email Address' : 'Phone Number'}</label>
                <input 
                  type="text"
                  value={config.customRecipient || ''}
                  onChange={(e) => updateConfig('customRecipient', e.target.value)}
                  placeholder={isEmail ? "email@example.com" : "+1234567890"}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{isEmail ? 'Email Subject' : 'Message Title'}</label>
              <input 
                type="text"
                value={config.subject || ''}
                onChange={(e) => updateConfig('subject', e.target.value)}
                placeholder="SLA Warning: Ticket #{{ticketId}}"
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Message Template</label>
              <textarea
                value={config.messageTemplate || ''}
                onChange={(e) => updateConfig('messageTemplate', e.target.value)}
                placeholder="Your ticket #{{ticketId}} SLA timer has {{timeRemaining}} minutes remaining..."
                rows={5}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 resize-none font-mono"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Use dynamic variables: {'{{ticketId}}'}, {'{{priority}}'}, {'{{timeRemaining}}'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 12. UPDATE TICKET FIELD
  if (nodeType === 'update_field') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            ✏️ Automatically modify ticket fields (priority, status, tags, etc.)
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Field Update Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Field to Update</label>
              <select
                value={config.fieldToUpdate || ''}
                onChange={(e) => updateConfig('fieldToUpdate', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">Select field...</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
                <option value="category">Category</option>
                <option value="tags">Tags</option>
                <option value="custom_field">Custom Field</option>
              </select>
            </div>

            {config.fieldToUpdate === 'priority' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Priority</label>
                <select
                  value={config.newValue || ''}
                  onChange={(e) => updateConfig('newValue', e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 dark:focus:border-violet-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-all duration-200 hover:border-violet-400 dark:hover:border-violet-600 cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="low" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2">Low</option>
                  <option value="medium" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Medium</option>
                  <option value="high" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">High</option>
                  <option value="urgent" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Urgent</option>
                </select>
              </div>
            )}

            {config.fieldToUpdate === 'status' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Status</label>
                <select
                  value={config.newValue || ''}
                  onChange={(e) => updateConfig('newValue', e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 dark:focus:border-violet-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-all duration-200 hover:border-violet-400 dark:hover:border-violet-600 cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="open" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2">Open</option>
                  <option value="in_progress" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">In Progress</option>
                  <option value="waiting_customer" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Waiting for Customer</option>
                  <option value="resolved" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Resolved</option>
                  <option value="closed" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Closed</option>
                </select>
              </div>
            )}

            {config.fieldToUpdate && config.fieldToUpdate !== 'priority' && config.fieldToUpdate !== 'status' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">New Value</label>
                <input 
                  type="text"
                  value={config.newValue || ''}
                  onChange={(e) => updateConfig('newValue', e.target.value)}
                  placeholder="Enter new value"
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
              </div>
            )}

            {config.fieldToUpdate && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Update Mode</label>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <input
                      type="radio"
                      id="mode-overwrite"
                      checked={config.updateMode === 'overwrite' || !config.updateMode}
                      onChange={() => updateConfig('updateMode', 'overwrite')}
                      className="w-4 h-4 text-violet-600"
                    />
                    <label htmlFor="mode-overwrite" className="flex-1 cursor-pointer text-sm text-slate-900 dark:text-white">
                      Overwrite (Replace existing value)
                    </label>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <input
                      type="radio"
                      id="mode-append"
                      checked={config.updateMode === 'append'}
                      onChange={() => updateConfig('updateMode', 'append')}
                      className="w-4 h-4 text-violet-600"
                    />
                    <label htmlFor="mode-append" className="flex-1 cursor-pointer text-sm text-slate-900 dark:text-white">
                      Append (Add to existing value)
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 13. ASSIGN TICKET
  if (nodeType === 'assign_ticket') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800/50 rounded-lg">
          <p className="text-sm text-pink-700 dark:text-pink-300">
            👤 Auto-assign tickets to users, teams, or departments
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Assignment Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Assign To</label>
              <select
                value={config.assignTo || ''}
                onChange={(e) => updateConfig('assignTo', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">Select assignment...</option>
                <option value="specific_user">Specific User</option>
                <option value="team">Team</option>
                <option value="department">Department</option>
                <option value="round_robin">Round Robin (Load Balance)</option>
              </select>
            </div>

            {config.assignTo === 'specific_user' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select User</label>
                <select
                  value={config.userId || ''}
                  onChange={(e) => updateConfig('userId', e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 dark:focus:border-violet-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-all duration-200 hover:border-violet-400 dark:hover:border-violet-600 cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2">Select user...</option>
                  <option value="senior_agent" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Senior Agent</option>
                  <option value="team_lead" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Team Lead</option>
                  <option value="manager" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Manager</option>
                </select>
              </div>
            )}

            {config.assignTo === 'team' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Team</label>
                <select
                  value={config.teamId || ''}
                  onChange={(e) => updateConfig('teamId', e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 dark:focus:border-violet-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-all duration-200 hover:border-violet-400 dark:hover:border-violet-600 cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2">Select team...</option>
                  <option value="support_team" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Support Team</option>
                  <option value="escalation_team" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Escalation Team</option>
                  <option value="management_team" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Management Team</option>
                </select>
              </div>
            )}

            <div className="flex items-start gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div 
                onClick={() => updateConfig('notifyAssignee', !config.notifyAssignee)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0 mt-0.5 ${
                  config.notifyAssignee !== false
                    ? 'bg-violet-600 border-violet-600' 
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                }`}
              >
                {config.notifyAssignee !== false && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
              <label className="cursor-pointer flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">Notify assignee</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Send notification to assigned user</div>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 14. ADD INTERNAL NOTE
  if (nodeType === 'add_note') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800/50 rounded-lg">
          <p className="text-sm text-cyan-700 dark:text-cyan-300">
            📝 Add internal notes/comments to tickets
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Note Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Note Content</label>
              <textarea
                value={config.noteContent || ''}
                onChange={(e) => updateConfig('noteContent', e.target.value)}
                placeholder="SLA escalation triggered. Ticket reassigned to supervisor."
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 resize-none"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Supports variables: {'{{ticketId}}'}, {'{{timeRemaining}}'}</p>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
              <div 
                onClick={() => updateConfig('visibleToCustomer', !config.visibleToCustomer)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition-all flex-shrink-0 mt-0.5 ${
                  config.visibleToCustomer
                    ? 'bg-violet-600 border-violet-600' 
                    : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                }`}
              >
                {config.visibleToCustomer && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
              <label className="cursor-pointer flex-1">
                <div className="text-sm font-medium text-slate-900 dark:text-white">Visible to customer</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Make this note visible in customer portal</div>
              </label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 15. WEBHOOK
  if (nodeType === 'webhook') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-lg">
          <p className="text-sm text-purple-700 dark:text-purple-300">
            🔗 Trigger external webhooks (Slack, Teams, custom APIs)
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Webhook Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Webhook URL</label>
              <input 
                type="url"
                value={config.webhookUrl || ''}
                onChange={(e) => updateConfig('webhookUrl', e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">HTTP Method</label>
              <select
                value={config.httpMethod || 'POST'}
                onChange={(e) => updateConfig('httpMethod', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">JSON Payload</label>
              <textarea
                value={config.payload || ''}
                onChange={(e) => updateConfig('payload', e.target.value)}
                placeholder='{\n  "ticketId": "{{ticketId}}",\n  "priority": "{{priority}}",\n  "message": "SLA alert"\n}'
                rows={6}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 resize-none font-mono"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Valid JSON with dynamic variables</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 16. WAIT/DELAY NODE
  if (nodeType === 'wait_delay') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800/50 rounded-lg">
          <p className="text-sm text-cyan-700 dark:text-cyan-300">
            ⏸️ Pause workflow execution for a specific time or until an event occurs
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Wait Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Wait Type</label>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <input
                    type="radio"
                    id="wait-time"
                    checked={config.waitType === 'time' || !config.waitType}
                    onChange={() => updateConfig('waitType', 'time')}
                    className="w-4 h-4 text-violet-600"
                  />
                  <label htmlFor="wait-time" className="flex-1 cursor-pointer text-sm text-slate-900 dark:text-white">
                    Wait for specific time
                  </label>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <input
                    type="radio"
                    id="wait-event"
                    checked={config.waitType === 'event'}
                    onChange={() => updateConfig('waitType', 'event')}
                    className="w-4 h-4 text-violet-600"
                  />
                  <label htmlFor="wait-event" className="flex-1 cursor-pointer text-sm text-slate-900 dark:text-white">
                    Wait until event occurs
                  </label>
                </div>
              </div>
            </div>

            {(config.waitType === 'time' || !config.waitType) && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Delay Duration</label>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    value={config.delayDuration || 30}
                    onChange={(e) => updateConfig('delayDuration', parseInt(e.target.value))}
                    className="w-24 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    min="1"
                  />
                  <select
                    value={config.delayUnit || 'minutes'}
                    onChange={(e) => updateConfig('delayUnit', e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
            )}

            {config.waitType === 'event' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Wait Until</label>
                <select
                  value={config.waitEvent || ''}
                  onChange={(e) => updateConfig('waitEvent', e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 dark:focus:border-violet-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-all duration-200 hover:border-violet-400 dark:hover:border-violet-600 cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2">Select event...</option>
                  <option value="status_change" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Status changes</option>
                  <option value="customer_response" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Customer responds</option>
                  <option value="assignment_change" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">Ticket reassigned</option>
                  <option value="sla_threshold" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-2 hover:bg-blue-50 dark:hover:bg-slate-700">SLA threshold reached</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 17. SWITCH/MULTI-BRANCH NODE
  if (nodeType === 'switch_node') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-lg">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            🔀 Route workflow to different paths based on field values (multi-branch logic)
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Switch Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Key Field</label>
              <select
                value={config.keyField || ''}
                onChange={(e) => updateConfig('keyField', e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">Select field...</option>
                <option value="priority">Priority</option>
                <option value="department">Department</option>
                <option value="category">Category</option>
                <option value="status">Status</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Cases</label>
              <div className="space-y-2">
                {(config.cases || [{ label: 'Case 1', value: '' }]).map((caseItem, idx) => (
                  <div key={idx} className="p-3 bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <input 
                      type="text"
                      value={caseItem.value || ''}
                      onChange={(e) => {
                        const newCases = [...(config.cases || [])];
                        newCases[idx] = { ...newCases[idx], value: e.target.value };
                        updateConfig('cases', newCases);
                      }}
                      placeholder={`When ${config.keyField || 'field'} = ...`}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                ))}
              </div>
              <button 
                onClick={() => updateConfig('cases', [...(config.cases || []), { label: `Case ${(config.cases || []).length + 1}`, value: '' }])}
                className="w-full mt-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium transition-colors"
              >
                + Add Case
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 18. CODE NODE
  if (nodeType === 'code_node') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-lg">
          <p className="text-sm text-purple-700 dark:text-purple-300">
            💻 Execute custom JavaScript for calculations, transformations, or custom logic
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Code Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">JavaScript Code</label>
              <textarea
                value={config.code || ''}
                onChange={(e) => updateConfig('code', e.target.value)}
                placeholder="// Available variables: ticket, sla, context\n\nreturn {\n  result: ticket.priority === 'high',\n  message: 'Calculation complete'\n};"
                rows={12}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none font-mono"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Return an object with your calculated values</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 19. MERGE NODE
  if (nodeType === 'merge_node') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800/50 rounded-lg">
          <p className="text-sm text-cyan-700 dark:text-cyan-300">
            🔗 Combine multiple workflow branches into a single unified flow
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Merge Configuration</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Merge Mode</label>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <input
                    type="radio"
                    id="merge-wait-all"
                    checked={config.mergeMode === 'wait_all' || !config.mergeMode}
                    onChange={() => updateConfig('mergeMode', 'wait_all')}
                    className="w-4 h-4 text-violet-600"
                  />
                  <label htmlFor="merge-wait-all" className="flex-1 cursor-pointer">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">Wait for all branches</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Continue only when all paths complete</div>
                  </label>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                  <input
                    type="radio"
                    id="merge-wait-any"
                    checked={config.mergeMode === 'wait_any'}
                    onChange={() => updateConfig('mergeMode', 'wait_any')}
                    className="w-4 h-4 text-violet-600"
                  />
                  <label htmlFor="merge-wait-any" className="flex-1 cursor-pointer">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">Wait for any branch</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">Continue when first path completes</div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 20. NOTE NODE
  if (nodeType === 'note_node') {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            📝 Add documentation and comments to your workflow canvas
          </p>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">Note Content</h3>
          
          <div className="space-y-4">
            <div>
              <textarea
                value={config.noteText || ''}
                onChange={(e) => updateConfig('noteText', e.target.value)}
                placeholder="Add notes about this workflow section..."
                rows={8}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default Configuration
  return (
    <div className="space-y-4">
      <div className="p-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
        <Settings className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-600 dark:text-slate-400">No configuration available for this node type</p>
      </div>
    </div>
  );
}

export const getServerSideProps = withAuth();


