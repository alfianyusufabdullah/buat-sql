import { useState, useRef, useEffect, useCallback } from "react";
import { CONFIG } from "~/lib/utils";

interface Node {
    x: number;
    y: number;
}

export function useDiagramCanvas(tables: Node[], enums: Node[] = []) {
    const TABLE_WIDTH = CONFIG.TABLE_WIDTH;
    const TABLE_HEIGHT = CONFIG.TABLE_HEIGHT;

    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null!);
    const lastMousePos = useRef({ x: 0, y: 0 });

    const scaleRef = useRef(scale);
    const panRef = useRef(pan);

    useEffect(() => {
        scaleRef.current = scale;
        panRef.current = pan;
    }, [scale, pan]);

    // Initial centering
    useEffect(() => {
        const allNodes = [...tables, ...enums];
        if (hasInitialized || allNodes.length === 0) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const minX = Math.min(...allNodes.map(t => t.x));
        const maxX = Math.max(...allNodes.map(t => t.x + TABLE_WIDTH));
        const minY = Math.min(...allNodes.map(t => t.y));
        const maxY = Math.max(...allNodes.map(t => t.y + TABLE_HEIGHT));

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const canvasRect = canvas.getBoundingClientRect();
        const viewCenterX = canvasRect.width / 2;
        const viewCenterY = canvasRect.height / 2;

        setPan({
            x: viewCenterX - centerX,
            y: viewCenterY - centerY
        });
        setHasInitialized(true);
    }, [tables, enums, hasInitialized, TABLE_WIDTH, TABLE_HEIGHT]);

    const handleZoomIn = useCallback(() => setScale(s => Math.min(s + 0.1, 2)), []);
    const handleZoomOut = useCallback(() => setScale(s => Math.max(s - 0.1, 0.5)), []);

    const handleResetZoom = useCallback(() => {
        setScale(1);
        const allNodes = [...tables, ...enums];
        if (allNodes.length > 0 && canvasRef.current) {
            const minX = Math.min(...allNodes.map(t => t.x));
            const maxX = Math.max(...allNodes.map(t => t.x + TABLE_WIDTH));
            const minY = Math.min(...allNodes.map(t => t.y));
            const maxY = Math.max(...allNodes.map(t => t.y + TABLE_HEIGHT));
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const canvasRect = canvasRef.current.getBoundingClientRect();
            setPan({
                x: canvasRect.width / 2 - centerX,
                y: canvasRect.height / 2 - centerY
            });
        } else {
            setPan({ x: 0, y: 0 });
        }
    }, [tables, enums, TABLE_WIDTH, TABLE_HEIGHT]);

    const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
        const target = e.target as HTMLElement;

        if (target.closest('[role="dialog"]') ||
            target.closest('[data-radix-popper-content-wrapper]') ||
            target.closest('[data-radix-portal]') ||
            target.closest('.drag-handle') ||
            target.closest('.enum-handle') ||
            target.closest('button') ||
            target.closest('.no-pan')) {
            return;
        }

        setIsPanning(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isPanning) return;
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    }, [isPanning]);

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            setIsPanning(false);
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
            } else {
                e.preventDefault();
                e.stopImmediatePropagation();
            }

            const currentScale = scaleRef.current;
            const currentPan = panRef.current;

            const zoomSensitivity = 0.001;
            const delta = -e.deltaY * zoomSensitivity;

            const newScale = Math.min(Math.max(0.1, currentScale + delta), 3);

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const worldX = (mouseX - currentPan.x) / currentScale;
            const worldY = (mouseY - currentPan.y) / currentScale;

            const newPanX = mouseX - worldX * newScale;
            const newPanY = mouseY - worldY * newScale;

            setScale(newScale);
            setPan({ x: newPanX, y: newPanY });
        };

        canvas.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            canvas.removeEventListener('wheel', onWheel);
        };
    }, []);

    return {
        scale,
        pan,
        isPanning,
        canvasRef,
        handleZoomIn,
        handleZoomOut,
        handleResetZoom,
        handleCanvasMouseDown,
        handleCanvasMouseMove,
        setIsPanning
    };
}
