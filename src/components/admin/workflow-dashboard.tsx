"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    ReactFlow,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    useReactFlow,
    ReactFlowProvider,
    Handle,
    Position,
    Node,
    Edge,
    ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    CheckCircle2,
    Clock,
    FileText,
    XCircle,
    RefreshCcw,
    PlayCircle,
    Layout
} from "lucide-react";

// --- Types ---
type SubmissionStatus = "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED" | "REVISED";
type ExtendedStatus = SubmissionStatus | "AD_ELIGIBLE" | "AD_INELIGIBLE";

// --- Config ---
const NODE_WIDTH = 280;
const NODE_HEIGHT = 160;

const DAGRE_RANK_DIR = "LR"; // Left to Right

const STATUS_CONFIG: Record<ExtendedStatus, {
    label: string;
    description: string;
    color: string;
    icon: React.ElementType;
}> = {
    PENDING: {
        label: "대기중 (Pending)",
        description: "STAR가 영상을 제출했거나, 수정본을 다시 올린 상태",
        color: "from-amber-500 to-orange-500",
        icon: Clock,
    },
    IN_REVIEW: {
        label: "피드백중 (In Review)",
        description: "관리자 피드백 작성 중",
        color: "from-blue-500 to-indigo-500",
        icon: FileText,
    },
    APPROVED: {
        label: "승인됨 (Approved)",
        description: "최종 승인 완료",
        color: "from-emerald-500 to-green-500",
        icon: CheckCircle2,
    },
    AD_ELIGIBLE: {
        label: "광고 가능 (Ad Eligible)",
        description: "광고가 송출될 수 있는 승인된 영상",
        color: "from-indigo-500 to-blue-600",
        icon: CheckCircle2,
    },
    AD_INELIGIBLE: {
        label: "광고 불가 (Ad Ineligible)",
        description: "광고 송출이 제한된 승인된 영상",
        color: "from-slate-600 to-slate-800",
        icon: XCircle,
    },
    REJECTED: {
        label: "반려됨 (Rejected)",
        description: "수정 요청됨 (재제출 필요)",
        color: "from-red-500 to-pink-500",
        icon: XCircle,
    },
    REVISED: {
        label: "수정됨 (Revised)",
        description: "수정본 대기 상태",
        color: "from-purple-500 to-violet-500",
        icon: RefreshCcw,
    }
};

// --- Custom Node Component ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomNode = ({ data }: { data: any }) => {
    const router = useRouter();
    const { status, label, count, description, color, icon: Icon } = data;
    const [isHovered, setIsHovered] = React.useState(false);

    // Map status to filter parameter for reviews page
    const getFilterForStatus = (status: ExtendedStatus): string => {
        switch (status) {
            case "PENDING":
            case "REVISED":
                return "PENDING";
            case "IN_REVIEW":
                return "IN_REVIEW";
            case "APPROVED":
            case "AD_ELIGIBLE":
            case "AD_INELIGIBLE":
            case "REJECTED":
                return "COMPLETED";
            default:
                return "ALL";
        }
    };

    const handleNodeClick = () => {
        const filter = getFilterForStatus(status);
        router.push(`/admin/reviews?filter=${filter}`);
    };

    return (
        <div
            className="relative cursor-pointer"
            style={{ width: NODE_WIDTH }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleNodeClick}
            title="클릭하여 목록 보기"
        >
            {/* Handles for React Flow */}
            <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-3 !h-3 opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Glow Effect */}
            <div className={cn(
                "absolute -inset-0.5 rounded-2xl bg-gradient-to-r opacity-40 blur transition duration-500",
                isHovered ? "opacity-80" : "opacity-40",
                color
            )} />

            {/* Card Content */}
            <div className="relative flex h-full flex-col justify-between rounded-xl border border-border bg-slate-900/90 p-5 shadow-xl">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br shadow-lg", color)}>
                            <Icon className="h-6 w-6 text-foreground" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-100">{label.split('(')[0]}</h3>
                            <p className="text-xs font-medium text-slate-400">{label.split('(')[1]?.replace(')', '')}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-2xl font-bold tabular-nums text-foreground">{count}</span>
                        <span className="text-[10px] text-slate-500">VIDEOS</span>
                    </div>
                </div>

                <div className="mt-4">
                    <p className="text-xs leading-relaxed text-slate-400">
                        {description}
                    </p>
                </div>

                {/* Hover Action Guide */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 overflow-hidden border-t border-border/50 pt-2"
                        >
                            <div className="flex items-center gap-2 text-[10px] text-slate-300">
                                <PlayCircle className="h-3 w-3 text-emerald-400" />
                                <span>Click to view {count} videos</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <Handle type="source" position={Position.Right} className="!bg-slate-500 !w-3 !h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
};

// --- DAGRE Layout Logic ---
const getLayoutedElements = (nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({ rankdir: DAGRE_RANK_DIR });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - NODE_WIDTH / 2,
                y: nodeWithPosition.y - NODE_HEIGHT / 2,
            },
            targetPosition: Position.Left,
            sourcePosition: Position.Right,
        };
    });

    return { nodes: layoutedNodes, edges };
};

// --- Main Inner Component (Using Provider) ---
const LayoutFlow = ({ counts, adEligibleCount, adIneligibleCount }: { counts: Record<SubmissionStatus, number>, adEligibleCount?: number, adIneligibleCount?: number }) => {
    const { fitView } = useReactFlow();

    // Define Nodes & Edges (Data Driven)
    const initialData = useMemo(() => {
        const nodes: Node[] = (Object.keys(STATUS_CONFIG) as ExtendedStatus[]).map((status) => ({
            id: status,
            type: 'custom',
            data: {
                status,
                ...STATUS_CONFIG[status],
                count: status === "AD_ELIGIBLE" ? (adEligibleCount || 0) :
                    status === "AD_INELIGIBLE" ? (adIneligibleCount || 0) :
                        counts[status as SubmissionStatus] || 0
            },
            position: { x: 0, y: 0 }, // Initial position, will be calculated by dagre
        }));

        const edges: Edge[] = [
            { id: 'e-pending-review', source: 'PENDING', target: 'IN_REVIEW', label: 'Feedback', animated: true, style: { stroke: '#3b82f6' } },
            { id: 'e-review-approved', source: 'IN_REVIEW', target: 'APPROVED', label: 'Approve', animated: true, style: { stroke: '#10b981' } },
            { id: 'e-review-rejected', source: 'IN_REVIEW', target: 'REJECTED', label: 'Reject', animated: true, style: { stroke: '#ef4444' } },
            { id: 'e-approved-ad-eligible', source: 'APPROVED', target: 'AD_ELIGIBLE', label: '광고 가능', animated: true, style: { stroke: '#4f46e5' } },
            { id: 'e-approved-ad-ineligible', source: 'APPROVED', target: 'AD_INELIGIBLE', label: '광고 불가', animated: true, style: { stroke: '#475569' } },
            { id: 'e-rejected-revised', source: 'REJECTED', target: 'REVISED', label: 'Wait Upload', animated: true, style: { stroke: '#a855f7' } },
            { id: 'e-revised-pending', source: 'REVISED', target: 'PENDING', label: 'Re-submit', animated: true, style: { stroke: '#f59e0b' } },
            { id: 'e-pending-approved', source: 'PENDING', target: 'APPROVED', label: 'Direct Pass', animated: true, style: { stroke: '#10b981', strokeDasharray: 5 } },
        ];

        return getLayoutedElements(nodes, edges);
    }, [counts, adEligibleCount, adIneligibleCount]);

    const [nodes, _setNodes, onNodesChange] = useNodesState(initialData.nodes);
    const [edges, _setEdges, onEdgesChange] = useEdgesState(initialData.edges);

    const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

    // Fit view on mount
    React.useEffect(() => {
        window.requestAnimationFrame(() => fitView({ padding: 0.2 }));
    }, [fitView, initialData]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
            className="bg-slate-950"
            minZoom={0.5}
            maxZoom={1.5}
        >
            <Background color="#334155" gap={20} size={1} />
            <Controls className="bg-slate-800 border-slate-700 fill-slate-300" />

            {/* Legend / Guide Overlay */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 rounded-xl border border-border bg-slate-900/80 p-4">
                <h4 className="mb-2 text-xs font-bold text-slate-300">Interactive Mode</h4>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <Layout className="h-3 w-3" />
                    <span>Scroll to Zoom, Drag to Pan</span>
                </div>
                <div className="mt-2 text-[9px] text-slate-500">
                    Auto-layout enabled by Dagre
                </div>
            </div>
        </ReactFlow>
    );
}

// --- Main Export Component ---
export function WorkflowDashboard({ counts, adEligibleCount, adIneligibleCount }: { counts: Record<SubmissionStatus, number>, adEligibleCount?: number, adIneligibleCount?: number }) {
    return (
        <div className="h-[500px] sm:h-[600px] md:h-[800px] w-full overflow-hidden rounded-2xl md:rounded-3xl border border-slate-800 shadow-2xl">
            <ReactFlowProvider>
                <LayoutFlow counts={counts} adEligibleCount={adEligibleCount} adIneligibleCount={adIneligibleCount} />
            </ReactFlowProvider>
        </div>
    );
}
