// Updated process-mapping.tsx with robustness fixes

import React, { useEffect, useState } from 'react';

const ProcessMapping = () => {
    const [isCanvasReady, setIsCanvasReady] = useState(false);
    const [autoSaveTimer, setAutoSaveTimer] = useState(null);

    const handleCanvasLoad = () => {
        setIsCanvasReady(true);
    };

    const debounce = (func, delay) => {
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
        }
        setAutoSaveTimer(setTimeout(() => func(), delay));
    };

    const handleAutoSave = () => {
        console.log('Autosaving...'); // Replace with actual save logic
    };

    useEffect(() => {
        // Simulate canvas readiness 
        const canvasLoadTimeout = setTimeout(handleCanvasLoad, 2000);
        return () => clearTimeout(canvasLoadTimeout);
    }, []);

    return (
        <div>
            <h1>Process Mapping</h1>
            <canvas onLoad={handleCanvasLoad} />
            <button disabled={!isCanvasReady} onClick={() => debounce(handleAutoSave, 1000)}>
                Create
            </button>
        </div>
    );
};

export default ProcessMapping;