import React from 'react';
import { Card } from 'antd';

interface PlaceholderProps {
  title: string;
  description?: string;
}

export const Placeholder: React.FC<PlaceholderProps> = ({ title, description }) => {
  return (
    <Card className="shadow-sm border border-gray-200">
      <div className="p-4 text-center">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        {description && <p className="text-gray-500 mt-2">{description}</p>}
      </div>
    </Card>
  );
};
