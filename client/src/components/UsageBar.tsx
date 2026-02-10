export function UsageBar({ used, total }: { used: number; total: number }) {
  const percent = Math.round((used / total) * 100);

  const color =
    percent > 90 ? '#dc2626' :
    percent > 75 ? '#d68b44' :
    '#22c55e';

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        background: '#1e293b',
        borderRadius: 6,
        overflow: 'hidden',
        height: 8
      }}>
        <div style={{
          width: `${percent}%`,
          background: color,
          height: '100%'
        }} />
      </div>
      <div style={{
        fontSize: '0.75rem',
        color: '#94a3b8',
        marginTop: 4
      }}>
        {percent}% used
      </div>
    </div>
  );
}
