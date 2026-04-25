import React from 'react';
import { useMobileApi, MobileApiService } from '../../services/MobileApiService';

interface NetworkStatusProps {
  timestamp?: number;
  label?: string;
  showTimestamp?: boolean;
}

export function NetworkStatus({ timestamp, label, showTimestamp = true }: NetworkStatusProps) {
  const { isOnline, deviceOnline, apiAvailable } = useMobileApi();

  const getStatusIcon = () => {
    if (!deviceOnline) {
      return '📴'; // 无网络
    }
    if (apiAvailable) {
      return '✅'; // 在线且API可用
    }
    return '⚠️'; // 有网络但API不可用
  };

  const getStatusText = () => {
    if (!deviceOnline) {
      return '离线';
    }
    if (apiAvailable) {
      return '在线';
    }
    return '连接中';
  };

  const getStatusColor = () => {
    if (!deviceOnline) {
      return 'text-gray-600 bg-gray-100'; // 灰色表示离线
    }
    if (apiAvailable) {
      return 'text-green-600 bg-green-100'; // 绿色表示在线
    }
    return 'text-yellow-600 bg-yellow-100'; // 黄色表示连接中
  };

  return (
    <div className="flex flex-col space-y-1">
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor()}`}>
          <span>{getStatusIcon()}</span>
          <span>{getStatusText()}</span>
        </span>
        {label && <span className="text-xs text-gray-500">{label}</span>}
      </div>
      {showTimestamp && timestamp && (
        <p className="text-xs text-gray-400">
          最后更新: {MobileApiService.formatTimestamp(timestamp)}
        </p>
      )}
    </div>
  );
}
