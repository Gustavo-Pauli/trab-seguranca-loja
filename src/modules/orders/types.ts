export type Order = {
  id: string;
  order_id: string;
  user_id: string;
  total: number;
  total_cents: number;
  status: 'PENDING' | 'APPROVED' | 'BLOCKED' | 'ERROR';
  created_at: number;
};
