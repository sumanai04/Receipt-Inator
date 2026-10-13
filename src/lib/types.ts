export interface Person {
  id: string;
  name: string;
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  taxable: boolean;
  assignedTo: string[];
}

export interface BillCharges {
  service: number;
  tax: number;
  tip: number;
  rounding: number;
}

export interface BillSession {
  id: string;
  date: string;
  items: BillItem[];
  people: Person[];
  charges: BillCharges;
  subtotal: number;
  total: number;
  billImage?: string;
}
