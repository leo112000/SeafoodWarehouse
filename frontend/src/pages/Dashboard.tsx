import React from 'react';
import { Card, Table, Tag, Statistic, Row, Col, Alert } from 'antd';
import { DatabaseOutlined, AlertOutlined, SafetyOutlined } from '@ant-design/icons';
import { useSeafood } from '../hooks/useSeafood';
import { formatCurrency, formatWeight, formatDate } from '../utils/format';
import type { SeafoodProduct } from '../types';

export const Dashboard: React.FC = () => {
  const { products, isLoading } = useSeafood();

  // Compute stats
  const totalProducts = products.length;
  const totalQuantity = products.reduce((acc, p) => acc + p.quantity, 0);
  const lowStockAlerts = products.filter((p) => p.status === 'LowStock' || p.status === 'OutofStock').length;

  const columns = [
    {
      title: 'Tên Sản Phẩm',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span className="font-semibold text-gray-800">{text}</span>,
    },
    {
      title: 'Danh Mục',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: 'Số Lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number) => formatWeight(qty),
    },
    {
      title: 'Đơn Giá',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => formatCurrency(price),
    },
    {
      title: 'Vị Trí Lưu Kho',
      dataIndex: 'storageLocation',
      key: 'storageLocation',
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: SeafoodProduct['status']) => {
        let color = 'green';
        let label = 'Còn hàng';
        if (status === 'LowStock') {
          color = 'orange';
          label = 'Sắp hết hàng';
        } else if (status === 'OutofStock') {
          color = 'red';
          label = 'Hết hàng';
        }
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: 'Cập Nhật Cuối',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      render: (dateStr: string) => formatDate(dateStr),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 m-0">Hệ Thống Quản Lý Kho Hàng Hải Sản</h1>
        <p className="text-gray-500">Giám sát số lượng, vị trí lưu kho và tình trạng bảo quản hải sản theo thời gian thực.</p>
      </div>

      {lowStockAlerts > 0 && (
        <Alert
          message={`Cảnh báo: Có ${lowStockAlerts} sản phẩm đang ở mức báo động (sắp hết hàng hoặc đã hết hàng).`}
          type="warning"
          showIcon
          className="mb-6"
        />
      )}

      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={8}>
          <Card className="shadow-sm">
            <Statistic
              title="Tổng Số Mặt Hàng"
              value={totalProducts}
              prefix={<DatabaseOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="shadow-sm">
            <Statistic
              title="Tổng Sản Lượng Lưu Kho"
              value={totalQuantity}
              suffix="kg"
              prefix={<SafetyOutlined className="text-green-500" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="shadow-sm">
            <Statistic
              title="Sản Phẩm Cần Nhập Thêm"
              value={lowStockAlerts}
              prefix={<AlertOutlined className="text-red-500" />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Danh Sách Hải Sản Trong Kho" className="shadow-sm">
        <Table
          dataSource={products}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </div>
  );
};
export default Dashboard;
