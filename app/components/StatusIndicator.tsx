import React from 'react';

const AIStatusIndicator = ({ status }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'in_progress':
                return '#4CAF50'; // Green
            case 'completed':
                return '#2196F3'; // Blue
            case 'failed':
                return '#F44336'; // Red
            default:
                return '#9E9E9E'; // Grey
        }
    };

    const getStatusText = () => {
        switch (status) {
            case 'in_progress':
                return 'Thinking...';
            case 'completed':
                return 'Completed';
            case 'failed':
                return 'Failed';
            default:
                return 'Unknown';
        }
    };

    return (
        <div className="ai-status-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" fill="none" stroke={getStatusColor()} strokeWidth="2">
                    {status === 'in_progress' && (
                        <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0 10 10"
                            to="360 10 10"
                            dur="1s"
                            repeatCount="indefinite"
                        />
                    )}
                </circle>
            </svg>
            <span style={{ color: getStatusColor(), fontSize: '14px' }}>{getStatusText()}</span>
        </div>
    );
};

export default AIStatusIndicator;