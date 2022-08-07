export interface DataObject {
    path: string;
    tilesize: number;
    tiles: Tile[];
    neighbors: Neighbor[];
    unique?: boolean;
    subsets?: string[];
}

export interface Tile {
    name: string;
    symmetry: string;
    bitmap?: number[];
    weight?: number;
}

export interface Neighbor {
    left: string;
    right: string;
}
