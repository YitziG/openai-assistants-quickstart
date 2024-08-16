const EventLog = ({ logs }) => {
    return (
        <div >
            {logs.map((log, index) => (
                <div key={index}>
                    <strong>{log.event}: </strong>
                    <pre>{JSON.stringify(log.data, null, 2)}</pre>
                </div>
            ))}
        </div>
    );
};

export { EventLog };