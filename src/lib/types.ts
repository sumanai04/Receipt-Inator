export interface Person {
  id: string;
  name: string;
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  assignedTo: string[];
}

export interface BillSession {
  id: string;
  date: string;
  items: BillItem[];
  people: Person[];
  tax: number;
  tip: number;
  subtotal: number;
  total: number;
  billImage?: string;
}
