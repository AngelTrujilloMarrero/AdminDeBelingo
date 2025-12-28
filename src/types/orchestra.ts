export interface Orchestra {
    id: string;
    name: string;
    phone: string;
    facebook: string;
    instagram: string;
    other: string;
    lastUpdated: string;
    type?: 'orquesta' | 'grupo' | 'solista';
}
