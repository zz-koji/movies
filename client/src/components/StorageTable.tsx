import React from 'react';
import { formatBytes } from '../utils/storage';
import { UsageBar } from './UsageBar';

type Device = {
  name: string;
  size: number;
  type: string;
  mountpoint?: string;
  usage?: {
    used: number;
    available: number;
    size: number;
    percent: number;
  };
  children?: Device[];
};

export function StorageTable() {
  const [devices, setDevices] = React.useState<Device[]>([]);

  React.useEffect(() => {
    fetch('/api/storage/disks')
      .then(res => res.json())
      .then(data => setDevices(data.blockdevices));
  }, []);

  console.log('Devices:', devices);

  return (
    <table className="storage-table">
      <thead>
        <tr>
          <th>Device</th>
          <th>Size</th>
          <th>Free</th>
          <th>Usage</th>
          <th>Mount</th>
        </tr>
      </thead>
      <tbody>
        {devices.map(disk => (
          <React.Fragment key={disk.name}>
            <tr className="disk-row">
              <td>{disk.name}</td>
              <td>{formatBytes(disk.size)}</td>
              <td>—</td>
              <td><span className="badge">Disk</span></td>
              <td>—</td>
            </tr>

            {disk.children?.map(part => (
              <tr key={part.name} className="partition-row">
                <td>{part.name}</td>
                <td>{formatBytes(part.size)}</td>
                <td>
                  {part.usage
                    ? formatBytes(part.usage.available)
                    : '—'}
                </td>
                <td style={{ minWidth: 160 }}>
                  {part.usage && (
                    <UsageBar
                      used={part.usage.used}
                      total={part.usage.size}
                    />
                  )}
                </td>
                <td>{part.mountpoint ?? '—'}</td>
              </tr>
            ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}
